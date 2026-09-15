import { test } from "node:test";
import assert from "node:assert/strict";
import { paintHtml, cssFont } from "../../src/backend/html.js";
import { renderHtml, renderDisplayList, text, column, row, fill, padding, background, image, table } from "../../src/index.js";
import type { DisplayList } from "../../src/index.js";
import { DEFAULT_STYLE } from "../../src/core/style.js";

const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

test("html: text is escaped, never markup", () => {
  const html = renderHtml(text('<script>alert("x")</script> & co', { field: 'a"b' }));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co") || html.includes("&lt;script&gt;alert(\"x\")&lt;/script&gt; &amp; co"));
  assert.ok(html.includes('data-field="a&quot;b"'));
});

test("html: one container per page, sized in pt, and a stylesheet first", () => {
  const lines = Array.from({ length: 60 }, (_, i) => text(`line ${i}`));
  const html = renderHtml(column(lines), { size: [200, 120], margins: 10 });
  assert.ok(html.startsWith("<style>"));
  assert.ok(count(html, /class="spyde-page"/g) >= 2);
  assert.ok(html.includes('data-page="1" style="width:200pt;height:120pt"'));
});

test("html: same text style shares one class, a different style gets the next; the rule maps to CSS", () => {
  const html = renderHtml(column([
    text("a", { font: "Helvetica-Bold", size: 20, align: "right" }),
    text("b", { font: "Helvetica-Bold", size: 20, align: "right" }),
    text("c", { font: "Times-Italic", size: 10 }),
  ]));
  assert.equal(count(html, /class="spyde-text spyde-s1"/g), 2);
  assert.equal(count(html, /class="spyde-text spyde-s2"/g), 1);
  assert.ok(html.includes(".spyde-s1{font-family:Helvetica, Arial, sans-serif;font-weight:bold;font-style:normal;font-size:20pt;line-height:24pt;color:#000000;text-align:right}"));
  assert.ok(html.includes('.spyde-s2{font-family:"Times New Roman", Times, serif;font-weight:normal;font-style:italic;font-size:10pt;line-height:12pt;'));
});

test("html: one inner div per line PDFKit produced, and nowrap so the browser never re-wraps", () => {
  const list = renderDisplayList(text("the quick brown fox jumps over the lazy dog"), { size: [100, 200], margins: 10 });
  const textOp = findText(list);
  const html = paintHtml(list);
  assert.ok(textOp.lines.length >= 3);
  assert.equal(count(html, /<div>[^<]*<\/div>/g), textOp.lines.length);
  assert.ok(html.includes("white-space:nowrap"));
});

test("html: stylesheet none drops the block and nothing else", () => {
  const withStyle = renderHtml(text("x"));
  const without = renderHtml(text("x"), { stylesheet: "none" });
  assert.ok(withStyle.includes("<style>") && !without.includes("<style>"));
  assert.equal(without, withStyle.slice(withStyle.indexOf("</style>") + "</style>\n".length));
});

test("html: data-field only when set; class prefix is honoured", () => {
  const html = renderHtml(column([text("a", { field: "number" }), text("b")]), { classPrefix: "pv" });
  assert.equal(count(html, /data-field=/g), 1);
  assert.ok(html.includes('class="pv-text pv-s1" data-field="number"'));
  assert.ok(html.includes(".pv-page{"));
});

test("html: a clip becomes an overflow-hidden div and its children are re-based to it", () => {
  const list: DisplayList = [{
    width: 100, height: 100,
    ops: [{ op: "clip", x: 40, y: 40, width: 30, height: 20, children: [
      { op: "rect", x: 50, y: 60, width: 5, height: 5, color: "red" },
    ] }],
  }];
  const html = paintHtml(list, { stylesheet: "none" });
  assert.ok(html.includes('<div class="spyde-clip" style="left:40pt;top:40pt;width:30pt;height:20pt">'));
  assert.ok(html.includes('<div class="spyde-rect" style="left:10pt;top:20pt;width:5pt;height:5pt;background:red"></div>'));
});

test("html: images become data URIs by default, and imageSrc overrides", () => {
  const doc = image("test/fixtures/dot.png", { width: 40 });
  const dataUri = renderHtml(doc, { stylesheet: "none" });
  assert.ok(dataUri.includes('src="data:image/png;base64,'));
  const mapped = renderHtml(doc, { stylesheet: "none", imageSrc: (src) => `/static/${String(src).split("/").pop()}` });
  assert.ok(mapped.includes('src="/static/dot.png"'));
  assert.ok(mapped.includes('class="spyde-image" alt=""'));
});

test("html: the invoice renders to balanced markup", () => {
  const money = (n: number) => `€${n.toFixed(2)}`;
  const entries = [{ item: "A", qty: 1, total: 2 }, { item: "B", qty: 2, total: 4 }];
  const doc = column([
    row([fill(text("ACME", { size: 20, font: "Helvetica-Bold" })), fill(text("Invoice", { align: "right" }))]),
    padding(text("Thanks"), 8),
    background(padding(table(entries, { columns: [{ label: "Item", key: "item" }, { label: "Total", key: "total", format: money }] }), 6), "#f2f2f2"),
  ], { gap: 4 });
  const html = renderHtml(doc);
  assert.equal(count(html, /<div\b/g), count(html, /<\/div>/g));
  assert.equal(count(html, /<style>/g), count(html, /<\/style>/g));
  assert.ok(!/<img[^>]*>[^<]*<\/img>/.test(html));
});

test("html: pretty output is the compact output plus indentation and one line per text line", () => {
  const doc = column([text("a b c d e f g h i j k l m n o p", { field: "f" }), padding(text("x"), 4)]);
  const compact = renderHtml(doc, { size: [80, 200], margins: 5, stylesheet: "none" });
  const pretty = renderHtml(doc, { size: [80, 200], margins: 5, stylesheet: "none", pretty: true });
  assert.ok(pretty.split("\n").length > compact.split("\n").length);
  assert.ok(pretty.includes("\n    <div class=\"spyde-text"), "text boxes are indented under the clip");
  assert.ok(/\n      <div>[^<]*<\/div>\n/.test(pretty), "each line sits on its own indented line");
  const strip = (h: string) => h.split("\n").map((l) => l.trim()).join("");
  assert.equal(strip(pretty), strip(compact));
});

test("html: built-in font mapping", () => {
  assert.deepEqual(cssFont("Helvetica-BoldOblique"), { family: "Helvetica, Arial, sans-serif", weight: "bold", style: "italic" });
  assert.deepEqual(cssFont("Courier"), { family: '"Courier New", Courier, monospace', weight: "normal", style: "normal" });
  assert.deepEqual(cssFont("Inter"), { family: '"Inter"', weight: "normal", style: "normal" });
});

function findText(list: DisplayList) {
  const stack = [...list.flatMap((p) => p.ops)];
  while (stack.length) {
    const op = stack.shift()!;
    if (op.op === "text") return op;
    if (op.op === "clip") stack.unshift(...op.children);
  }
  throw new Error("no text op");
}

void DEFAULT_STYLE;
