---
description: "Rules for writing Spyde code with an AI coding assistant: the conventions a model gets wrong without being told, in a block you can paste into your own agent instructions."
---

# Using Spyde with an AI assistant

Spyde's API is small and reads like English, which suits language models well. A few conventions are not guessable from the names, and an assistant that does not know them writes code that runs but lays out wrong. The block below states them. Paste it into your project's agent instructions, whatever file your tool reads: `AGENTS.md`, `CLAUDE.md`, a Cursor rules file.

The whole documentation is also available as one file for models at [/llms-full.txt](/llms-full.txt), with an index at [/llms.txt](/llms.txt).

## Check the tree before rendering

`validate(tree)` returns the mistakes that would otherwise render silently wrong, each with a path into the tree and a message that says what to change. An assistant can run it, read the findings, and fix its own document:

```ts
import { validate, render } from "@grandbusta/spyde";

const problems = validate(doc, { fonts });
if (problems.length) console.log(problems);
// [{ level: "error", path: "column > row[0] > padding[0] > fill",
//    message: "fill() has no effect here: it must be a direct child of a row or column. ..." }]
const pdf = await render(doc, { fonts });
```

```md
## Spyde (@grandbusta/spyde)

Declarative PDF layout for Node on PDFKit. A document is a tree of function calls.
Never compute coordinates; describe boxes and let layout place them.

Rules:
- Every function takes its content first and its settings second:
  text("Hi", { size: 14 }), padding(child, 8), row([a, b], { gap: 8 }).
- fill(child, share?) and spacer() only work as DIRECT children of row or column.
  Wrap inside the fill, not around it: fill(padding(x, 8)), never padding(fill(x), 8).
- Text directly in a row hugs its content on one line and can be clipped.
  Text inside a fill (or in a column) takes the width and wraps. Give long text a fill.
- row/column options: gap, align (cross axis), justify (main axis, CSS values),
  padding, background, margin (applied inside to out), keep (column only).
  justify is ignored when any child is a fill or spacer.
- table(rows, { columns }) takes plain data objects, never arrays of nodes.
  A column is { label?, key?, format?(value, row), width? | share?, align?, style?, background? }.
  Appearance: header { style, background }, row: (data, i) => ({ style, background }),
  cell { style, padding }. Grid: rowPadding, gap, rowGap. No colspan or rowspan.
- Only column and table split across pages. Everything else moves whole.
  keep(child) or { keep: true } prevents splitting; pageBreak() forces a new page.
- Nothing throws for layout reasons. Overflowing content is clipped, so check output.
- Bold and italic are font names: "Helvetica-Bold", "Times-Italic". Custom fonts are
  registered in render options: fonts: { Inter: "./Inter.ttf" }.
- render(tree, options?) returns a Uint8Array. renderHtml(tree, options?) returns an
  HTML fragment of the same layout. Sizes are in PDF points.
- Prefer box options over nested wrappers:
  column([...], { padding: 12, background: "#f2f2f2", margin: { top: 24 }, keep: true }).
- Run validate(doc, { fonts }) before render and fix every finding it returns.

Minimal example:
  const doc = column([
    row([fill(text("ACME Ltd", { size: 20, font: "Helvetica-Bold" })),
         fill(text("Invoice #1042", { align: "right" }))]),
    table(items, { columns: [
      { label: "Item", key: "item", share: 2 },
      { label: "Total", key: "total", align: "right", format: money },
    ] }),
  ], { gap: 8 });
  const pdf = await render(doc);
```
