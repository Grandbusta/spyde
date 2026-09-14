import { test } from "node:test";
import assert from "node:assert/strict";
import { PdfKitRenderer } from "../../src/backend/pdfkit.js";
import { DEFAULT_STYLE } from "../../src/core/style.js";

const style = { ...DEFAULT_STYLE, size: 10, lineHeight: 1.2 }; // 12pt per line

function latin1(pdf: Uint8Array): string {
  return Buffer.from(pdf.buffer, pdf.byteOffset, pdf.byteLength).toString("latin1");
}

function pageCount(pdf: Uint8Array): number {
  return (latin1(pdf).match(/\/Type \/Page[^s]/g) ?? []).length;
}

test("pdfkit: page size for A4 and for explicit points", async () => {
  assert.deepEqual((new PdfKitRenderer({ size: "A4" })).pageSize(), { width: 595.28, height: 841.89 });
  assert.deepEqual((new PdfKitRenderer({ size: [300, 400] })).pageSize(), { width: 300, height: 400 });
});

test("pdfkit: line height is size * lineHeight, not the font's natural height", async () => {
  const r = new PdfKitRenderer();
  const one = r.measureText("hello", style, 1000);
  assert.equal(one.lineCount, 1);
  assert.ok(Math.abs(one.height - 12) < 0.01, `got ${one.height}`);
  const two = r.measureText("hello\nworld", style, 1000);
  assert.equal(two.lineCount, 2);
  assert.ok(Math.abs(two.height - 24) < 0.01, `got ${two.height}`);
  const tall = r.measureText("hello", { ...style, lineHeight: 2 }, 1000);
  assert.ok(Math.abs(tall.height - 20) < 0.01, `got ${tall.height}`);
});

test("pdfkit: bounded width wraps and reports the widest line", async () => {
  const r = new PdfKitRenderer();
  const wide = r.measureText("hello world", style, 1000);
  const narrow = r.measureText("hello world", style, wide.width * 0.6);
  assert.equal(wide.lineCount, 1);
  assert.equal(narrow.lineCount, 2);
  assert.ok(narrow.width < wide.width);
  assert.ok(narrow.width <= wide.width * 0.6 + 0.01);
});

test("pdfkit: unbounded width measures without wrapping", async () => {
  const r = new PdfKitRenderer();
  const m = r.measureText("a fairly long line of text that would wrap in a narrow box", style, Infinity);
  assert.equal(m.lineCount, 1);
  assert.ok(m.width > 200);
});

test("pdfkit: drawing into a box exactly as wide as the measured text does not wrap", async () => {
  const r = new PdfKitRenderer();
  const m = r.measureText("hello world again", style, Infinity);
  const yBefore = r.doc.y;
  r.drawText("hello world again", style, { x: 10, y: 10, width: m.width, height: m.height });
  // PDFKit advances doc.y by one line per line drawn.
  const advanced = r.doc.y - 10;
  assert.ok(Math.abs(advanced - 12) < 0.05, `advanced ${advanced}, started at ${yBefore}`);
});

test("pdfkit: text taller than the page does not add a page", async () => {
  const r = new PdfKitRenderer({ size: [200, 100] });
  const lines = Array.from({ length: 40 }, (_, i) => `line ${i}`).join("\n");
  r.drawText(lines, style, { x: 0, y: 0, width: 200, height: 100 });
  const pdf = await r.finish();
  assert.equal(pageCount(pdf), 1);
});

test("pdfkit: unknown font is a clear error at measure time", async () => {
  const r = new PdfKitRenderer();
  assert.throws(
    () => r.measureText("x", { ...style, font: "Inter" }, 100),
    /Unknown font "Inter".*fonts: \{ "Inter"/s,
  );
});

test("pdfkit: every built-in font measures without a font file", async () => {
  const r = new PdfKitRenderer();
  for (const font of ["Helvetica-Bold", "Times-Roman", "Courier-Oblique"]) {
    const m = r.measureText("abc", { ...style, font }, 100);
    assert.ok(m.width > 0, font);
  }
  // Symbol and ZapfDingbats have no glyphs for plain letters, so width is 0.
  // They must still load without a file.
  for (const font of ["Symbol", "ZapfDingbats"]) {
    assert.doesNotThrow(() => r.measureText("abc", { ...style, font }, 100), font);
  }
});

test("pdfkit: finish returns a PDF", async () => {
  const r = new PdfKitRenderer();
  r.fillRect({ x: 10, y: 10, width: 50, height: 20 }, "#f2f2f2");
  r.save();
  r.clip({ x: 0, y: 0, width: 100, height: 100 });
  r.drawText("Invoice", style, { x: 10, y: 10, width: 100, height: 12 });
  r.restore();
  const pdf = await r.finish();
  assert.equal(latin1(pdf.subarray(0, 5)), "%PDF-");
  assert.equal(pageCount(pdf), 1);
});
