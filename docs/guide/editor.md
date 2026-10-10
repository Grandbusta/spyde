---
description: "The Spyde editor: write a template in TypeScript, give it sample data, and see the document as you type. Runs entirely in your browser."
---

# Editor

<a href="/spyde/editor/" target="_self">Open the editor</a>

The editor is a page for writing Spyde documents and seeing them as you type. The template is on the left, sample data below it, and the document on the right. It runs entirely in your browser: your code and data are never uploaded.

## A template

A template is a function of data that returns a tree, the same shape you would write in your own project:

```ts
import { column, row, text, fill, table } from "@grandbusta/spyde";

type Invoice = { number: string; items: { item: string; total: number }[] };

export default (data: Invoice) =>
  column([
    row([fill(text("ACME Ltd", { size: 20, font: "Helvetica-Bold" })), text("Invoice #" + data.number)]),
    table(data.items, { columns: [{ label: "Item", key: "item" }, { label: "Total", key: "total", align: "right" }] }),
  ], { gap: 8 });
```

The data pane holds JSON, and it is passed to the function as `data`. To set render options such as the page size or a default text style, export them too:

```ts
export const options = { size: "LETTER", defaultStyle: { size: 10 } };
```

The editor knows Spyde's types, so completions and type errors appear as you write.

## What you see

- **Preview** shows the document as HTML. It is laid out by the same code as the PDF, so the lines, page breaks, and positions match it. It updates a moment after you stop typing.
- **PDF** shows the real PDF bytes in the browser's own viewer. **Download** saves them.
- Under the editors: type errors, errors thrown by the template, and everything [`validate`](/api#checking) finds, each with its path into the tree. Click a type error to jump to it.

A template that loops forever is stopped after five seconds, and the editor carries on.

## Sharing

**Share** copies a link that holds the template and the data, compressed into the part of the URL after `#`. That part never reaches a server, so the link itself is the only copy. Opening it shows exactly what you had. **Copy** puts the template on the clipboard, ready to paste into a project.

## Limits

There are no files in the editor, so an `image` or a font given as a file path fails with an error that says so. The examples use a text logo for that reason. In your own page, fetch the file and pass its bytes: see [In the browser](/guide/browser).
