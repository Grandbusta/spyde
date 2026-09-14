import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveInsets, horizontal, vertical, addOffset, rectAt } from "../../src/core/geometry.js";

test("resolveInsets: undefined is all zeros", () => {
  assert.deepEqual(resolveInsets(undefined), { top: 0, right: 0, bottom: 0, left: 0 });
});

test("resolveInsets: a number applies to all four sides", () => {
  assert.deepEqual(resolveInsets(8), { top: 8, right: 8, bottom: 8, left: 8 });
});

test("resolveInsets: x is horizontal, y is vertical", () => {
  assert.deepEqual(resolveInsets({ x: 12, y: 8 }), { top: 8, right: 12, bottom: 8, left: 12 });
});

test("resolveInsets: x or y alone leaves the other axis at 0", () => {
  assert.deepEqual(resolveInsets({ x: 5 }), { top: 0, right: 5, bottom: 0, left: 5 });
  assert.deepEqual(resolveInsets({ y: 5 }), { top: 5, right: 0, bottom: 5, left: 0 });
});

test("resolveInsets: per-side form, missing sides are 0", () => {
  assert.deepEqual(resolveInsets({ top: 1, left: 4 }), { top: 1, right: 0, bottom: 0, left: 4 });
});

test("resolveInsets: empty object is all zeros", () => {
  assert.deepEqual(resolveInsets({}), { top: 0, right: 0, bottom: 0, left: 0 });
});

test("horizontal and vertical sum the right sides", () => {
  const i = { top: 1, right: 2, bottom: 3, left: 4 };
  assert.equal(horizontal(i), 6);
  assert.equal(vertical(i), 4);
});

test("addOffset and rectAt", () => {
  assert.deepEqual(addOffset({ x: 1, y: 2 }, { x: 10, y: 20 }), { x: 11, y: 22 });
  assert.deepEqual(rectAt({ x: 1, y: 2 }, { width: 3, height: 4 }), { x: 1, y: 2, width: 3, height: 4 });
});
