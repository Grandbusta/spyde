import { test } from "node:test";
import assert from "node:assert/strict";
import { ColumnNode } from "../../src/nodes/column.js";
import { PaddingNode } from "../../src/nodes/padding.js";
import { KeepNode } from "../../src/nodes/keep.js";
import { FillNode } from "../../src/nodes/fill.js";
import { PageBreakNode } from "../../src/nodes/pageBreak.js";
import { loose } from "../../src/core/constraints.js";
import type { Node } from "../../src/core/node.js";
import { FixedBox, fakeContexts } from "../fakeRenderer.js";

const page = loose({ width: 200, height: 100 });
const box = (h: number, color = "x") => new FixedBox({ width: 50, height: h }, color);
const top = { atPageTop: true };
const notTop = { atPageTop: false };

function paintedYs(node: Node, ctx: ReturnType<typeof fakeContexts>): number[] {
  node.paint(ctx.paintCtx, { x: 0, y: 0 });
  return ctx.renderer.calls.map((c) => (c.op === "fillRect" ? c.rect.y : -1));
}

test("column page: everything fits -> no remainder, fills honoured", () => {
  const ctx = fakeContexts();
  const f = box(5, "fill");
  const col = new ColumnNode([box(20), new FillNode(f)]);
  const r = col.layoutPage(page, ctx.layoutCtx, top);
  assert.equal(r.remainder, undefined);
  assert.equal(r.placed, 2);
  assert.equal(f.lastSize?.height, 80);
});

test("column page: split point, and no trailing gap on the page", () => {
  const ctx = fakeContexts();
  const col = new ColumnNode([box(30), box(30), box(30), box(30), box(30)], { gap: 4 });
  const r = col.layoutPage(page, ctx.layoutCtx, top);
  assert.deepEqual(r.size, { width: 50, height: 98 });   // 30+4+30+4+30
  assert.equal(r.placed, 3);
  assert.ok(r.remainder);
  assert.deepEqual(paintedYs(col, ctx), [0, 34, 68]);
});

test("column page: the remainder is a column of the rest with the same gap", () => {
  const ctx = fakeContexts();
  const col = new ColumnNode([box(30, "a"), box(30, "b"), box(30, "c"), box(30, "d"), box(30, "e")], { gap: 4 });
  const r = col.layoutPage(page, ctx.layoutCtx, top);
  const r2 = r.remainder!;
  const s2 = (r2 as ColumnNode).layoutPage(page, ctx.layoutCtx, top);
  assert.equal(s2.remainder, undefined);
  assert.deepEqual(s2.size, { width: 50, height: 64 });  // 30+4+30
  r2.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(ctx.renderer.calls.map((c) => (c.op === "fillRect" ? c.color : "")), ["d", "e"]);
});

test("column page: fill children take content size in split mode", () => {
  const ctx = fakeContexts();
  const f = box(5, "fill");
  const col = new ColumnNode([box(60), new FillNode(f), box(60)]);
  const r = col.layoutPage(page, ctx.layoutCtx, top);
  assert.equal(f.lastSize?.height, 5);
  assert.equal(r.placed, 2);
});

test("column page: pageBreak stops the page even when everything would fit", () => {
  const ctx = fakeContexts();
  const col = new ColumnNode([box(30, "a"), box(30, "b"), new PageBreakNode(), box(30, "c")]);
  const r = col.layoutPage(page, ctx.layoutCtx, top);
  assert.deepEqual(r.size, { width: 50, height: 60 });
  assert.equal(r.placed, 3);   // a, b, and the break consumed
  assert.ok(r.remainder);
  assert.deepEqual(paintedYs(col, ctx), [0, 30]);
});

test("column page: pageBreak first consumes the break and places nothing", () => {
  const ctx = fakeContexts();
  const col = new ColumnNode([new PageBreakNode(), box(30, "a")]);
  const r = col.layoutPage(page, ctx.layoutCtx, top);
  assert.equal(r.size.height, 0);
  assert.equal(r.placed, 1);
  assert.ok(r.remainder);
  assert.deepEqual(paintedYs(col, ctx), []);
});

test("column page: a nested pageBreak splits the outer column", () => {
  const ctx = fakeContexts();
  const col = new ColumnNode([box(10), new ColumnNode([box(10), new PageBreakNode(), box(10)])]);
  const r = col.layoutPage(page, ctx.layoutCtx, top);
  assert.ok(r.remainder, "outer column must split for the nested break");
  assert.deepEqual(r.size, { width: 50, height: 20 });
});

test("column page: keep moves a block whole", () => {
  const ctx = fakeContexts();
  const inner = new ColumnNode([box(30, "k1"), box(30, "k2")]);
  const col = new ColumnNode([box(60, "a"), new KeepNode(inner)]);
  const r = col.layoutPage(page, ctx.layoutCtx, top);
  assert.equal(r.placed, 1);
  assert.deepEqual(r.size, { width: 50, height: 60 });
  assert.ok(r.remainder);
});

test("column page: without keep the nested column splits between its children", () => {
  const ctx = fakeContexts();
  const inner = new ColumnNode([box(30, "k1"), box(30, "k2")]);
  const col = new ColumnNode([box(60, "a"), inner]);
  const r = col.layoutPage(page, ctx.layoutCtx, top);
  assert.equal(r.placed, 2);
  assert.deepEqual(r.size, { width: 50, height: 90 });
  assert.ok(r.remainder);
  assert.deepEqual(paintedYs(col, ctx), [0, 60]);
});

test("column page: padding around a column does not split", () => {
  const ctx = fakeContexts();
  const inner = new ColumnNode([box(30), box(30)]);
  const col = new ColumnNode([box(60, "a"), new PaddingNode(inner, 0)]);
  const r = col.layoutPage(page, ctx.layoutCtx, top);
  assert.equal(r.placed, 1);
});

test("column page: oversize child at page top is placed and clipped", () => {
  const ctx = fakeContexts();
  const col = new ColumnNode([box(150, "big"), box(10, "next")]);
  const r = col.layoutPage(page, ctx.layoutCtx, top);
  assert.equal(r.placed, 1);
  assert.deepEqual(r.size, { width: 50, height: 100 });
  assert.ok(r.remainder);
  col.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(ctx.renderer.ops(), ["save", "clip", "fillRect", "restore"]);
});

test("column page: oversize child not at page top moves to the remainder", () => {
  const ctx = fakeContexts();
  const col = new ColumnNode([box(150, "big")]);
  const r = col.layoutPage(page, ctx.layoutCtx, notTop);
  assert.equal(r.placed, 0);
  assert.ok(r.remainder);
});

test("column page: nested column that places nothing moves whole", () => {
  const ctx = fakeContexts();
  const inner = new ColumnNode([box(50, "k1"), box(50, "k2")]);
  const col = new ColumnNode([box(70, "a"), inner]);
  const r = col.layoutPage(page, ctx.layoutCtx, top);
  assert.equal(r.placed, 1);
  const r2 = (r.remainder as ColumnNode).layoutPage(page, ctx.layoutCtx, top);
  assert.equal(r2.remainder, undefined);
  assert.equal(r2.size.height, 100);
});

test("column page: align applies in split mode", () => {
  const ctx = fakeContexts();
  const col = new ColumnNode([new FixedBox({ width: 20, height: 60 }), new FixedBox({ width: 50, height: 60 })], { align: "end" });
  const r = col.layoutPage(page, ctx.layoutCtx, top);
  assert.equal(r.placed, 1);
  col.paint(ctx.paintCtx, { x: 0, y: 0 });
  // The only placed child is 20 wide in a 20-wide column: at x = 0.
  assert.deepEqual(ctx.renderer.calls[0], { op: "fillRect", rect: { x: 0, y: 0, width: 20, height: 60 }, color: "fixed" });
});
