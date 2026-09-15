import { test } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { render, renderDisplayList, text, padding, background, fill, row, column, keep, pageBreak, image, table } from "../src/index.js";

function latin1(pdf: Uint8Array): string {
  return Buffer.from(pdf.buffer, pdf.byteOffset, pdf.byteLength).toString("latin1");
}

function pageCount(pdf: Uint8Array): number {
  return (latin1(pdf).match(/\/Type \/Page[^s]/g) ?? []).length;
}

function mediaBox(pdf: Uint8Array): string | undefined {
  return latin1(pdf).match(/\/MediaBox \[([^\]]+)\]/)?.[1];
}

test("render: the worked example from PLAN.md 3.6 produces a one-page PDF", async () => {
  const doc = column([
    text("Invoice #1042", { size: 20, font: "Helvetica-Bold" }),
    padding(text("Thanks for your business"), 8),
    background(
      padding(
        row([
          fill(text("Item")),
          fill(text("Qty")),
          fill(text("Total"), 2),
        ], { gap: 8 }),
        { x: 12, y: 8 },
      ),
      "#f2f2f2",
    ),
  ], { gap: 4 });

  const pdf = await render(doc, { size: "A4", margins: 40 });
  assert.equal(latin1(pdf.subarray(0, 5)), "%PDF-");
  assert.ok(pdf instanceof Uint8Array && !Buffer.isBuffer(pdf), "render returns a plain Uint8Array");
  assert.equal(pageCount(pdf), 1);
  assert.equal(mediaBox(pdf), "0 0 595.28 841.89");
});

test("render: defaults are A4 with 40pt margins", async () => {
  const pdf = await render(text("hi"));
  assert.equal(mediaBox(pdf), "0 0 595.28 841.89");
});

test("render: explicit page size in points", async () => {
  const pdf = await render(text("hi"), { size: [300, 400] });
  assert.equal(mediaBox(pdf), "0 0 300 400");
});

test("render: a column taller than the page continues on further pages", async () => {
  const lines = Array.from({ length: 200 }, (_, i) => text(`line ${i}`));
  const pdf = await render(column(lines), { size: [200, 100] });
  assert.ok(pageCount(pdf) > 10, `got ${pageCount(pdf)} pages`);
});

test("render: a non-column root taller than the page stays on one page and is clipped", async () => {
  const lines = Array.from({ length: 200 }, (_, i) => text(`line ${i}`));
  const pdf = await render(padding(column(lines), 0), { size: [200, 100] });
  assert.equal(pageCount(pdf), 1);
});

test("render: pageBreak gives exactly two pages", async () => {
  const pdf = await render(column([text("one"), pageBreak(), text("two")]));
  assert.equal(pageCount(pdf), 2);
});

test("render: keep moves a block whole to the next page", async () => {
  // content box 160 x 100; default text is 14.4pt per line
  const five = Array.from({ length: 5 }, (_, i) => text(`line ${i}`));
  const block = keep(column([text("total a"), text("total b"), text("total c")]));
  const pdf = await render(column([...five, block]), { size: [200, 140], margins: 20 });
  assert.equal(pageCount(pdf), 2);
});

test("render: a 100-row table spans several pages", async () => {
  const rows = Array.from({ length: 100 }, (_, i) => ({ item: `item ${i}`, qty: i }));
  const pdf = await render(table(rows, { columns: [{ label: "Item", key: "item" }, { label: "Qty", key: "qty" }] }), { size: [300, 200] });
  assert.ok(pageCount(pdf) >= 8, `got ${pageCount(pdf)} pages`);
});

test("render: an image renders as an image object", async () => {
  const pdf = await render(image("test/fixtures/dot.png", { width: 40 }));
  assert.match(latin1(pdf), /\/Subtype \/Image/);
});

test("render: image and font sources may be plain Uint8Arrays, not only Buffers", async () => {
  const bytes = new Uint8Array(readFileSync("test/fixtures/dot.png"));
  assert.ok(!Buffer.isBuffer(bytes));
  const pdf = await render(image(bytes, { width: 40 }));
  assert.match(latin1(pdf), /\/Subtype \/Image/);
});

test("render: defaultStyle applies, node style wins", async () => {
  const pdf = await render(
    column([text("default"), text("override", { font: "Courier" })]),
    { defaultStyle: { font: "Times-Roman", size: 11 } },
  );
  const s = latin1(pdf);
  assert.match(s, /Times-Roman/);
  assert.match(s, /Courier/);
});

test("render: unknown font is rejected with a helpful message", async () => {
  await assert.rejects(render(text("x", { font: "Inter" })), /Unknown font "Inter"/);
});

test("render: empty column renders a blank page without error", async () => {
  const pdf = await render(column([]));
  assert.equal(pageCount(pdf), 1);
});

test("renderDisplayList: same pages as render, and page two of a table starts with the header", () => {
  const rows = Array.from({ length: 60 }, (_, i) => ({ item: `item ${i}`, qty: i }));
  const doc = column([
    text("Statement", { size: 16, field: "title" }),
    table(rows, { columns: [{ label: "Item", key: "item" }, { label: "Qty", key: "qty" }] }),
  ], { gap: 8 });
  const pages = renderDisplayList(doc, { size: [300, 300], margins: 20 });
  assert.ok(pages.length >= 2, `got ${pages.length} pages`);
  assert.deepEqual([pages[0]!.width, pages[0]!.height], [300, 300]);

  // Every page is wrapped in the content-box clip; the first text on page two is the repeated header.
  const page2 = pages[1]!.ops[0]!;
  assert.equal(page2.op, "clip");
  if (page2.op === "clip") {
    const firstText = page2.children.find((o) => o.op === "text");
    assert.ok(firstText && firstText.op === "text");
    if (firstText && firstText.op === "text") assert.deepEqual(firstText.lines, ["Item"]);
  }
  const page1 = pages[0]!.ops[0]!;
  if (page1.op === "clip") {
    const title = page1.children.find((o) => o.op === "text");
    if (title && title.op === "text") assert.equal(title.style.field, "title");
  }
});

test("renderDisplayList: page count agrees with render for the same document", async () => {
  const lines = Array.from({ length: 120 }, (_, i) => text(`line ${i}`));
  const doc = column(lines);
  const pdfPages = pageCount(await render(doc, { size: [200, 120] }));
  const listPages = renderDisplayList(doc, { size: [200, 120] }).length;
  assert.equal(listPages, pdfPages);
});
