// The document, written once. The page imports it in the browser for the live
// preview and the browser download; the route handler imports it on the
// server. Both get the same layout because both run the same code.
import { column, row, text, fill, table } from "@grandbusta/spyde";

export interface Item {
  item: string;
  qty: number;
  price: number;
}

export interface Invoice {
  number: string;
  client: string;
  items: Item[];
}

const money = (n: number) => `€${n.toFixed(2)}`;

export function invoiceDocument(data: Invoice) {
  const rows = data.items.map((i) => ({ ...i, total: i.qty * i.price }));
  return column([
    row([
      fill(text("ACME Ltd", { size: 20, font: "Helvetica-Bold" })),
      fill(column([
        text(`Invoice #${data.number}`, { align: "right", field: "number" }),
        text(data.client, { align: "right", color: "#666666", field: "client" }),
      ], { gap: 2 })),
    ]),
    table(rows, {
      columns: [
        { label: "Item", key: "item", share: 3 },
        { label: "Qty", key: "qty", align: "right" },
        { label: "Price", key: "price", align: "right", format: money },
        { label: "Total", key: "total", align: "right", format: money },
      ],
      rowPadding: { x: 12, y: 8 },
      header: { background: "#f2f2f2" },
    }),
    row([
      text("Total due", { font: "Helvetica-Bold" }),
      text(money(rows.reduce((s, r) => s + r.total, 0)), { font: "Helvetica-Bold" }),
    ], { justify: "between", margin: { top: 16 } }),
  ], { gap: 12 });
}

export const sampleInvoice: Invoice = {
  number: "1042",
  client: "Globex Corporation",
  items: [
    { item: "LG Speakers", qty: 1, price: 227.99 },
    { item: "USB-C Cable, 2m", qty: 3, price: 9.99 },
  ],
};
