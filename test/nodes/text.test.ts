import { test } from "node:test";
import assert from "node:assert/strict";
import { TextNode } from "../../src/nodes/text.js";
import { RowNode } from "../../src/nodes/row.js";
import { ColumnNode } from "../../src/nodes/column.js";
import { FillNode } from "../../src/nodes/fill.js";
import { loose, tight, INFINITY } from "../../src/core/constraints.js";
import { DEFAULT_STYLE } from "../../src/core/style.js";
import { fakeContexts } from "../fakeRenderer.js";

// Fake measurer: size 10 -> 5pt per char, 12pt per line (lineHeight 1.2).
const s10 = { size: 10 };

test("text: bounded width takes the full width and wraps (D11)", () => {
  const { layoutCtx } = fakeContexts();
  // "hello world" = 55pt; max 30 -> two lines
  const node = new TextNode("hello world", s10);
  assert.deepEqual(node.layout(loose({ width: 30, height: 500 }), layoutCtx), { width: 30, height: 24 });
});

test("text: unbounded width hugs its content on one line", () => {
  const { layoutCtx } = fakeContexts();
  const node = new TextNode("hello world", s10);
  const size = node.layout({ minWidth: 0, maxWidth: INFINITY, minHeight: 0, maxHeight: INFINITY }, layoutCtx);
  assert.deepEqual(size, { width: 55, height: 12 });
});

test("text: draws into the box computed in layout", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const node = new TextNode("hi", s10);
  node.layout(loose({ width: 100, height: 100 }), layoutCtx);
  node.paint(paintCtx, { x: 40, y: 50 });
  assert.equal(renderer.calls.length, 1);
  const call = renderer.calls[0]!;
  assert.equal(call.op, "text");
  if (call.op === "text") {
    assert.equal(call.content, "hi");
    assert.deepEqual(call.box, { x: 40, y: 50, width: 100, height: 12 });
    assert.equal(call.style.size, 10);
  }
});

test("text: style resolves node over render default over library default (D2)", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts({ defaultStyle: { font: "Inter", size: 11, color: "#333" } });
  const node = new TextNode("x", { size: 20 });
  node.layout(loose({ width: 100, height: 100 }), layoutCtx);
  node.paint(paintCtx, { x: 0, y: 0 });
  const call = renderer.calls[0]!;
  if (call.op === "text") {
    assert.equal(call.style.font, "Inter");
    assert.equal(call.style.size, 20);
    assert.equal(call.style.color, "#333");
    assert.equal(call.style.lineHeight, DEFAULT_STYLE.lineHeight);
  }
});

test("text: too tall for its box reports the max height and clips (D1)", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  // three lines of 12 = 36, but only 20 allowed
  const node = new TextNode("a\nb\nc", s10);
  assert.deepEqual(node.layout(loose({ width: 100, height: 20 }), layoutCtx), { width: 100, height: 20 });
  node.paint(paintCtx, { x: 0, y: 0 });
  assert.deepEqual(renderer.ops(), ["save", "clip", "text", "restore"]);
});

test("text: tight constraints are honoured even if the text is smaller", () => {
  const { layoutCtx } = fakeContexts();
  const node = new TextNode("hi", s10);
  assert.deepEqual(node.layout(tight({ width: 200, height: 50 }), layoutCtx), { width: 200, height: 50 });
});

test("text in a column spans the column; text in a row hugs", () => {
  const { layoutCtx } = fakeContexts();
  const col = new ColumnNode([new TextNode("hi", s10)]);
  assert.deepEqual(col.layout(loose({ width: 300, height: 500 }), layoutCtx), { width: 300, height: 12 });
  const row = new RowNode([new TextNode("hi", s10), new TextNode("there", s10)]);
  assert.deepEqual(row.layout(loose({ width: 300, height: 500 }), layoutCtx), { width: 35, height: 12 });
});

test("text inside fill takes the fill's width and wraps inside it", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  // row 100 wide, two fills -> 50 each. "hello world" (55pt) wraps to two lines in 50.
  const row = new RowNode([new FillNode(new TextNode("hello world", s10)), new FillNode(new TextNode("x", s10))]);
  assert.deepEqual(row.layout(loose({ width: 100, height: 500 }), layoutCtx), { width: 100, height: 24 });
  row.paint(paintCtx, { x: 0, y: 0 });
  const first = renderer.calls[0]!;
  if (first.op === "text") assert.deepEqual(first.box, { x: 0, y: 0, width: 50, height: 24 });
  const second = renderer.calls[1]!;
  if (second.op === "text") assert.deepEqual(second.box, { x: 50, y: 0, width: 50, height: 12 });
});
