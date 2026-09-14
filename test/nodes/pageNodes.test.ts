import { test } from "node:test";
import assert from "node:assert/strict";
import { PageBreakNode } from "../../src/nodes/pageBreak.js";
import { KeepNode } from "../../src/nodes/keep.js";
import { loose, tight } from "../../src/core/constraints.js";
import { FixedBox, fakeContexts } from "../fakeRenderer.js";

test("pageBreak: zero size and draws nothing outside a column", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const node = new PageBreakNode();
  assert.deepEqual(node.layout(loose({ width: 100, height: 100 }), layoutCtx), { width: 0, height: 0 });
  node.paint(paintCtx, { x: 0, y: 0 });
  assert.deepEqual(renderer.calls, []);
});

test("pageBreak: honours tight constraints like any node", () => {
  const { layoutCtx } = fakeContexts();
  assert.deepEqual(new PageBreakNode().layout(tight({ width: 10, height: 5 }), layoutCtx), { width: 10, height: 5 });
});

test("keep: reports and paints exactly its child", () => {
  const { layoutCtx, paintCtx, renderer } = fakeContexts();
  const child = new FixedBox({ width: 40, height: 20 }, "c");
  const node = new KeepNode(child);
  const c = loose({ width: 100, height: 100 });
  assert.deepEqual(node.layout(c, layoutCtx), { width: 40, height: 20 });
  assert.deepEqual(child.lastConstraints, c);
  node.paint(paintCtx, { x: 3, y: 4 });
  assert.deepEqual(renderer.calls, [{ op: "fillRect", rect: { x: 3, y: 4, width: 40, height: 20 }, color: "c" }]);
});
