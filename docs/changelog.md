---
description: "What changed in each Spyde release, including the breaking changes in 0.2.0: Uint8Array output and multi-page documents."
---

# Changelog

## 0.2.1

- `validate(tree, options?)`: reports the mistakes that render silently wrong, with a path into the tree and a fix in each message. Checks fill and spacer placement, `justify` alongside a fill, table keys that no row has (with a suggestion), empty columns, unregistered fonts, long text directly in a row, and `padding` on a table. Never throws, never renders.
- Documentation site at https://grandbusta.github.io/spyde/, with `llms.txt` and `llms-full.txt` for AI assistants and a page of rules for writing Spyde with one.
- README shortened to install, one example, and a pointer to the documentation.
- The raw PDFKit comparison example was removed from the repository.

## 0.2.0

Documents are no longer limited to one page.

**Breaking**

- `render` returns `Uint8Array` instead of `Buffer`. Files, responses, and uploads accept it unchanged; `Buffer.from(pdf)` wraps it if a Node-only method is needed.
- Tall content produces more pages. A root `column` now continues onto further pages instead of being clipped to one.

**New**

- Pagination: columns and tables break across pages; `keep`, `pageBreak`; table headers repeat and are never orphaned.
- `image`, `spacer`, `divider`, `width`, `height`, `table`.
- `align` and `justify` on `row` and `column`; `padding`, `background`, `margin` as container options; `keep` as an option on `column` and `table`.
- `renderHtml` and `renderDisplayList`; `field` on text styles; the live preview example.
- Pagination is a single pass; text measurement is memoised. A 2000-row statement went from 888 ms to 84 ms.
- A text with a line height tighter than the font's natural spacing now draws every line.

## 0.1.1

README updates.

## 0.1.0

First release: the single-page engine with `text`, `padding`, `background`, `fill`, `row`, `column`, and `render`.
