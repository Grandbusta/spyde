import { test } from "node:test";
import assert from "node:assert/strict";
import { RowNode } from "../../src/nodes/row.js";
import { ColumnNode } from "../../src/nodes/column.js";
import { FillNode } from "../../src/nodes/fill.js";
import { PaddingNode } from "../../src/nodes/padding.js";
import { BackgroundNode } from "../../src/nodes/background.js";
import { loose, tight, INFINITY } from "../../src/core/constraints.js";
import { FixedBox, fakeContexts } from "../fakeRenderer.js";

const page = loose({ width: 500, height: 500 });

test("row: hugs its children with no gap", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const a = new FixedBox({ width: 40, height: 20 }, "a");
  const b = new FixedBox({ width: 30, height: 10 }, "b");
  const row = new RowNode([a, b]);
  assert.deepEqual(row.layout(page, layoutCtx), { width: 70, height: 20 });
  row.paint(paintCtx, { x: 0, y: 0 });
  assert.deepEqual(renderer.calls, [
    { op: "fillRect", rect: { x: 0, y: 0, width: 40, height: 20 }, color: "a" },
    { op: "fillRect", rect: { x: 40, y: 0, width: 30, height: 10 }, color: "b" },
  ]);
});

test("row: gap goes between children, not after the last", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const row = new RowNode(
    [new FixedBox({ width: 40, height: 20 }, "a"), new FixedBox({ width: 30, height: 10 }, "b")],
    { gap: 8 },
  );
  assert.deepEqual(row.layout(page, layoutCtx), { width: 78, height: 20 });
  row.paint(paintCtx, { x: 0, y: 0 });
  assert.equal(renderer.calls[1]?.op === "fillRect" && renderer.calls[1].rect.x, 48);
});

test("column: same algorithm along the vertical axis", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const col = new ColumnNode(
    [new FixedBox({ width: 40, height: 20 }, "a"), new FixedBox({ width: 30, height: 10 }, "b")],
    { gap: 4 },
  );
  assert.deepEqual(col.layout(page, layoutCtx), { width: 40, height: 34 });
  col.paint(paintCtx, { x: 10, y: 10 });
  assert.deepEqual(renderer.calls, [
    { op: "fillRect", rect: { x: 10, y: 10, width: 40, height: 20 }, color: "a" },
    { op: "fillRect", rect: { x: 10, y: 34, width: 30, height: 10 }, color: "b" },
  ]);
});

test("row: non-fill children get an unbounded loose main axis and the parent's cross max", () => {
  const { layoutCtx } = fakeContexts();
  const a = new FixedBox({ width: 40, height: 20 });
  new RowNode([a]).layout(tight({ width: 300, height: 100 }), layoutCtx);
  assert.deepEqual(a.lastConstraints, { minWidth: 0, maxWidth: INFINITY, minHeight: 0, maxHeight: 100 });
});

test("row: fill children split the leftover evenly and get tight constraints", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const fixed = new FixedBox({ width: 40, height: 20 }, "fixed");
  const f1 = new FixedBox({ width: 5, height: 10 }, "f1");
  const f2 = new FixedBox({ width: 5, height: 10 }, "f2");
  const row = new RowNode([fixed, new FillNode(f1), new FillNode(f2)]);
  assert.deepEqual(row.layout(loose({ width: 200, height: 500 }), layoutCtx), { width: 200, height: 20 });
  assert.deepEqual(f1.lastConstraints, { minWidth: 80, maxWidth: 80, minHeight: 0, maxHeight: 500 });
  row.paint(paintCtx, { x: 0, y: 0 });
  assert.deepEqual(renderer.calls, [
    { op: "fillRect", rect: { x: 0, y: 0, width: 40, height: 20 }, color: "fixed" },
    { op: "fillRect", rect: { x: 40, y: 0, width: 80, height: 10 }, color: "f1" },
    { op: "fillRect", rect: { x: 120, y: 0, width: 80, height: 10 }, color: "f2" },
  ]);
});

test("row: share numbers weight the split", () => {
  const { layoutCtx } = fakeContexts();
  const f1 = new FixedBox({ width: 5, height: 10 });
  const f2 = new FixedBox({ width: 5, height: 10 });
  const row = new RowNode([new FixedBox({ width: 20, height: 10 }), new FillNode(f1, 1), new FillNode(f2, 2)]);
  row.layout(loose({ width: 200, height: 500 }), layoutCtx);
  assert.equal(f1.lastSize?.width, 60);
  assert.equal(f2.lastSize?.width, 120);
});

test("row: gaps are subtracted before fill children split the leftover", () => {
  const { layoutCtx } = fakeContexts();
  const f1 = new FixedBox({ width: 5, height: 10 });
  const f2 = new FixedBox({ width: 5, height: 10 });
  const row = new RowNode([new FillNode(f1), new FillNode(f2)], { gap: 20 });
  assert.deepEqual(row.layout(loose({ width: 200, height: 500 }), layoutCtx), { width: 200, height: 10 });
  assert.equal(f1.lastSize?.width, 90);
  assert.equal(f2.lastSize?.width, 90);
});

test("row: only fill children take the whole width", () => {
  const { layoutCtx } = fakeContexts();
  const f = new FixedBox({ width: 5, height: 10 });
  const row = new RowNode([new FillNode(f)]);
  assert.deepEqual(row.layout(loose({ width: 300, height: 500 }), layoutCtx), { width: 300, height: 10 });
  assert.equal(f.lastSize?.width, 300);
});

test("row: fixed children wider than the row clip instead of throwing (D1)", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const f = new FixedBox({ width: 5, height: 10 }, "fill");
  const row = new RowNode([
    new FixedBox({ width: 70, height: 10 }, "a"),
    new FixedBox({ width: 70, height: 10 }, "b"),
    new FillNode(f),
  ]);
  assert.deepEqual(row.layout(loose({ width: 100, height: 500 }), layoutCtx), { width: 100, height: 10 });
  assert.equal(f.lastSize?.width, 0);
  row.paint(paintCtx, { x: 0, y: 0 });
  assert.deepEqual(renderer.ops(), ["save", "clip", "fillRect", "fillRect", "fillRect", "restore"]);
  assert.deepEqual(renderer.calls[1], { op: "clip", rect: { x: 0, y: 0, width: 100, height: 10 } });
  // b is still placed at 70, past the clip edge; the clip does the cutting.
  assert.deepEqual(renderer.calls[3], { op: "fillRect", rect: { x: 70, y: 0, width: 70, height: 10 }, color: "b" });
});

test("row: no clipping when everything fits", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const row = new RowNode([new FixedBox({ width: 40, height: 20 })]);
  row.layout(page, layoutCtx);
  row.paint(paintCtx, { x: 0, y: 0 });
  assert.deepEqual(renderer.ops(), ["fillRect"]);
});

test("column: with an unbounded main axis, fill children behave like fixed children", () => {
  const { layoutCtx } = fakeContexts();
  const f = new FixedBox({ width: 40, height: 20 });
  const col = new ColumnNode([new FixedBox({ width: 40, height: 30 }), new FillNode(f)]);
  const size = col.layout({ minWidth: 0, maxWidth: 500, minHeight: 0, maxHeight: INFINITY }, layoutCtx);
  assert.deepEqual(size, { width: 40, height: 50 });
  assert.deepEqual(f.lastConstraints, { minWidth: 0, maxWidth: 500, minHeight: 0, maxHeight: INFINITY });
});

test("row: cross size is the tallest child, children sit at the top edge", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const row = new RowNode([new FixedBox({ width: 10, height: 10 }, "a"), new FixedBox({ width: 10, height: 40 }, "b")]);
  assert.deepEqual(row.layout(page, layoutCtx), { width: 20, height: 40 });
  row.paint(paintCtx, { x: 0, y: 0 });
  assert.equal(renderer.calls[0]?.op === "fillRect" && renderer.calls[0].rect.y, 0);
  assert.equal(renderer.calls[1]?.op === "fillRect" && renderer.calls[1].rect.y, 0);
});

test("row: tight constraints force the row's own size", () => {
  const { layoutCtx } = fakeContexts();
  const row = new RowNode([new FixedBox({ width: 10, height: 10 })]);
  assert.deepEqual(row.layout(tight({ width: 300, height: 50 }), layoutCtx), { width: 300, height: 50 });
});

test("row: empty children give zero size", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const row = new RowNode([]);
  assert.deepEqual(row.layout(page, layoutCtx), { width: 0, height: 0 });
  row.paint(paintCtx, { x: 0, y: 0 });
  assert.deepEqual(renderer.calls, []);
});

test("fill: outside a row or column it passes straight through", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const inner = new FixedBox({ width: 40, height: 20 }, "inner");
  const fill = new FillNode(inner, 3);
  assert.deepEqual(fill.layout(page, layoutCtx), { width: 40, height: 20 });
  fill.paint(paintCtx, { x: 5, y: 6 });
  assert.deepEqual(renderer.calls, [{ op: "fillRect", rect: { x: 5, y: 6, width: 40, height: 20 }, color: "inner" }]);
});

test("fill: zero share gets no space", () => {
  const { layoutCtx } = fakeContexts();
  const f0 = new FixedBox({ width: 5, height: 10 });
  const f1 = new FixedBox({ width: 5, height: 10 });
  new RowNode([new FillNode(f0, 0), new FillNode(f1)]).layout(loose({ width: 100, height: 100 }), layoutCtx);
  assert.equal(f0.lastSize?.width, 0);
  assert.equal(f1.lastSize?.width, 100);
});

test("invoice header: background(padding(row([fill, fill, fill 2], gap 8), {x:12,y:8}))", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const item = new FixedBox({ width: 5, height: 14 }, "item");
  const qty = new FixedBox({ width: 5, height: 14 }, "qty");
  const total = new FixedBox({ width: 5, height: 14 }, "total");
  const header = new BackgroundNode(
    new PaddingNode(
      new RowNode([new FillNode(item), new FillNode(qty), new FillNode(total, 2)], { gap: 8 }),
      { x: 12, y: 8 },
    ),
    "#f2f2f2",
  );
  // A4 content box width: 595.28 - 80 = 515.28. Use a round 515 here.
  assert.deepEqual(header.layout(loose({ width: 515, height: INFINITY }), layoutCtx), { width: 515, height: 30 });
  // inner width 491, minus two gaps of 8 = 475, shares 1+1+2 = 4 -> 118.75 each, last 237.5
  header.paint(paintCtx, { x: 40, y: 100 });
  assert.deepEqual(renderer.calls, [
    { op: "fillRect", rect: { x: 40, y: 100, width: 515, height: 30 }, color: "#f2f2f2" },
    { op: "fillRect", rect: { x: 52, y: 108, width: 118.75, height: 14 }, color: "item" },
    { op: "fillRect", rect: { x: 178.75, y: 108, width: 118.75, height: 14 }, color: "qty" },
    { op: "fillRect", rect: { x: 305.5, y: 108, width: 237.5, height: 14 }, color: "total" },
  ]);
});
