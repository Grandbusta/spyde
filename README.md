# Spyde

Declarative PDF layout for Node. No browser.

Describe a document as a tree of boxes. Spyde works out where everything goes,
breaks it across pages, and draws it with PDFKit. You never type an x or a y.

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

## Why

Making a PDF in Node today means one of two things. Draw it by hand with
PDFKit, computing every coordinate and fixing them all when anything changes.
Or write HTML and print it through a headless browser, which lays out nicely
but ships Chromium to make a receipt: slow to start, heavy in memory, painful
in serverless.

Spyde is the middle. It is a small layout engine on top of PDFKit. You get
PDFKit's speed and footprint with a declarative API, and no framework.

The same two-page statement, written both ways, is in `examples/`. The Spyde
version is about half the code of the raw PDFKit one, and the half that is
gone is the coordinate arithmetic and the page loop, which is where the bugs
live.

## Install

```sh
npm install @grandbusta/spyde
```

Node 20 or newer. PDFKit comes with it. TypeScript types are included.

## API

| Function | What it does |
|---|---|
| `text` | Puts a string on the page |
| `image` | Puts a picture on the page |
| `row` | Places things side by side |
| `column` | Stacks things top to bottom, continuing on the next page when full |
| `fill` | Makes something take the leftover space in its row or column |
| `spacer` | Takes leftover space and draws nothing |
| `padding` | Adds space around something |
| `background` | Paints a colour behind something |
| `width`, `height` | Makes something exactly this wide or tall |
| `divider` | Draws a line |
| `table` | Rows and columns of cells, with a header that repeats on every page |
| `keep` | Keeps something on one page |
| `pageBreak` | Starts a new page |

Every function takes its content first and its settings second, so a call
reads the way it works: `padding(text("Hi"), 8)` pads the text by 8.

`render(tree, options?)` turns a tree into PDF bytes. `renderHtml(tree, options?)`
paints the same layout as an HTML fragment; see Live preview below.

`row`, `column`, and `table` also take `padding`, `background`, and `margin`
as options, so a card is one call instead of four nested ones:

```ts
column([
  row([text("Opening balance"), text("€1200.00")], { justify: "between" }),
  row([text("Closing balance"), text("€1585.00")], { justify: "between" }),
], { gap: 6, padding: 12, background: "#f2f2f2", keep: true })
```

## Tables

Rows are your data. Each column says which field to show and how.

```ts
table(rows, {
  columns: [
    { label: "Date",        key: "date",     width: 80 },
    { label: "Description", key: "merchant" },
    { label: "Amount",      key: "amount",   width: 80, align: "right", format: money },
  ],
  header: { background: "#f2f2f2" },
  row: (r, i) => ({ background: i % 2 ? "#f7f7f7" : undefined }),   // zebra stripes
})
```

The header repeats at the top of every page the table runs onto. Rows never
split. `format` can return any node, so a cell can be a coloured box or an
image when text is not enough.

## Pages

A column that does not fit continues on the next page, breaking between its
children. Everything else moves whole. `keep` holds a block together;
`pageBreak` starts a fresh page. Content that fits nowhere is clipped, never
an error.

## Text, fonts, images

```ts
text("Hello", { font: "Helvetica-Bold", size: 14, color: "#333", align: "center" })
image("./logo.png", { width: 120 })         // height follows the aspect ratio
```

PDFKit's fourteen built-in fonts need no files. For your own, register once
and use by name:

```ts
await render(doc, {
  size: "A4",                                          // or "LETTER", or [width, height] in points
  margins: 40,
  fonts: { Inter: "./fonts/Inter-Regular.ttf" },
  defaultStyle: { font: "Inter", size: 11 },
});
```

## Live preview

The same document can be painted as HTML for a page instead of as a PDF.
Layout runs once, with PDFKit's measurements, so what the page shows is
where the PDF puts things: the same lines, the same breaks, the same pages.

```ts
import { renderHtml } from "@grandbusta/spyde";

const html = renderHtml(invoiceDocument(data));   // a fragment: one <style>, one <div> per page
```

Drop the fragment into any page. It contains no script and every value is
escaped. Text is one element per line as PDFKit wrapped it, so the browser
never re-wraps; positions are in points, and the page scales with CSS.

For a form that edits a document live, mark the texts that show its fields:

```ts
text(invoice.number, { field: "number" })
```

The HTML carries `data-field="number"` on that element. A page can patch it
in place as the user types, then fetch a fresh fragment after a pause so
wrapping, new rows, and page breaks catch up. `examples/preview` is a
complete server and page doing exactly that; `npm run preview` runs it.

`renderDisplayList` returns the same layout as data, for other painters or
for tests. Glyph shapes come from the browser's fonts, so a preview differs
from the PDF by a hair in letterforms and in nothing else. Register a font
file to have both draw identical glyphs.

## How it works

Two passes. In the first, each box is told how much room it may have, picks
its size within that, and reports back; parents record where their children
sit. In the second, the engine walks the finished tree and issues PDFKit
drawing calls at the computed positions. When a column runs out of page, it
hands back what did not fit and the next page starts with it.

Text is the one place PDFKit does work during layout: it measures strings so
a box is exactly the size of what will be drawn. Everything else is
arithmetic.

## Development

```sh
npm install
npm run build
npm test
npm run example    # writes examples/*.pdf
npm run preview    # live preview server on http://localhost:8787
```

## License

MIT
