# Spyde

Declarative PDF layout for Node, on top of PDFKit. No browser.

Describe a document as a tree of boxes. Spyde works out where everything goes and
draws it with PDFKit. You never type an x or a y.

```ts
import { render, column, row, text, padding, fill, background } from "@grandbusta/spyde";

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

const pdf = await render(doc);          // Buffer
```

## Why

Generating PDFs in Node forces a choice today.

- **Raw PDFKit** is fast and small, but you place every element by hand. Change
  one thing and the arithmetic below it breaks.
- **Headless Chromium** (Puppeteer and friends) lays out beautifully, but you
  ship a browser to print a receipt: slow cold starts, hundreds of megabytes,
  pain in serverless.
- **react-pdf** ties you to React and JSX. **pdfmake** uses a document
  definition object rather than composition.

Spyde is the middle: a small layout engine that turns a tree of boxes into
PDFKit drawing calls. Same speed class and footprint as PDFKit, with a
declarative API and no framework.

| | Layout model | Browser | Footprint | Lock-in |
|---|---|---|---|---|
| Raw PDFKit | Manual x / y | No | Small | None |
| Puppeteer | Full CSS | Yes | Heavy | None |
| react-pdf | JSX + flexbox | No | Medium | React |
| pdfmake | Definition object | No | Medium | None |
| **Spyde** | Composition + constraints | No | Small | None |

## Install (Coming soon)

```sh
npm install @grandbusta/spyde
```

PDFKit comes with it. Node 20 or newer. TypeScript types are included.

## The vocabulary

Six words. That is the whole API.

| Word | What it does |
|---|---|
| `text` | Puts a string on the page |
| `padding` | Adds empty space around something |
| `background` | Paints a color behind something |
| `row` | Places things side by side |
| `column` | Stacks things top to bottom |
| `fill` | Makes something take the leftover space in its row or column |

Every word follows one rule: **content first, settings second.** Read any line
aloud and it describes itself. `padding(text("Hi"), 8)` is "pad this text by 8".

```ts
text(content: string, style?: TextStyle)
padding(child, insets: number | { x?, y? } | { top?, right?, bottom?, left? })
background(child, color: string)
fill(child, share?: number)              // share defaults to 1
row(children: Node[], { gap?: number })
column(children: Node[], { gap?: number })
```

### How `fill` works

By default an item in a row is only as wide as its content. `fill` says "take
whatever is left over." Several fills split the leftover evenly; the share
number changes the split.

```
row([ text("Item"), text("Qty"), text("Total") ])
|Item|Qty|Total|                                  hugs content

row([ fill(text("Item")), fill(text("Qty")), fill(text("Total")) ])
|Item        |Qty         |Total       |          split evenly

row([ fill(text("Item"), 2), fill(text("Qty")), fill(text("Total")) ])
|Item                |Qty      |Total     |       Item gets twice the share
```

## Text and fonts

```ts
interface TextStyle {
  font?: string;        // "Helvetica" (default), any built-in, or a registered name
  size?: number;        // points, default 12
  color?: string;       // any color string PDFKit accepts, default "#000000"
  lineHeight?: number;  // multiplier of size, default 1.2
  align?: "left" | "center" | "right";
}
```

The fourteen PDFKit built-in fonts need no font file: Helvetica, Times-Roman,
Courier, each in regular, bold, italic and bold-italic, plus Symbol and
ZapfDingbats. To use your own, register it once at render time and refer to
it by name:

```ts
await render(doc, {
  fonts: { Inter: "./fonts/Inter-Regular.ttf" },   // path or Buffer, TTF or OTF
  defaultStyle: { font: "Inter", size: 11 },        // applied to every text node
});
```

Style resolves field by field: the node's own style, then `defaultStyle`, then
the library defaults. An unknown font name is an error with the fix in the
message.

Text in a column takes the full width and wraps, like a paragraph, so `align`
works. Text in a row that is not inside a `fill` hugs its content on one line.

## Render options

```ts
interface RenderOptions {
  size?: "A4" | "LETTER" | string | [width: number, height: number];  // default "A4"
  margins?: number | { x?, y? } | { top?, right?, bottom?, left? };   // default 40
  fonts?: Record<string, string | Buffer>;
  defaultStyle?: TextStyle;
}

render(tree, options?): Promise<Buffer>
```

All numbers are PDF points (1/72 inch).

## Overflow

Spyde never throws for content that does not fit. A box that needs more room
than it has takes what it has and clips the rest. You see the cut-off and
adjust.

## Current scope

This is the first milestone: a single-page layout engine with the six nodes
above. It is complete and tested for that scope.

Not yet:

- **Pagination.** Content taller than one page is clipped. Breaking a tree
  across pages, with keep-together and break-before, is the next milestone
  and the main reason this project exists.
- **Alignment.** Children sit at the top-left of their row or column. No
  centering, no stretch.
- **Fixed sizing, borders, tables, images.**
- **Streaming output.** `render` returns a Buffer.

Spyde is not an HTML or CSS engine and does not try to match browser
rendering. It is not a PDF viewer, parser, or editor.

## How it works

Two passes. In **layout**, constraints (min and max width and height) flow
down the tree; each box picks its size within them and reports it up; each
parent records where its children sit. In **paint**, the engine walks the
resolved tree and issues PDFKit drawing calls at the computed positions.

Text is the one place PDFKit does work during layout: it measures strings so a
text box's size matches exactly what will be drawn. Everything else is pure
arithmetic and is tested without generating a PDF. PDFKit is reached through a
small interface, so the backend is swappable.

## Development

```sh
npm install
npm run build      # tsc -> dist/
npm test           # node --test against compiled sources
npm run example    # writes examples/invoice.pdf
```

Dependencies: `pdfkit` at runtime, `typescript` and two type packages for
development. Nothing else.

## License

MIT
