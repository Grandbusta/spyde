// Live preview server. No framework: node:http only.
//   GET  /             the editor page, with the sample invoice already rendered into it
//   GET  /app.js       the page's own JavaScript: form handling and fetches
//   POST /preview      JSON invoice in, HTML fragment out (renderHtml)
//   POST /invoice.pdf  JSON invoice in, PDF bytes out (render)
// Run:  npm run preview   then open http://localhost:8787
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { render, renderHtml } from "../../src/index.js";
import { type Invoice, invoiceDocument, sampleInvoice } from "./invoice.js";

const PORT = Number(process.env.PORT ?? 8787);
const SRC = new URL("../../../examples/preview/", import.meta.url);   // source folder, not the compiled one

function readJson(req: import("node:http").IncomingMessage): Promise<Invoice> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      try { resolve(normalise(JSON.parse(Buffer.concat(chunks).toString("utf8")))); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

/** Trust nothing from the browser: coerce every field to the shape the document expects. */
function normalise(raw: unknown): Invoice {
  const r = (raw ?? {}) as Record<string, unknown>;
  const client = (r.client ?? {}) as Record<string, unknown>;
  const items = Array.isArray(r.items) ? r.items : [];
  return {
    number: String(r.number ?? ""),
    date: String(r.date ?? ""),
    client: { name: String(client.name ?? ""), address: String(client.address ?? "") },
    items: items.slice(0, 200).map((it) => {
      const i = (it ?? {}) as Record<string, unknown>;
      return { item: String(i.item ?? ""), qty: Number(i.qty) || 0, price: Number(i.price) || 0 };
    }),
    notes: String(r.notes ?? ""),
  };
}

createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
      const sample = JSON.stringify(sampleInvoice).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      const page = (await readFile(new URL("index.html", SRC), "utf8"))
        .replace("__SAMPLE__", sample)
        .replace("__PREVIEW__", renderHtml(invoiceDocument(sampleInvoice),{pretty:true}));
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page);
    } else if (req.method === "GET" && req.url === "/app.js") {
      res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }).end(await readFile(new URL("app.js", SRC), "utf8"));
    } else if (req.method === "POST" && req.url === "/preview") {
      const html = renderHtml(invoiceDocument(await readJson(req)));
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(html);
    } else if (req.method === "POST" && req.url === "/invoice.pdf") {
      const pdf = await render(invoiceDocument(await readJson(req)));
      res.writeHead(200, { "content-type": "application/pdf", "content-disposition": 'attachment; filename="invoice.pdf"' }).end(pdf);
    } else {
      res.writeHead(404).end("not found");
    }
  } catch (err) {
    res.writeHead(500, { "content-type": "text/plain" }).end(String(err));
  }
}).listen(PORT, () => console.log(`preview: http://localhost:${PORT}`));
