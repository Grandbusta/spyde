import { test } from "node:test";
import assert from "node:assert/strict";
import { WidthNode, HeightNode } from "../../src/nodes/sized.js";
import { RowNode } from "../../src/nodes/row.js";
import { FillNode } from "../../src/nodes/fill.js";
import { loose } from "../../src/core/constraints.js";
import { FixedBox, fakeContexts } from "../fakeRenderer.js";

const page = loose({ width: 500, height: 500 });

test("width: tight on width, height passes through", () => {
  const { layoutCtx } = fakeContexts();
  const child = new FixedBox({ width: 40, height: 20 });
  assert.deepEqual(new WidthNode(child, 60).layout(page, layoutCtx), { width: 60, height: 20 });
  assert.deepEqual(child.lastConstraints, { minWidth: 60, maxWidth: 60, minHeight: 0, maxHeight: 500 });
});

test("height: tight on height, width passes through", () => {
  const { layoutCtx } = fakeContexts();
  const child = new FixedBox({ width: 40, height: 20 });
  assert.deepEqual(new HeightNode(child, 90).layout(page, layoutCtx), { width: 40, height: 90 });
  assert.deepEqual(child.lastConstraints, { minWidth: 0, maxWidth: 500, minHeight: 90, maxHeight: 90 });
});

test("width: larger than the parent allows is clamped", () => {
  const { layoutCtx } = fakeContexts();
  assert.deepEqual(new WidthNode(new FixedBox({ width: 40, height: 20 }), 900).layout(page, layoutCtx), { width: 500, height: 20 });
});

test("width: in a row, a fixed-width cell next to a fill", () => {
  const { layoutCtx } = fakeContexts();
  const a = new FixedBox({ width: 5, height: 10 });
  const b = new FixedBox({ width: 5, height: 10 });
  const row = new RowNode([new WidthNode(a, 60), new FillNode(b)], { gap: 10 });
  assert.deepEqual(row.layout(loose({ width: 200, height: 100 }), layoutCtx), { width: 200, height: 10 });
  assert.equal(a.lastSize?.width, 60);
  assert.equal(b.lastSize?.width, 130);
});
