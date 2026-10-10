// The self-contained browser bundle, dist/spyde.browser.js, loaded as shipped.
// It is what a CDN serves to a plain <script type="module">, so it must carry
// PDFKit's browser build and the standard fonts, and reach for nothing in
// Node. Running it under Node exercises everything but the page itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type Spyde = typeof import("../src/index.browser.js");

const path = new URL("../../dist/spyde.browser.js", import.meta.url);
const source = readFileSync(path, "utf8");
const spyde: Spyde = await import(path.href);
const { render, renderHtml, validate, column, row, text, image, divider } = spyde;

const latin1 = (pdf: Uint8Array) => Buffer.from(pdf.buffer, pdf.byteOffset, pdf.byteLength).toString("latin1");

test("browser bundle: imports nothing, so a browser can load it alone", () => {
  // Statements only: the code also holds strings like " from " (the brotli dictionary).
  assert.doesNotMatch(source, /(?:^|[;\n])\s*(?:import|export)\b[^;"'`]*\bfrom\s*["']/, "an import or re-export");
  assert.doesNotMatch(source, /(?:^|[;\n])\s*import\s*["']/, "a bare import");
  assert.doesNotMatch(source, /\bimport\s*\(/, "a dynamic import");
  assert.doesNotMatch(source, /\brequire\s*\(\s*["']/, "a require call");
  assert.doesNotMatch(source, /["']node:/, "a node: specifier");
});

test("browser bundle: renders a PDF with the standard fonts registered", async () => {
  const doc = column([
    text("Invoice #1042", { font: "Helvetica-Bold", size: 20 }),
    text("Times", { font: "Times-Roman" }),
    text("Courier", { font: "Courier" }),
  ]);
  const raw = latin1(await render(doc, { size: [300, 200], info: { title: "Bundle" } }));
  assert.ok(raw.startsWith("%PDF-"));
  for (const font of ["Helvetica-Bold", "Times-Roman", "Courier"]) assert.match(raw, new RegExp(`/BaseFont /${font}\\b`));
});

test("browser bundle: paints the same layout as HTML", () => {
  const html = renderHtml(text("Hello", { field: "greeting" }), { size: [200, 100] });
  assert.match(html, /data-field="greeting"/);
  assert.match(html, /<div>Hello<\/div>/);
});

test("browser bundle: validate works", () => {
  const findings = validate(column([row([text("a"), divider()])]));
  assert.equal(findings.length, 1);
  assert.match(findings[0]!.message, /1-point dot/);
});

test("browser bundle: an image given as bytes renders; a path is a clear error", async () => {
  const png = new Uint8Array(readFileSync("test/fixtures/dot.png"));
  assert.ok(latin1(await render(image(png, { width: 40 }))).includes("/Subtype /Image"));
  await assert.rejects(render(image("test/fixtures/dot.png", { width: 40 })), /no file paths in a browser/);
  assert.throws(() => renderHtml(image("test/fixtures/dot.png", { width: 40 })), /no file paths in a browser/);
});
