import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveStyle, DEFAULT_STYLE, BUILTIN_FONTS } from "../../src/core/style.js";

test("resolveStyle: nothing set gives library defaults", () => {
  assert.deepEqual(resolveStyle(undefined, undefined), DEFAULT_STYLE);
});

test("resolveStyle: render default overrides library default", () => {
  const s = resolveStyle(undefined, { font: "Inter", size: 11 });
  assert.equal(s.font, "Inter");
  assert.equal(s.size, 11);
  assert.equal(s.color, DEFAULT_STYLE.color);
});

test("resolveStyle: node style overrides render default, field by field", () => {
  const s = resolveStyle({ size: 20 }, { font: "Inter", size: 11, color: "#333" });
  assert.equal(s.size, 20);
  assert.equal(s.font, "Inter");
  assert.equal(s.color, "#333");
  assert.equal(s.lineHeight, DEFAULT_STYLE.lineHeight);
});

test("built-in fonts are PDFKit's standard fourteen", () => {
  assert.equal(BUILTIN_FONTS.size, 14);
  assert.ok(BUILTIN_FONTS.has("Helvetica"));
  assert.ok(BUILTIN_FONTS.has("Times-Roman"));
  assert.ok(BUILTIN_FONTS.has("ZapfDingbats"));
  assert.ok(!BUILTIN_FONTS.has("Inter"));
});
