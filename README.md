# Spyde

Declarative PDF layout for Node. No browser.

Describe a document as a tree of functions. Spyde works out where everything
goes, breaks it across pages, and draws it with PDFKit. You never type an x
or a y.

**Documentation:** https://grandbusta.github.io/spyde/

## Install

```sh
npm install @grandbusta/spyde
# or
yarn add @grandbusta/spyde
```

Node 20 or newer. PDFKit is the only runtime dependency. TypeScript types are included.

## Example

```ts
import { render, column, row, text, fill, table } from "@grandbusta/spyde";

const money = (n: number) => `€${n.toFixed(2)}`;
const entries = [
  { item: "LG Speakers",  qty: 1, total: 227.99 },
  { item: "Apple iPhone", qty: 2, total: 1999.99 },
];

const doc = column([
  row([
    fill(text("ACME Ltd", { size: 20, font: "Helvetica-Bold" })),
    fill(text("Invoice #1042", { align: "right" })),
  ]),
  table(entries, {
    columns: [
      { label: "Item",  key: "item",  share: 2 },
      { label: "Qty",   key: "qty",   align: "right" },
      { label: "Total", key: "total", align: "right", format: money },
    ],
    rowPadding: { x: 12, y: 8 },
    header: { background: "#f2f2f2" },
  }),
  row([text("Total due"), text(money(2227.98))], { justify: "between", margin: { top: 16 } }),
], { gap: 8 });

const pdf = await render(doc);   // Uint8Array, ready to write or send
```

Every function takes its content first and its settings second, so a call
reads the way it works.

## Why

Making a PDF in Node today means drawing it by hand with PDFKit, computing
every coordinate, or writing HTML and printing it through a headless
browser, which ships Chromium to make a receipt. Spyde is the middle: a
small layout engine on PDFKit, with PDFKit's speed and footprint and a
declarative API.

Columns and tables break across pages. Table headers repeat. The same
layout can also be rendered as an HTML fragment for a live preview that
matches the PDF line for line.

The [documentation](https://grandbusta.github.io/spyde/) covers the API,
tables, pages, text and images, the live preview, and how it works.

## Development

```sh
npm install
npm run build      # tsc -> dist/
npm test           # node --test against compiled sources
npm run example    # writes examples/*.pdf
npm run preview    # live preview server on http://localhost:8787
npm run docs:dev   # documentation site with hot reload
```

## License

MIT
