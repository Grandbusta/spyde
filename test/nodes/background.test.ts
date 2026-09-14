import { test } from "node:test";
import assert from "node:assert/strict";
import { BackgroundNode } from "../../src/nodes/background.js";
import { PaddingNode } from "../../src/nodes/padding.js";
import { loose, tight } from "../../src/core/constraints.js";
import { FixedBox, fakeContexts } from "../fakeRenderer.js";

test("background: takes the child's size", () => {
  const { layoutCtx } = fakeContexts();
  const node = new BackgroundNode(new FixedBox({ width: 40, height: 20 }), "#eee");
  assert.deepEqual(node.layout(loose({ width: 500, height: 500 }), layoutCtx), { width: 40, height: 20 });
});

test("background: passes constraints to the child unchanged", () => {
  const { layoutCtx } = fakeContexts();
  const child = new FixedBox({ width: 40, height: 20 });
  const c = tight({ width: 100, height: 50 });
  new BackgroundNode(child, "#eee").layout(c, layoutCtx);
  assert.deepEqual(child.lastConstraints, c);
});

test("background: fills first, then paints the child on top, same box", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const node = new BackgroundNode(new FixedBox({ width: 40, height: 20 }, "child"), "#eee");
  node.layout(loose({ width: 500, height: 500 }), layoutCtx);
  node.paint(paintCtx, { x: 10, y: 20 });
  assert.deepEqual(renderer.calls, [
    { op: "fillRect", rect: { x: 10, y: 20, width: 40, height: 20 }, color: "#eee" },
    { op: "fillRect", rect: { x: 10, y: 20, width: 40, height: 20 }, color: "child" },
  ]);
});

test("background: with tight constraints the fill covers the whole box", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const node = new BackgroundNode(new FixedBox({ width: 40, height: 20 }, "child"), "#eee");
  node.layout(tight({ width: 200, height: 100 }), layoutCtx);
  node.paint(paintCtx, { x: 0, y: 0 });
  assert.deepEqual(renderer.calls[0], {
    op: "fillRect", rect: { x: 0, y: 0, width: 200, height: 100 }, color: "#eee",
  });
});

test("background around padding: fill covers content plus insets", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const node = new BackgroundNode(new PaddingNode(new FixedBox({ width: 40, height: 20 }, "child"), { x: 12, y: 8 }), "#f2f2f2");
  assert.deepEqual(node.layout(loose({ width: 500, height: 500 }), layoutCtx), { width: 64, height: 36 });
  node.paint(paintCtx, { x: 0, y: 0 });
  assert.deepEqual(renderer.calls, [
    { op: "fillRect", rect: { x: 0, y: 0, width: 64, height: 36 }, color: "#f2f2f2" },
    { op: "fillRect", rect: { x: 12, y: 8, width: 40, height: 20 }, color: "child" },
  ]);
});
