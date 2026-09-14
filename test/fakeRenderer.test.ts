import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeRenderer } from "./fakeRenderer.js";
import { DEFAULT_STYLE } from "../src/core/style.js";

const r = new FakeRenderer();
const style = { ...DEFAULT_STYLE, size: 10, lineHeight: 1.2 }; // 5pt per char, 12pt per line

test("fake measure: single line", () => {
  assert.deepEqual(r.measureText("hello", style, 1000), { width: 25, height: 12, lineCount: 1 });
});

test("fake measure: wraps at word boundaries", () => {
  // "hello world" = 55pt; max 30 forces two lines of 25pt each
  assert.deepEqual(r.measureText("hello world", style, 30), { width: 25, height: 24, lineCount: 2 });
});

test("fake measure: a word wider than maxWidth stays on one line", () => {
  assert.deepEqual(r.measureText("abcdefghij", style, 10), { width: 50, height: 12, lineCount: 1 });
});

test("fake measure: newline forces a break", () => {
  assert.equal(r.measureText("a\nb", style, 1000).lineCount, 2);
});
