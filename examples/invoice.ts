// The worked example from the README. Run with:  npm run example
import { writeFile } from "node:fs/promises";
import { render, text, padding, fill, row, column, table } from "../src/index.js";

const money = (n: number) => `€${n.toFixed(2)}`;

const entries = [
  { item: "LG Speakers", qty: 1, total: 227.99 },
  { item: "Apple iPhone", qty: 2, total: 1999.99 },
  { item: "USB-C Cable, 2m", qty: 3, total: 29.97 },
];

const doc = column([
  row([
    fill(text("ACME Ltd", { size: 20, font: "Helvetica-Bold" })),
    fill(text("Invoice #1042", { align: "right" })),
  ]),
  padding(text("Thanks for your business"), { y: 8 }),

  table(entries, {
    columns: [
      { label: "Item",  key: "item",  share: 2 },
      { label: "Qty",   key: "qty",   share: 1, align: "right" },
      { label: "Total", key: "total", share: 2, align: "right", format: money },
    ],
    rowPadding: { x: 12, y: 8 },
    header: { background: "#f2f2f2" },
  }),

  padding(
    row([
      text("Total due", { font: "Helvetica-Bold" }),
      text(money(entries.reduce((sum, e) => sum + e.total, 0)), { font: "Helvetica-Bold" }),
    ], { justify: "between" }),
    { top: 16 },
  ),
], { gap: 4 });

const pdf = await render(doc, {
  size: "A4",
  margins: 40,
  defaultStyle: { font: "Helvetica", size: 11 },
});

await writeFile("examples/invoice.pdf", pdf);
console.log(`wrote examples/invoice.pdf (${pdf.length} bytes)`);
