---
description: "Spyde's two-pass layout: constraints down, sizes up, then paint through one interface with a PDFKit painter and a recorder for HTML."
---

# How it works

Two passes.

In the **layout** pass, constraints flow down the tree: each box is told the smallest and largest size it may be. It lays out its children, picks its own size within the bounds, and reports it back up. Parents record where their children sit. When a column runs out of page, it hands back the children that did not fit, and the next page starts with them.

In the **paint** pass, the engine walks the finished tree and issues drawing calls at the computed positions. Painting goes through a small interface with two implementations: PDFKit, which draws the PDF, and a recorder, which writes the calls down as data. The HTML preview is that recording painted a second way.

Text is the one place PDFKit does work during layout: it measures strings so a box is exactly the size of what will be drawn, and it hands back the lines it wrapped, which is what the HTML painter draws one by one. Everything else is arithmetic, and is tested without producing a PDF.

## Two kinds of function

**Primitives** are boxes: `text`, `padding`, `background`, `row`, `column`, `fill`, and the rest. Each does one thing to one box, you nest them by hand, and the tree you write is the tree laid out.

**Generators** build a subtree from data plus a recipe. `table` is the one so far. Its options are not the styling of a single box; they describe how to make many. Four rules keep a generator honest: it adds no layout capability you could not get by hand, its recipe uses the primitives' words, appearance goes in groups while geometry goes on the generator, and there is always a way back to composition, which for `table` is a `format` that returns a node.

## Against the alternatives

Raw PDFKit is fast and small, but you place every element by hand and fix all the coordinates when anything changes. A headless browser lays out beautifully but ships Chromium to print a receipt. Spyde is the middle: PDFKit's speed and footprint with a declarative API and no framework. It cannot be faster than PDFKit, since it ends by issuing the same drawing calls; see [Performance](/performance) for the measured gap.
