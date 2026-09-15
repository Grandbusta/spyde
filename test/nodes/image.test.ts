import { test } from "node:test";
import assert from "node:assert/strict";
import { ImageNode } from "../../src/nodes/image.js";
import { loose, tight } from "../../src/core/constraints.js";
import { fakeContexts } from "../fakeRenderer.js";

// Fake natural size is 100 x 50 for any source.
const wide = loose({ width: 500, height: 500 });

test("image: no options -> natural size", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const n = new ImageNode("logo.png");
  assert.deepEqual(n.layout(wide, layoutCtx), { width: 100, height: 50 });
  n.paint(paintCtx, { x: 5, y: 6 });
  assert.deepEqual(renderer.calls, [{ op: "image", src: "logo.png", box: { x: 5, y: 6, width: 100, height: 50 } }]);
});

test("image: width only keeps the aspect ratio", () => {
  const { layoutCtx } = fakeContexts();
  assert.deepEqual(new ImageNode("a", { width: 50 }).layout(wide, layoutCtx), { width: 50, height: 25 });
});

test("image: height only keeps the aspect ratio", () => {
  const { layoutCtx } = fakeContexts();
  assert.deepEqual(new ImageNode("a", { height: 100 }).layout(wide, layoutCtx), { width: 200, height: 100 });
});

test("image: both -> the node is the box, the image fits inside at top-left", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const n = new ImageNode("a", { width: 60, height: 60 });
  assert.deepEqual(n.layout(wide, layoutCtx), { width: 60, height: 60 });
  n.paint(paintCtx, { x: 0, y: 0 });
  assert.deepEqual(renderer.calls[0], { op: "image", src: "a", box: { x: 0, y: 0, width: 60, height: 30 } });
});

test("image: natural size scales down to a narrow column", () => {
  const { layoutCtx } = fakeContexts();
  assert.deepEqual(new ImageNode("a").layout(loose({ width: 40, height: 500 }), layoutCtx), { width: 40, height: 20 });
});

test("image: tight constraints are honoured and the picture is never distorted", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const n = new ImageNode("a");
  assert.deepEqual(n.layout(tight({ width: 200, height: 200 }), layoutCtx), { width: 200, height: 200 });
  n.paint(paintCtx, { x: 0, y: 0 });
  assert.deepEqual(renderer.calls[0], { op: "image", src: "a", box: { x: 0, y: 0, width: 200, height: 100 } });
});

test("image: byte sources use the fake's registered size", () => {
  const ctx = fakeContexts();
  const bytes = new TextEncoder().encode("png");
  ctx.renderer.images.set(bytes, { width: 10, height: 40 });
  assert.deepEqual(new ImageNode(bytes, { height: 80 }).layout(wide, ctx.layoutCtx), { width: 20, height: 80 });
});
