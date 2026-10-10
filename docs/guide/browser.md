---
description: "Run Spyde in a web page: the same API through a bundler or one CDN file, PDF bytes and live HTML made in the visitor's own tab, fonts and images passed as bytes."
---

# In the browser

Spyde runs in a web page as well as in Node. The layout, the PDF, and the HTML preview are made in the visitor's own tab, so nothing is sent to a server. The API is the same. The one difference: there are no file paths in a browser, so fonts and images are passed as bytes.

## With a bundler

Install the package as usual and import it the same way:

```ts
import { render, renderHtml, column, text } from "@grandbusta/spyde";
```

Vite, webpack, esbuild, and other bundlers that honour the `browser` export condition pick the browser build on their own, along with PDFKit's browser build and its standard fonts. There is nothing to configure.

## Without a bundler

`dist/spyde.browser.js` is the whole library in one file, with PDFKit and the standard fonts inside it and nothing else to fetch. Any CDN that serves npm files can serve it to a plain `<script type="module">`:

```html
<div id="preview"></div>
<button id="download">Download PDF</button>

<script type="module">
  import { render, renderHtml, column, row, text, fill } from "https://cdn.jsdelivr.net/npm/@grandbusta/spyde@0.3.0/dist/spyde.browser.js";

  const doc = column([
    row([
      fill(text("ACME Ltd", { size: 20, font: "Helvetica-Bold" })),
      text("Invoice #1042"),
    ]),
    text("Thanks for your business."),
  ], { gap: 12 });

  // The live view: the same layout as the PDF, as HTML.
  document.getElementById("preview").innerHTML = renderHtml(doc);

  // The file: real PDF bytes, saved through a temporary link.
  document.getElementById("download").onclick = async () => {
    const bytes = await render(doc);
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    Object.assign(document.createElement("a"), { href: url, download: "invoice.pdf" }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
</script>
```

Pin the version in the URL, as above, so a later release never changes a page under you.

## In Next.js

Nothing to configure. Next gives client components the browser build and route handlers the Node build, with both Turbopack and webpack. Write the document once and import it on both sides:

```tsx
"use client";
import { useEffect, useState } from "react";
import type { Invoice } from "@/lib/invoice";

// Load on first use: keeps Spyde out of the first page load and out of server rendering.
const load = () => Promise.all([import("@grandbusta/spyde"), import("@/lib/invoice")]);

export function InvoicePreview({ data }: { data: Invoice }) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    let current = true;
    const timer = setTimeout(async () => {
      const [{ renderHtml }, { invoiceDocument }] = await load();
      if (current) setHtml(renderHtml(invoiceDocument(data)));
    }, 150);
    return () => { current = false; clearTimeout(timer); };
  }, [data]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

Import only the type at the top of the file. A plain `import` of the document module there would bring the whole library into the first page load.

For a PDF made on the server, a route handler returns the bytes directly:

```ts
// app/api/invoice/route.ts
import { render } from "@grandbusta/spyde";
import { invoiceDocument, type Invoice } from "@/lib/invoice";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const data = (await req.json()) as Invoice;
  return new Response(await render(invoiceDocument(data)), { headers: { "content-type": "application/pdf" } });
}
```

`examples/nextjs` in the repository is the complete app: a form with items, the live preview, and a download made either way.

## Fonts and images are bytes

A string path throws in the browser, with a message saying what to do. Fetch the file and pass a `Uint8Array`:

```ts
import { render, column, image, text } from "@grandbusta/spyde";

const bytes = async (url: string) => new Uint8Array(await (await fetch(url)).arrayBuffer());

const logo = await bytes("/logo.png");
const inter = await bytes("/fonts/Inter-Regular.ttf");

const pdf = await render(column([image(logo, { width: 80 }), text("Hello", { font: "Inter" })]), {
  fonts: { Inter: inter },
});
```

The fourteen standard PDF fonts (Helvetica, Times-Roman, Courier and their bold and italic faces, Symbol, ZapfDingbats) are built in, so a document that uses only those needs no font files at all.

For the HTML preview, images become data URIs by default. On a real page, map them to URLs the browser can cache with `renderHtml(doc, { imageSrc })`. See [Live preview](/guide/live-preview).

## Keeping the page responsive

Layout and rendering run on whatever thread calls them. A one-page invoice takes a few milliseconds, but a long statement re-rendered on every keystroke can make typing stutter. For live editing, run Spyde in a Web Worker: post the data in, get the HTML string or the PDF bytes back, and wait about 150 ms after the last keystroke before asking. The [editor](/guide/editor) works this way.

## Size

The browser build is about 600 KB minified and 230 KB gzipped. Spyde's own code is about 25 KB of that. Most of the rest is PDFKit and the code it uses to embed custom fonts, which PDFKit's browser build always includes, even for documents that use only the standard fonts. The standard fonts themselves are about 40 KB.

That is a fair price for a page whose purpose is making documents, and too much for a page that makes one now and then. There, load it when it is needed with `await import(...)`, or render on the server with the Node build.
