import { test } from "node:test";
import assert from "node:assert/strict";
import { ColumnNode } from "../../src/nodes/column.js";
import { RowNode } from "../../src/nodes/row.js";
import { KeepNode } from "../../src/nodes/keep.js";
import { column, table } from "../../src/factories.js";
import { loose } from "../../src/core/constraints.js";
import { isSplittable } from "../../src/core/node.js";
import { FixedBox, fakeContexts } from "../fakeRenderer.js";

const box = (h: number, color = "x") => new FixedBox({ width: 50, height: h }, color);

test("box: padding adds to the size and offsets the children", () => {
  const ctx = fakeContexts();
  const col = new ColumnNode([box(20, "a")], { padding: 12 });
  assert.deepEqual(col.layout(loose({ width: 200, height: 200 }), ctx.layoutCtx), { width: 74, height: 44 });
  col.paint(ctx.paintCtx, { x: 10, y: 10 });
  assert.deepEqual(ctx.renderer.calls, [{ op: "fillRect", rect: { x: 22, y: 22, width: 50, height: 20 }, color: "a" }]);
});

test("box: background covers the padded box, not the margin; margin adds to the size", () => {
  const ctx = fakeContexts();
  const col = new ColumnNode([box(20, "a")], { padding: 12, background: "#eee", margin: { top: 24 } });
  assert.deepEqual(col.layout(loose({ width: 200, height: 200 }), ctx.layoutCtx), { width: 74, height: 68 });
  col.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(ctx.renderer.calls, [
    { op: "fillRect", rect: { x: 0, y: 24, width: 74, height: 44 }, color: "#eee" },
    { op: "fillRect", rect: { x: 12, y: 36, width: 50, height: 20 }, color: "a" },
  ]);
});

test("box: the same options work on a row", () => {
  const ctx = fakeContexts();
  const row = new RowNode([box(20, "a"), box(10, "b")], { gap: 4, padding: { x: 5 }, background: "#eee" });
  assert.deepEqual(row.layout(loose({ width: 200, height: 200 }), ctx.layoutCtx), { width: 114, height: 20 });
  row.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(ctx.renderer.calls[0], { op: "fillRect", rect: { x: 0, y: 0, width: 114, height: 20 }, color: "#eee" });
  assert.deepEqual(ctx.renderer.calls[1], { op: "fillRect", rect: { x: 5, y: 0, width: 50, height: 20 }, color: "a" });
});

test("box: children get constraints reduced by padding and margin", () => {
  const ctx = fakeContexts();
  const a = box(20);
  new ColumnNode([a], { padding: 10, margin: 5 }).layout(loose({ width: 200, height: 200 }), ctx.layoutCtx);
  assert.equal(a.lastConstraints?.maxWidth, 170);
});

test("box: a column with padding and background still splits, and every fragment is a full box", () => {
  const page = loose({ width: 200, height: 100 });
  const ctx = fakeContexts();
  const col = new ColumnNode([box(30, "a"), box(30, "b"), box(30, "c")], { padding: 10, background: "#eee" });
  // inner height 80: a and b fit (60), c does not
  const r = col.layoutPage(page, ctx.layoutCtx, { atPageTop: true });
  assert.equal(r.placed, 2);
  assert.deepEqual(r.size, { width: 70, height: 80 });
  col.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(ctx.renderer.calls[0], { op: "fillRect", rect: { x: 0, y: 0, width: 70, height: 80 }, color: "#eee" });

  const ctx2 = fakeContexts();
  const r2 = (r.remainder as ColumnNode).layoutPage(page, ctx2.layoutCtx, { atPageTop: true });
  assert.equal(r2.remainder, undefined);
  assert.deepEqual(r2.size, { width: 70, height: 50 });
  r.remainder!.paint(ctx2.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(ctx2.renderer.calls, [
    { op: "fillRect", rect: { x: 0, y: 0, width: 70, height: 50 }, color: "#eee" },
    { op: "fillRect", rect: { x: 10, y: 10, width: 50, height: 30 }, color: "c" },
  ]);
});

test("box: keep on a column wraps it so it moves whole instead of splitting", () => {
  const node = column([box(10)], { keep: true });
  assert.ok(node instanceof KeepNode);
  assert.ok(!isSplittable(node));
  assert.ok(isSplittable(column([box(10)])));
});

test("box: keep, background and margin on a table", () => {
  const ctx = fakeContexts();
  const kept = table([{ a: box(10, "a") }], { columns: [{ key: "a" }], keep: true });
  assert.ok(kept instanceof KeepNode);
  const t = table([{ a: box(10, "a") }], { columns: [{ key: "a" }], background: "#eee", margin: { top: 5 } });
  assert.deepEqual(t.layout(loose({ width: 100, height: 100 }), ctx.layoutCtx), { width: 100, height: 15 });
  t.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(ctx.renderer.calls[0], { op: "fillRect", rect: { x: 0, y: 5, width: 100, height: 10 }, color: "#eee" });
});
