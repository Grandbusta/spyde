import { test } from "node:test";
import assert from "node:assert/strict";
import { PaddingNode } from "../../src/nodes/padding.js";
import { loose, tight, INFINITY } from "../../src/core/constraints.js";
import { FixedBox, fakeContexts } from "../fakeRenderer.js";

test("padding: size is child plus insets on every side", () => {
  const { layoutCtx } = fakeContexts();
  const child = new FixedBox({ width: 40, height: 20 });
  const node = new PaddingNode(child, 8);
  const size = node.layout(loose({ width: 500, height: 500 }), layoutCtx);
  assert.deepEqual(size, { width: 56, height: 36 });
});

test("padding: child receives constraints shrunk by the insets", () => {
  const { layoutCtx } = fakeContexts();
  const child = new FixedBox({ width: 40, height: 20 });
  const node = new PaddingNode(child, { x: 10, y: 5 });
  node.layout(tight({ width: 100, height: 50 }), layoutCtx);
  assert.deepEqual(child.lastConstraints, { minWidth: 80, maxWidth: 80, minHeight: 40, maxHeight: 40 });
});

test("padding: child is painted at offset plus top-left insets", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const child = new FixedBox({ width: 40, height: 20 });
  const node = new PaddingNode(child, { top: 1, right: 2, bottom: 3, left: 4 });
  node.layout(loose({ width: 500, height: 500 }), layoutCtx);
  node.paint(paintCtx, { x: 100, y: 200 });
  assert.deepEqual(renderer.calls, [
    { op: "fillRect", rect: { x: 104, y: 201, width: 40, height: 20 }, color: "fixed" },
  ]);
});

test("padding: no clipping when everything fits", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const node = new PaddingNode(new FixedBox({ width: 40, height: 20 }), 8);
  node.layout(loose({ width: 500, height: 500 }), layoutCtx);
  node.paint(paintCtx, { x: 0, y: 0 });
  assert.deepEqual(renderer.ops(), ["fillRect"]);
});

test("padding: insets larger than the box clip instead of throwing", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const child = new FixedBox({ width: 40, height: 20 });
  const node = new PaddingNode(child, 30);
  const size = node.layout(loose({ width: 50, height: 50 }), layoutCtx);
  assert.deepEqual(size, { width: 50, height: 50 });
  assert.deepEqual(child.lastConstraints, { minWidth: 0, maxWidth: 0, minHeight: 0, maxHeight: 0 });
  node.paint(paintCtx, { x: 0, y: 0 });
  assert.deepEqual(renderer.ops(), ["save", "clip", "fillRect", "restore"]);
  assert.deepEqual(renderer.calls[1], { op: "clip", rect: { x: 0, y: 0, width: 50, height: 50 } });
});

test("padding: unbounded constraints pass through as unbounded", () => {
  const { layoutCtx } = fakeContexts();
  const child = new FixedBox({ width: 40, height: 20 });
  const node = new PaddingNode(child, 8);
  node.layout({ minWidth: 0, maxWidth: INFINITY, minHeight: 0, maxHeight: INFINITY }, layoutCtx);
  assert.equal(child.lastConstraints?.maxWidth, INFINITY);
});
