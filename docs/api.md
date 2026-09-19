---
description: "Every Spyde function and its settings: leaves, containers, wrappers, and the three outputs render, renderHtml, and renderDisplayList."
---

# API

Every function takes its content first and its settings second.

## Leaves

| Function | What it does |
|---|---|
| `text(content, style?)` | Puts a string on the page. Style: `font`, `size`, `color`, `lineHeight`, `align`, `field`. |
| `image(src, { width?, height? })` | PNG or JPEG from a path or bytes. Aspect ratio always kept. |
| `divider({ color?, thickness? })` | A line across the width in a column, the height in a row. Defaults `#cccccc`, 1. |
| `spacer()` | Takes leftover space and draws nothing. |
| `pageBreak()` | Starts a new page here. |

## Containers

| Function | What it does |
|---|---|
| `row(children, options?)` | Places things side by side. |
| `column(children, options?)` | Stacks things top to bottom. The one container that splits across pages. |
| `table(rows, options)` | Rows and columns of cells with a header that repeats on every page. See [Tables](/guide/tables). |

Row and column options: `gap`, `align`, `justify`, `padding`, `background`, `margin`; `column` also takes `keep`.

## Wrappers

| Function | What it does |
|---|---|
| `padding(child, insets)` | Space around something. Insets: a number, `{ x, y }`, or `{ top, right, bottom, left }`. |
| `background(child, color)` | A colour behind something, sized to it. |
| `fill(child, share?)` | Take a share of the leftover in a row or column. Must be a direct child. Default share 1. |
| `width(child, points)`, `height(child, points)` | Exactly this wide or tall on one axis; the other passes through. |
| `keep(child)` | Never split; moves whole to the next page if it does not fit. |

## Outputs

| Function | What it does |
|---|---|
| `render(tree, options?)` | PDF bytes as a `Uint8Array`. Options: `size`, `margins`, `fonts`, `defaultStyle`. |
| `renderHtml(tree, options?)` | The same layout as an HTML fragment. Adds `imageSrc`, `classPrefix`, `stylesheet`, `pretty`. See [Live preview](/guide/live-preview). |
| `renderDisplayList(tree, options?)` | The same layout as data: pages of `text`, `rect`, `image`, and `clip` ops. |

## Types

`Node`, `TextStyle`, `Insets`, `FlexOptions`, `BoxOptions`, `Align`, `Justify`, `TableOptions`, `TableColumn`, `CellValue`, `RowAppearance`, `ImageOptions`, `DividerOptions`, `RenderOptions`, `HtmlOptions`, `PageSize`, `DisplayList`, `Page`, `Op`, `Size`, `Offset`, `Rect`.

Bytes in and out are `Uint8Array`. A Node `Buffer` is accepted anywhere bytes are.
