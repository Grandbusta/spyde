---
description: "How Spyde breaks a document across pages: columns and tables split, keep and pageBreak give control, box options and alignment on rows and columns."
---

# Pages

A `column` that does not fit continues on the next page, breaking between its children. Everything else moves whole: a `row`, a `padding`, a `background`, a `text`.

## The rules

1. Only a `column` or a `table` splits, and only between children or rows.
2. A `pageBreak` ends the page where it stands.
3. A child that does not fit moves to the top of the next page. `keep` is this rule applied to a wrapper.
4. A table's header repeats on every page it runs onto and is never left alone at the bottom of one.
5. A child that fits nowhere is placed on its own page and clipped. Nothing ever throws for layout reasons.
6. A split column with padding, background, or margin carries the full box on every page fragment.

## keep and pageBreak

```ts
column([
  heading,
  ...rows,
  keep(column([ text("Total due"), text("€280.00") ])),   // never straddles a page
  pageBreak(),
  text("Terms and conditions"),                            // always starts a fresh page
])
```

`keep` also exists as an option on `column` and `table`: `{ keep: true }`.

## Box options

Wrapping a block in `padding`, then `background`, then `padding` again for space above, then `keep`, is four nested calls for one idea. Containers carry those as options instead:

```ts
column([
  row([text("Opening balance"), text("€1200.00")], { justify: "between" }),
  row([text("Closing balance"), text("€1585.00")], { justify: "between" }),
], { gap: 6, padding: 12, background: "#f2f2f2", margin: { top: 24 }, keep: true })
```

- `padding` is space inside, `background` covers the padded box, `margin` is space outside it. Applied in that order, inside to out, the way CSS does.
- These are the same words as the standalone `padding`, `background`, and `keep`. Use the words when you need a different order, for instance a background that does not include the padding.
- `row`, `column`, and `table` take them. `table` takes `background`, `margin`, and `keep` but not `padding`, which on a table is `rowPadding`. Leaves like `text` and `image` do not; wrap those.

## Alignment

`row` and `column` take `align` for the cross axis and `justify` for the main axis, with the same words and values as CSS `align-items` and `justify-content`.

```ts
row(children, { align: "start" | "center" | "end" | "stretch" })      // vertical, in a row
row(children, { justify: "start" | "center" | "end" | "between" })    // horizontal, in a row
```

For a `column` the axes swap. `justify` is ignored when any child is a `fill` or `spacer`, since they already decide the distribution.

## Left and right

```ts
// Two texts at the far edges: split in half, right-align the second.
row([ fill(text("ACME Ltd")), fill(text("Invoice #1042", { align: "right" })) ])

// Both hug their content, a spacer pushes them apart. Better for long text.
row([ text("Date: 14 Sep 2026"), spacer(), text("Due: 14 Oct 2026") ])

// Logo left, address right, bottom edges lined up.
row([
  image("./logo.png", { width: 120 }),
  spacer(),
  column([ text("ACME Ltd"), text("1 Example Street") ], { align: "end" }),
], { align: "end" })
```

## How fill works

A row asks each child how wide it wants to be and places them left to right. `fill` changes the question for that child: instead of asking, the row tells it to take a share of whatever is left after the other children are placed.

<svg viewBox="0 0 640 372" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three rows: without fill the three items hug their content and leave the rest of the row empty; with fill on all three they split the row into equal thirds; with a share of two on the first, it takes half and the others a quarter each." style="max-width: 640px; display: block; margin: 16px 0; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px;">
  <defs>
    <pattern id="left" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" stroke-opacity="0.25" stroke-width="1"/>
    </pattern>
  </defs>
  <g fill="currentColor">
    <text x="0" y="14">row([ text("Item"), text("Qty"), text("Total") ])</text>
    <text x="0" y="138">row([ fill(text("Item")), fill(text("Qty")), fill(text("Total")) ])</text>
    <text x="0" y="262">row([ fill(text("Item"), 2), fill(text("Qty")), fill(text("Total")) ])</text>
  </g>

  <!-- 1. no fill: items hug their content -->
  <g transform="translate(0,26)">
    <rect x="0.5" y="0.5" width="639" height="56" rx="3" fill="none" stroke="currentColor" stroke-opacity="0.35"/>
    <rect x="8" y="10" width="62" height="36" rx="2" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="78" y="10" width="46" height="36" rx="2" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="132" y="10" width="66" height="36" rx="2" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="206" y="10" width="426" height="36" rx="2" fill="url(#left)"/>
    <g fill="currentColor" font-size="13">
      <text x="39" y="33" text-anchor="middle">Item</text>
      <text x="101" y="33" text-anchor="middle">Qty</text>
      <text x="165" y="33" text-anchor="middle">Total</text>
      <text x="419" y="33" text-anchor="middle" fill-opacity="0.6">leftover, unused</text>
    </g>
    <text x="0" y="78" fill="currentColor" fill-opacity="0.7">Each item is as wide as its words. The rest of the row stays empty.</text>
  </g>

  <!-- 2. fill on all three: equal shares -->
  <g transform="translate(0,150)">
    <rect x="0.5" y="0.5" width="639" height="56" rx="3" fill="none" stroke="currentColor" stroke-opacity="0.35"/>
    <rect x="8" y="10" width="206" height="36" rx="2" fill="#8b1e3f" fill-opacity="0.85"/>
    <rect x="218" y="10" width="206" height="36" rx="2" fill="#8b1e3f" fill-opacity="0.85"/>
    <rect x="428" y="10" width="204" height="36" rx="2" fill="#8b1e3f" fill-opacity="0.85"/>
    <g fill="#ffffff" font-size="13">
      <text x="111" y="33" text-anchor="middle">Item · share 1</text>
      <text x="321" y="33" text-anchor="middle">Qty · share 1</text>
      <text x="530" y="33" text-anchor="middle">Total · share 1</text>
    </g>
    <text x="0" y="78" fill="currentColor" fill-opacity="0.7">Three fills, three equal shares: each gets a third of the row.</text>
  </g>

  <!-- 3. weighted: shares 2, 1, 1 -->
  <g transform="translate(0,274)">
    <rect x="0.5" y="0.5" width="639" height="56" rx="3" fill="none" stroke="currentColor" stroke-opacity="0.35"/>
    <rect x="8" y="10" width="310" height="36" rx="2" fill="#8b1e3f" fill-opacity="0.85"/>
    <rect x="322" y="10" width="153" height="36" rx="2" fill="#8b1e3f" fill-opacity="0.85"/>
    <rect x="479" y="10" width="153" height="36" rx="2" fill="#8b1e3f" fill-opacity="0.85"/>
    <g fill="#ffffff" font-size="13">
      <text x="163" y="33" text-anchor="middle">Item · share 2</text>
      <text x="398" y="33" text-anchor="middle">Qty · 1</text>
      <text x="555" y="33" text-anchor="middle">Total · 1</text>
    </g>
    <text x="0" y="78" fill="currentColor" fill-opacity="0.7">Shares 2 + 1 + 1 = 4. Item gets two quarters, the others one each.</text>
  </g>
</svg>

The share is a weight, not a size. Only the ratio matters: shares of 1, 1, 2 give the same layout as 5, 5, 10. A share of 0 keeps the child in the row but gives it no width.

Fill is also what gives text a width to work in. Text inside a `fill` wraps at the fill's edge and can be aligned within it; text sitting directly in a row hugs its words on one line.

`fill` and `spacer` only work as a **direct child** of a `row` or `column`. Wrapped in anything else they do nothing. Put the wrapper inside the fill, not around it: `fill(padding(x, 8))`, not `padding(fill(x), 8)`.

Text inside a `fill` takes the fill's width and wraps; text as a direct child of a `row` hugs its content on one line.
