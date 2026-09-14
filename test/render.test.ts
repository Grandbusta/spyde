import { test } from "node:test";
import assert from "node:assert/strict";
import { render, text, padding, background, fill, row, column } from "../src/index.js";

function pageCount(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type \/Page[^s]/g) ?? []).length;
}

function mediaBox(pdf: Buffer): string | undefined {
  return pdf.toString("latin1").match(/\/MediaBox \[([^\]]+)\]/)?.[1];
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
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
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

test("render: content taller than the page stays on one page (D1)", async () => {
  const lines = Array.from({ length: 200 }, (_, i) => text(`line ${i}`));
  const pdf = await render(column(lines), { size: [200, 100] });
  assert.equal(pageCount(pdf), 1);
});

test("render: defaultStyle applies, node style wins", async () => {
  const pdf = await render(
    column([text("default"), text("override", { font: "Courier" })]),
    { defaultStyle: { font: "Times-Roman", size: 11 } },
  );
  const s = pdf.toString("latin1");
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
