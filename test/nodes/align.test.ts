import { test } from "node:test";
import assert from "node:assert/strict";
import { RowNode } from "../../src/nodes/row.js";
import { ColumnNode } from "../../src/nodes/column.js";
import { FillNode } from "../../src/nodes/fill.js";
import { loose, INFINITY } from "../../src/core/constraints.js";
import { FixedBox, fakeContexts } from "../fakeRenderer.js";

const w100 = loose({ width: 100, height: 500 });
const ys = (r: ReturnType<typeof fakeContexts>) => r.renderer.calls.map((c) => (c.op === "fillRect" ? c.rect.y : -1));
const xs = (r: ReturnType<typeof fakeContexts>) => r.renderer.calls.map((c) => (c.op === "fillRect" ? c.rect.x : -1));

function rowOf(align: "start" | "center" | "end" | "stretch") {
  return new RowNode([new FixedBox({ width: 10, height: 10 }), new FixedBox({ width: 10, height: 40 })], { align });
}

test("align: start (default) puts children at the top of a row", () => {
  const ctx = fakeContexts();
  rowOf("start").layout(w100, ctx.layoutCtx);
  rowOf("start").paint(ctx.paintCtx, { x: 0, y: 0 });
});

test("align: center and end in a row", () => {
  let ctx = fakeContexts();
  let r = rowOf("center");
  r.layout(w100, ctx.layoutCtx); r.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(ys(ctx), [15, 0]);
  ctx = fakeContexts();
  r = rowOf("end");
  r.layout(w100, ctx.layoutCtx); r.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(ys(ctx), [30, 0]);
});

test("align: stretch re-lays the child out with a tight cross axis", () => {
  const ctx = fakeContexts();
  const short = new FixedBox({ width: 10, height: 10 });
  const row = new RowNode([short, new FixedBox({ width: 10, height: 40 })], { align: "stretch" });
  assert.deepEqual(row.layout(w100, ctx.layoutCtx), { width: 20, height: 40 });
  assert.deepEqual(short.lastConstraints, { minWidth: 10, maxWidth: 10, minHeight: 40, maxHeight: 40 });
  assert.equal(short.lastSize?.height, 40);
});

test("align: end in a column moves narrow children to the right", () => {
  const ctx = fakeContexts();
  const col = new ColumnNode([new FixedBox({ width: 10, height: 10 }), new FixedBox({ width: 40, height: 10 })], { align: "end" });
  col.layout(w100, ctx.layoutCtx); col.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(xs(ctx), [30, 0]);
});

function two(justify: "start" | "center" | "end" | "between") {
  return new RowNode([new FixedBox({ width: 10, height: 10 }), new FixedBox({ width: 10, height: 10 })], { justify });
}

test("justify: center, end, between in a bounded row take the full width", () => {
  for (const [j, expect] of [["center", [40, 50]], ["end", [80, 90]], ["between", [0, 90]]] as const) {
    const ctx = fakeContexts();
    const r = two(j);
    assert.deepEqual(r.layout(w100, ctx.layoutCtx), { width: 100, height: 10 }, j);
    r.paint(ctx.paintCtx, { x: 0, y: 0 });
    assert.deepEqual(xs(ctx), expect, j);
  }
});

test("justify: start keeps the row hugging its content", () => {
  const ctx = fakeContexts();
  assert.deepEqual(two("start").layout(w100, ctx.layoutCtx), { width: 20, height: 10 });
});

test("justify: between with one child behaves like start", () => {
  const ctx = fakeContexts();
  const r = new RowNode([new FixedBox({ width: 10, height: 10 })], { justify: "between" });
  assert.deepEqual(r.layout(w100, ctx.layoutCtx), { width: 100, height: 10 });
  r.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(xs(ctx), [0]);
});

test("justify: ignored when a child is a fill", () => {
  const ctx = fakeContexts();
  const f = new FixedBox({ width: 5, height: 10 });
  const r = new RowNode([new FixedBox({ width: 10, height: 10 }), new FillNode(f)], { justify: "end" });
  r.layout(w100, ctx.layoutCtx);
  assert.equal(f.lastSize?.width, 90);
  r.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(xs(ctx), [0, 10]);
});

test("justify: ignored when the main axis is unbounded", () => {
  const ctx = fakeContexts();
  const r = two("end");
  assert.deepEqual(r.layout({ minWidth: 0, maxWidth: INFINITY, minHeight: 0, maxHeight: 500 }, ctx.layoutCtx), { width: 20, height: 10 });
  r.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(xs(ctx), [0, 10]);
});

test("justify: in a column distributes height", () => {
  const ctx = fakeContexts();
  const col = new ColumnNode([new FixedBox({ width: 10, height: 10 }), new FixedBox({ width: 10, height: 10 })], { justify: "between" });
  assert.deepEqual(col.layout(loose({ width: 100, height: 100 }), ctx.layoutCtx), { width: 10, height: 100 });
  col.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(ys(ctx), [0, 90]);
});
