# Spyde in Next.js

An invoice form with a live preview and two ways to get the PDF: made in the
browser, or made by a route handler on the server. One document function,
`lib/invoice.ts`, serves both.

```sh
npm run build          # in the repository root first: the example uses the local build
cd examples/nextjs
npm install
npm run dev            # http://localhost:3000
```

## Where things are

| File | What it does |
|---|---|
| `lib/invoice.ts` | The document: `invoiceDocument(data)` returns the tree. Imported on both sides. |
| `app/invoice-editor.tsx` | Client component. Form state, the preview (`renderHtml` 150 ms after the last change), and the browser download (`render`). |
| `app/api/invoice/route.ts` | Route handler. The same document rendered with the Node build and returned as `application/pdf`. |

## What to copy into your own app

- **No Next.js configuration is needed.** Next gives client code Spyde's browser
  build and server code the Node build. That was checked with Turbopack and
  webpack, in `next dev` and `next build`. The `turbopack.root` in
  `next.config.mjs` is there only because this example links the library from
  the repository; an app that installs it from npm does not need it.
- **Load Spyde on first use in client components**: `await import("@grandbusta/spyde")`
  inside the effect or handler, and only `import type` at the top of the file.
  That keeps it out of the first page load and out of server rendering.
- **Adding an item is a state change.** Put it in the data; the next layout
  moves the totals and breaks pages the way the PDF will. Never edit the
  preview's HTML.
- **Route handlers use the Node runtime** (`export const runtime = "nodejs"`).
- **Images and fonts**: bytes (`Uint8Array`) in the browser; on the server, a
  path such as `path.join(process.cwd(), "public/logo.png")` also works.
