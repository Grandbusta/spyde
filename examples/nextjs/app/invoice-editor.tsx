"use client";
// The browser side. The form is plain React state; the preview is Spyde's
// HTML for that state, laid out again a moment after each change. Adding an
// item means adding it to the state: the new layout moves the totals and
// breaks pages exactly as the PDF will.
import { useEffect, useState } from "react";
import type { Invoice, Item } from "../lib/invoice";
import { sampleInvoice } from "../lib/invoice";

// Spyde and the document load on first use, so the library stays out of the
// first page load and is never run during server rendering. Importing
// lib/invoice statically here would pull the whole library in with it.
const load = () => Promise.all([import("@grandbusta/spyde"), import("../lib/invoice")]);

export function InvoiceEditor() {
  const [data, setData] = useState<Invoice>(sampleInvoice);
  const [html, setHtml] = useState("");
  const [status, setStatus] = useState("loading…");

  useEffect(() => {
    let current = true;   // a layout that finishes after newer data is dropped
    const timer = setTimeout(async () => {
      const [{ renderHtml }, { invoiceDocument }] = await load();
      const started = performance.now();
      const next = renderHtml(invoiceDocument(data));
      if (!current) return;
      setHtml(next);
      setStatus(`laid out in ${Math.round(performance.now() - started)} ms`);
    }, 150);
    return () => { current = false; clearTimeout(timer); };
  }, [data]);

  const setItem = (i: number, patch: Partial<Item>) =>
    setData({ ...data, items: data.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });

  return (
    <main className="layout">
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <label>Invoice number<input value={data.number} onChange={(e) => setData({ ...data, number: e.target.value })} /></label>
        <label>Client<input value={data.client} onChange={(e) => setData({ ...data, client: e.target.value })} /></label>

        <fieldset>
          <legend>Items</legend>
          {data.items.map((it, i) => (
            <div className="item" key={i}>
              <input aria-label="Item" placeholder="Item" value={it.item} onChange={(e) => setItem(i, { item: e.target.value })} />
              <input aria-label="Quantity" type="number" min={0} value={it.qty} onChange={(e) => setItem(i, { qty: Number(e.target.value) })} />
              <input aria-label="Price" type="number" step="0.01" value={it.price} onChange={(e) => setItem(i, { price: Number(e.target.value) })} />
              <button type="button" aria-label="Remove item" onClick={() => setData({ ...data, items: data.items.filter((_, j) => j !== i) })}>×</button>
            </div>
          ))}
          <button type="button" id="add" onClick={() => setData({ ...data, items: [...data.items, { item: "", qty: 1, price: 0 }] })}>
            Add item
          </button>
        </fieldset>

        <div className="actions">
          <button type="button" id="download-browser" onClick={() => downloadInBrowser(data)}>Download (made in the browser)</button>
          <button type="button" id="download-server" onClick={() => downloadFromServer(data)}>Download (made on the server)</button>
        </div>
        <p id="status">{status}</p>
      </form>

      {/* Spyde escapes every value and the fragment holds no script. */}
      <div id="preview" className="preview" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}

async function downloadInBrowser(data: Invoice) {
  const [{ render }, { invoiceDocument }] = await load();
  save(await render(invoiceDocument(data)), `invoice-${data.number}.pdf`);
}

async function downloadFromServer(data: Invoice) {
  const res = await fetch("/api/invoice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  save(new Uint8Array(await res.arrayBuffer()), `invoice-${data.number}.pdf`);
}

function save(bytes: Uint8Array<ArrayBuffer>, name: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
