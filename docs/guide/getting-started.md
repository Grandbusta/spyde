---
description: "Install Spyde, build a one-page invoice from a tree of functions, and get PDF bytes back. No coordinates, one runtime dependency."
---

# Getting started

## Install

::: code-group

```sh [npm]
npm install @grandbusta/spyde
```

```sh [yarn]
yarn add @grandbusta/spyde
```

:::

Node 20 or newer. PDFKit comes with it, and it is the only runtime dependency. TypeScript types are included.

## A first document

```ts
import { render, column, row, text, fill, table } from "@grandbusta/spyde";
import { writeFile } from "node:fs/promises";

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

const pdf = await render(doc);          // Uint8Array
await writeFile("invoice.pdf", pdf);
```

That is a complete, one-page invoice. Nothing in it is a coordinate.

## What you get back

`render` returns a `Uint8Array`, the standard byte type every runtime has. Node's `writeFile`, an HTTP response, and an upload all accept it directly. A Node `Buffer` is a `Uint8Array`, so bytes you read with `readFileSync` go straight in as fonts or images, and if you need a Node-only method on the result, `Buffer.from(pdf)` wraps it without copying.

## The one rule

Every function takes its content first and its settings second:

```ts
text("Hi", { size: 14 })          // content, then style
padding(text("Hi"), 8)            // content, then insets
row([a, b], { gap: 8 })           // children, then options
```

Read any call aloud and it describes itself. `padding(text("Hi"), 8)` pads the text by 8.

## Where to go next

- [Pages](/guide/pages): how documents break, `keep`, `pageBreak`, box options, alignment.
- [Tables](/guide/tables): data in, columns as recipes.
- [Live preview](/guide/live-preview): the same layout as HTML.
- [API](/api): every function and its settings.
