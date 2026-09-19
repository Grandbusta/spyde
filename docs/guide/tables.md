---
description: "Spyde tables take plain data. Columns say which field to show, how to format it, its width and alignment; the header repeats on every page."
---

# Tables

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

## Columns

- `key` reads a field of the row. Strings and numbers become text; a node is used as-is.
- `format` turns the value into what is shown: `(value, row) => string | number | Node`. Return a node for anything richer than text, like a coloured box or an image. With `format` alone and no `key`, the column is computed from the whole row.
- `label` is the text shown in the header row. No `label` on any column means no header row.
- `width` is exact points; `share` is a share of the leftover (default 1). `align` applies to the header and to text cells.
- `style` is a text style for the column's body cells; `background` paints behind the column, header included.

## Three appearance groups and a grid

```ts
table(entries, {
  columns: [...],
  header: { style: { color: "#333" }, background: "#f2f2f2" },   // the header row
  row: (entry, i) => ({                                            // each body row, from the data
    background: i % 2 ? "#f7f7f7" : undefined,
    style: entry.overdue ? { color: "#c00" } : undefined,
  }),
  cell: { style: { size: 10 }, padding: { y: 5 } },               // defaults for every cell
  rowPadding: { x: 12 },                                           // the grid all rows share
  gap: 8,
  rowGap: 0,
})
```

`header`, `row`, and `cell` say how things look. `row` is a function because there are many rows. `rowPadding`, `gap`, and `rowGap` define the grid every row shares, so columns can never drift.

**Precedence.** Text style resolves most specific first: a node from `format`, then the column's `style`, then the row's, then `cell.style`. Backgrounds layer: the row's is painted across the row, the column's over its cells, then the cell's own.

## Row padding and cell padding

- `rowPadding` is space **around each row**. The header band and any row background extend to the full width, and the cells sit as a block inside, inset from the edge.
- `cell.padding` is space **inside each cell**. Column and cell backgrounds fill the padded cell, so a coloured column runs top to bottom instead of hugging its text.

Most tables want both: `rowPadding: { x: 12 }` for the inset and `cell: { padding: { y: 6 } }` for room inside the cells.

## Pages

The header repeats at the top of every page the table runs onto, and is never left alone at the bottom of a page. Rows never split; a row taller than a page gets its own page.

## What a table is not

There is no colspan, rowspan, or nested table, and there never will be. A table is sugar over `column`, `row`, and `fill`. Anything it cannot express, write with those.
