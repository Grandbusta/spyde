---
description: "A complete Spyde example, the one-page invoice from examples/invoice.ts, shown as its code and the page it produces."
---

# Example

`examples/invoice.ts` in the repository. `npm run example` writes `examples/invoice.pdf` next to it.

<div class="tabs">
<input type="radio" name="invoice-tabs" id="invoice-code" checked>
<label for="invoice-code">Code</label>
<input type="radio" name="invoice-tabs" id="invoice-result">
<label for="invoice-result">Result</label>
<div class="panel">

```ts
import { writeFile } from "node:fs/promises";
import { render, text, padding, fill, row, column, table } from "@grandbusta/spyde";

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
```

</div>
<div class="panel">

<img src="/examples/invoice.png" alt="The rendered invoice page: company name and invoice number, a three-column table with a grey header and three rows, and a total line.">

</div>
</div>
