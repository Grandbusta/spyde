// Run after `npm run build`:  node examples/invoice.js   (see package.json "example")
import { writeFile } from "node:fs/promises";
import { render, text, padding, background, fill, row, column } from "../src/index.js";

const doc = column([
  text("Invoice #1042", { size: 20, font: "Helvetica-Bold" }),
  padding(text("Thanks for your business"), 8),
  background(
    padding(
      row([
        fill(text("Item"), 2),
        fill(text("Qty"), 1),
        fill(text("Total"), 2),
      ], { gap: 8 }),
      { x: 12, y: 8 },
    ),
    "#f2f2f2",
  ),
  padding(
    row([
      fill(text("LG Speakers"), 2),
      fill(text("1"), 1),
      fill(text("€227.99"), 2),
    ], { gap: 8 }),
    { x: 12, y: 8 },
  ),
], { gap: 4 });

const pdf = await render(doc, {
  size: "A4",
  margins: 40,
  defaultStyle: { font: "Helvetica", size: 11 },
});

await writeFile("examples/invoice.pdf", pdf);
console.log(`wrote examples/invoice.pdf (${pdf.length} bytes)`);
