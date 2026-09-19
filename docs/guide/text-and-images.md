---
description: "Text styles, PDFKit's built-in fonts, registering your own font, images that keep their aspect ratio, and the render options."
---

# Text, fonts, images

## Text

```ts
text("Hello", { font: "Helvetica-Bold", size: 14, color: "#333", lineHeight: 1.3, align: "center" })
```

| Setting | Meaning | Default |
|---|---|---|
| `font` | A built-in name or a name registered in render options | `Helvetica` |
| `size` | Points | 12 |
| `color` | Any colour string PDFKit accepts | `#000000` |
| `lineHeight` | Multiplier of size | 1.2 |
| `align` | `left`, `center`, `right` | `left` |
| `field` | Names the data field this text shows, for the live preview | none |

Text in a column takes the full width and wraps, like a paragraph, so `align` works. Text in a row that is not inside a `fill` hugs its content on one line. Newlines in the string start new lines.

## Fonts

PDFKit's fourteen built-in fonts need no font file: Helvetica, Times-Roman, and Courier, each in regular, bold, italic and bold-italic, plus Symbol and ZapfDingbats. Bold and italic are separate names: `Helvetica-Bold`, `Times-Italic`.

To use your own, register it once at render time and refer to it by name:

```ts
await render(doc, {
  fonts: { Inter: "./fonts/Inter-Regular.ttf" },   // path or bytes, TTF or OTF
  defaultStyle: { font: "Inter", size: 11 },        // applied to every text node
});
```

Style resolves field by field: the node's own style, then `defaultStyle`, then the library defaults. An unknown font name is an error with the fix in the message.

The built-in fonts cover Latin-1. Anything beyond that, including most symbols and non-Latin scripts, needs a registered font file.

## Images

PNG or JPEG, from a path or bytes. Give a `width`, a `height`, both, or neither; the aspect ratio is always kept.

```ts
image("./logo.png", { width: 120 })                 // height follows
image(bytes, { height: 40 })                        // width follows
image("./photo.jpg", { width: 200, height: 200 })   // fits inside the box, top-left
image("./photo.jpg")                                // natural size, shrunk to fit the column
```

## Render options

```ts
render(tree, {
  size: "A4",                 // or "LETTER", any PDFKit preset, or [width, height] in points
  margins: 40,                // or { x, y } or { top, right, bottom, left }
  fonts: { ... },
  defaultStyle: { ... },
})
```

All numbers are PDF points, 1/72 inch.

## Overflow

Spyde never throws for content that does not fit. A box that needs more room than it has takes what it has and clips the rest. You see the cut-off and adjust.
