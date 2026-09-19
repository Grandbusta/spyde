---
description: "Render the same Spyde layout as an HTML fragment for a live preview that matches the PDF line for line, with data-field hooks for forms."
---

# Live preview

The same document can be painted as HTML for a page instead of as a PDF. Layout runs once, with PDFKit's measurements, so what the page shows is where the PDF puts things: the same lines, the same breaks, the same pages.

```ts
import { renderHtml } from "@grandbusta/spyde";

const html = renderHtml(invoiceDocument(data));   // a fragment: one <style>, one <div> per page
```

## A small example

Two texts on a grey background, on a 220 by 110 point page:

```ts
const doc = column([
  text("Invoice #1042", { font: "Helvetica-Bold", size: 14, field: "number" }),
  text("Thanks for your business.", { color: "#666666" }),
], { gap: 4, padding: 8, background: "#f2f2f2" });

renderHtml(doc, { size: [220, 110], margins: 10, pretty: true });
```

This is the exact output, 1.1 KB. `pretty` adds the indentation; without it the same markup comes back on fewer lines.

```html
<style>
.spyde-page{position:relative;overflow:hidden;background:#fff}
.spyde-text{position:absolute;overflow:hidden;white-space:nowrap}
.spyde-rect,.spyde-image,.spyde-clip{position:absolute}
.spyde-clip{overflow:hidden}
.spyde-image{display:block}
.spyde-s1{font-family:Helvetica, Arial, sans-serif;font-weight:bold;font-style:normal;font-size:14pt;line-height:16.8pt;color:#000000;text-align:left}
.spyde-s2{font-family:Helvetica, Arial, sans-serif;font-weight:normal;font-style:normal;font-size:12pt;line-height:14.4pt;color:#666666;text-align:left}
</style>
<div class="spyde-page" data-page="1" style="width:220pt;height:110pt">
  <div class="spyde-clip" style="left:10pt;top:10pt;width:200pt;height:90pt">
    <div class="spyde-rect" style="left:0pt;top:0pt;width:200pt;height:51.2pt;background:#f2f2f2"></div>
    <div class="spyde-text spyde-s1" data-field="number" style="left:8pt;top:8pt;width:184pt;height:16.8pt">
      <div>Invoice #1042</div>
    </div>
    <div class="spyde-text spyde-s2" style="left:8pt;top:28.8pt;width:184pt;height:14.4pt">
      <div>Thanks for your business.</div>
    </div>
  </div>
</div>
```

Reading it: one style class per distinct text style, the page, the margin clip, the background as a rect, then each text with its lines. Every number is a point from the layout pass. The first text carries `data-field="number"` because its style set `field`.

## The fragment

- One `<style>` block first, with the fixed rules and one generated class per distinct text style in the document. Omit it with `stylesheet: "none"`.
- Then one positioned `<div>` per page. Every element carries its class names and inline geometry in points, one to one with the layout.
- A text is a box with one block per line as PDFKit wrapped it, with wrapping off. The browser never re-wraps.
- Every value is escaped. The fragment contains no script. Drop it into any page with `innerHTML`.
- Images are data URIs by default, or whatever `imageSrc(src)` returns. Map them to URLs in a real app so the browser can cache them.
- `pretty: true` indents the output for reading. `classPrefix` changes the `spyde-` prefix.

What matches the PDF: lines, wrapping widths, alignment, page breaks, every box position. What does not: glyph shapes, which come from the browser's fonts. Register a font file to have both draw identical glyphs.

## Fields

Mark the texts that show a form's fields:

```ts
text(invoice.number, { field: "number" })
```

The HTML carries `data-field="number"` on that element, so a page can find the element that shows a given value. The PDF ignores it.

`examples/preview` in the repository is a complete `node:http` server and page that renders a form's data as HTML on one route and as a PDF on another. `npm run preview` runs it.

## The layout as data

`renderDisplayList(tree, options)` returns the same layout as data: pages of `text`, `rect`, `image`, and `clip` ops with absolute positions. It is what the HTML painter consumes, and it is public for other painters and for tests that want to inspect a layout without producing a PDF.
