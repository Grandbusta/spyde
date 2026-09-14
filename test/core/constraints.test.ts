import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tight, loose, loosen, deflate, constrain, INFINITY,
  isTightWidth, isTightHeight, hasBoundedWidth, hasBoundedHeight, biggest, smallest,
} from "../../src/core/constraints.js";

test("tight: min equals max on both axes", () => {
  const c = tight({ width: 100, height: 50 });
  assert.deepEqual(c, { minWidth: 100, maxWidth: 100, minHeight: 50, maxHeight: 50 });
  assert.ok(isTightWidth(c) && isTightHeight(c));
});

test("loose: min is 0, max is the given size", () => {
  const c = loose({ width: 100, height: 50 });
  assert.deepEqual(c, { minWidth: 0, maxWidth: 100, minHeight: 0, maxHeight: 50 });
  assert.ok(!isTightWidth(c) && !isTightHeight(c));
});

test("loosen: keeps maxima, drops minima", () => {
  assert.deepEqual(loosen(tight({ width: 100, height: 50 })), loose({ width: 100, height: 50 }));
});

test("deflate: shrinks both bounds by the insets", () => {
  const c = deflate(tight({ width: 100, height: 50 }), { top: 5, right: 10, bottom: 5, left: 10 });
  assert.deepEqual(c, { minWidth: 80, maxWidth: 80, minHeight: 40, maxHeight: 40 });
});

test("deflate: never goes below 0 and keeps min <= max", () => {
  const c = deflate(tight({ width: 10, height: 10 }), { top: 20, right: 20, bottom: 20, left: 20 });
  assert.deepEqual(c, { minWidth: 0, maxWidth: 0, minHeight: 0, maxHeight: 0 });
});

test("deflate: infinite max stays infinite", () => {
  const c = deflate(
    { minWidth: 0, maxWidth: INFINITY, minHeight: 0, maxHeight: INFINITY },
    { top: 5, right: 5, bottom: 5, left: 5 },
  );
  assert.equal(c.maxWidth, INFINITY);
  assert.equal(c.maxHeight, INFINITY);
});

// D1: the overflow rule. A node never reports a size outside its constraints.
test("constrain: a size that fits comes back unchanged", () => {
  const c = loose({ width: 100, height: 100 });
  assert.deepEqual(constrain(c, { width: 40, height: 30 }), { width: 40, height: 30 });
});

test("constrain: oversize content is clamped to the maximum (D1, no throw)", () => {
  const c = loose({ width: 100, height: 100 });
  assert.deepEqual(constrain(c, { width: 250, height: 999 }), { width: 100, height: 100 });
});

test("constrain: undersize content is raised to the minimum", () => {
  const c = tight({ width: 100, height: 100 });
  assert.deepEqual(constrain(c, { width: 10, height: 10 }), { width: 100, height: 100 });
});

test("constrain: clamps each axis independently", () => {
  const c = { minWidth: 50, maxWidth: 100, minHeight: 0, maxHeight: 20 };
  assert.deepEqual(constrain(c, { width: 10, height: 999 }), { width: 50, height: 20 });
});

test("bounded checks, biggest and smallest", () => {
  const c = { minWidth: 5, maxWidth: INFINITY, minHeight: 2, maxHeight: 80 };
  assert.equal(hasBoundedWidth(c), false);
  assert.equal(hasBoundedHeight(c), true);
  assert.deepEqual(biggest(c), { width: INFINITY, height: 80 });
  assert.deepEqual(smallest(c), { width: 5, height: 2 });
});
