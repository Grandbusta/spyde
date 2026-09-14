import { test } from "node:test";
import assert from "node:assert/strict";
import { text, padding, background, fill, row, column } from "../src/factories.js";
import { loose } from "../src/core/constraints.js";
import { fakeContexts } from "./fakeRenderer.js";

// Fake measurer at size 10: 5pt per char, 12pt per line.

test("factories: content first, settings second, settings optional", () => {
  const { layoutCtx } = fakeContexts();
  const tree = column([
    text("Title", { size: 10 }),
    padding(text("body", { size: 10 }), 8),
    background(text("x", { size: 10 }), "#eee"),
    row([fill(text("a", { size: 10 })), fill(text("b", { size: 10 }), 2)], { gap: 4 }),
  ], { gap: 2 });
  const size = tree.layout(loose({ width: 200, height: 500 }), layoutCtx);
  // 12 + 2 + (12+16) + 2 + 12 + 2 + 12 = 70
  assert.deepEqual(size, { width: 200, height: 70 });
});

test("factories: fill share defaults to 1", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const tree = row([fill(text("a", { size: 10 })), fill(text("b", { size: 10 }))]);
  tree.layout(loose({ width: 100, height: 100 }), layoutCtx);
  tree.paint(paintCtx, { x: 0, y: 0 });
  const boxes = renderer.calls.map((c) => (c.op === "text" ? c.box.width : -1));
  assert.deepEqual(boxes, [50, 50]);
});
