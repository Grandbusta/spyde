---
description: "Measured generation times for Spyde against raw PDFKit: a 67-page statement in 84 ms, and why a headless browser is ten to fifty times slower."
---

# Performance

PDFKit is the floor. Spyde ends by issuing the same drawing calls, so it cannot be faster than raw PDFKit; it adds a layout pass. The comparison that matters is with a headless browser, which is ten to fifty times slower on the same documents.

Measured on one core, warm, median of several runs, Node 20, pdfkit 0.20:

| Workload | Spyde | Raw PDFKit by hand |
|---|---|---|
| Invoice, 10 rows, 1 page | 0.7 ms | 0.5 ms |
| Statement, 2000 rows, 67 pages | 84 ms | 48 ms |
| Statement, 5000 rows | 216 ms | 104 ms |
| Loading PDFKit, cold | ~50 ms | ~50 ms |

The raw version assumes a fixed row height and never measures; Spyde measures every cell, which is what lets a long description wrap instead of overflow. That is where the difference goes.

Pagination is a single pass over the document with a shared row-height cache, and text measurement is memoised per render. A 2000-row table renders about ten times faster than in 0.1.x.

These figures come from ad hoc runs; a repeatable benchmark harness with raw PDFKit, react-pdf, and Puppeteer alongside is planned, and this page will quote its output.
