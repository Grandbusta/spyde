import { test } from "node:test";
import assert from "node:assert/strict";
import { spacer, divider } from "../../src/factories.js";
import { DividerNode } from "../../src/nodes/divider.js";
import { RowNode } from "../../src/nodes/row.js";
import { ColumnNode } from "../../src/nodes/column.js";
import { loose, INFINITY } from "../../src/core/constraints.js";
import { FixedBox, fakeContexts } from "../fakeRenderer.js";

test("spacer: pushes neighbours to the edges of a row", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const row = new RowNode([new FixedBox({ width: 40, height: 20 }, "a"), spacer(), new FixedBox({ width: 30, height: 10 }, "b")]);
  assert.deepEqual(row.layout(loose({ width: 200, height: 500 }), layoutCtx), { width: 200, height: 20 });
  row.paint(paintCtx, { x: 0, y: 0 });
  assert.deepEqual(renderer.calls[1], { op: "fillRect", rect: { x: 170, y: 0, width: 30, height: 10 }, color: "b" });
});

test("spacer: pushes neighbours apart in a column with bounded height", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const col = new ColumnNode([new FixedBox({ width: 40, height: 20 }, "a"), spacer(), new FixedBox({ width: 30, height: 10 }, "b")]);
  col.layout(loose({ width: 200, height: 100 }), layoutCtx);
  col.paint(paintCtx, { x: 0, y: 0 });
  assert.equal(renderer.calls[1]?.op === "fillRect" && renderer.calls[1].rect.y, 90);
});

test("spacer: inert in a column with unbounded height", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const col = new ColumnNode([new FixedBox({ width: 40, height: 20 }, "a"), spacer(), new FixedBox({ width: 30, height: 10 }, "b")]);
  col.layout({ minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: INFINITY }, layoutCtx);
  col.paint(paintCtx, { x: 0, y: 0 });
  assert.equal(renderer.calls[1]?.op === "fillRect" && renderer.calls[1].rect.y, 20);
});

test("divider: horizontal in a column, default colour and thickness", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const col = new ColumnNode([divider()]);
  assert.deepEqual(col.layout(loose({ width: 300, height: 500 }), layoutCtx), { width: 300, height: 1 });
  col.paint(paintCtx, { x: 10, y: 20 });
  assert.deepEqual(renderer.calls, [{ op: "fillRect", rect: { x: 10, y: 20, width: 300, height: 1 }, color: "#cccccc" }]);
});

test("divider: colour and thickness honoured", () => {
  const { layoutCtx } = fakeContexts();
  const d = new DividerNode({ color: "red", thickness: 3 });
  assert.deepEqual(d.layout(loose({ width: 300, height: 500 }), layoutCtx), { width: 300, height: 3 });
});

test("divider: vertical when width is unbounded, spanning a bounded height", () => {
  const { layoutCtx } = fakeContexts();
  const d = new DividerNode();
  assert.deepEqual(d.layout({ minWidth: 0, maxWidth: INFINITY, minHeight: 0, maxHeight: 50 }, layoutCtx), { width: 1, height: 50 });
  assert.deepEqual(d.layout({ minWidth: 0, maxWidth: INFINITY, minHeight: 0, maxHeight: INFINITY }, layoutCtx), { width: 1, height: 1 });
});

test("divider: in a row with align stretch it spans the row height", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const row = new RowNode([new FixedBox({ width: 40, height: 30 }), divider(), new FixedBox({ width: 40, height: 10 })], { align: "stretch" });
  assert.deepEqual(row.layout({ minWidth: 0, maxWidth: 300, minHeight: 0, maxHeight: INFINITY }, layoutCtx), { width: 81, height: 30 });
  row.paint(paintCtx, { x: 0, y: 0 });
  assert.deepEqual(renderer.calls[1], { op: "fillRect", rect: { x: 40, y: 0, width: 1, height: 30 }, color: "#cccccc" });
});
