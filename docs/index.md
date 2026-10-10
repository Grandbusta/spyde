---
layout: home
description: "Spyde is declarative PDF layout on top of PDFKit, for Node and the browser. Describe a document as a tree of functions; it lays out the pages and draws them. No headless browser."
hero:
  name: Spyde
  text: Declarative PDF layout for Node and the browser.
  tagline: Describe a document as a tree of functions. Spyde lays it out, breaks it across pages, and draws it with PDFKit. No headless browser, no coordinates.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Try it
      link: /editor/
      target: _self
    - theme: alt
      text: API
      link: /api
features:
  - title: A small API
    details: text, row, column, table, padding, background and a few more. Every call takes its content first and its settings second, so it reads the way it works.
  - title: Real pages
    details: Columns and tables break across pages. Table headers repeat. Blocks can be kept together. Nothing ever throws for layout reasons.
  - title: One layout, two outputs
    details: The same tree renders as PDF bytes or as an HTML fragment for a live preview, measured with the same numbers, so the page shows where the PDF puts things.
---
