// The invoice as a function of its data. Both routes in server.ts use it:
// one paints it as HTML for the live preview, the other as the PDF.
import { text, row, column, fill, table, divider } from "../../src/index.js";

export interface Invoice {
  number: string;
  date: string;
  client: { name: string; address: string };
  items: { item: string; qty: number; price: number }[];
  notes: string;
}

export const sampleInvoice: Invoice = {
  number: "1042",
  date: "2026-09-15",
  client: { name: "Ada Lovelace", address: "12 Analytical Way\nLondon" },
  items: [
    { item: "Design consultation", qty: 2, price: 120 },
    { item: "Wireframes", qty: 1, price: 450 },
  ],
  notes: "Payment due within 30 days.",
};

const money = (n: number) => `€${n.toFixed(2)}`;
const bold = "Helvetica-Bold";

export function invoiceDocument(inv: Invoice) {
  const total = inv.items.reduce((s, i) => s + i.qty * i.price, 0);
  return column([
    row([
      fill(text("ACME Ltd", { size: 20, font: bold })),
      fill(column([
        text(`Invoice #${inv.number}`, { align: "right", field: "number" }),
        text(inv.date, { align: "right", color: "#666666", field: "date" }),
      ], { gap: 2 })),
    ]),
    divider({ color: "#dddddd" }),
    column([
      text("Bill to", { size: 9, color: "#666666" }),
      text(inv.client.name, { font: bold, field: "client.name" }),
      text(inv.client.address, { field: "client.address" }),
    ], { gap: 2, margin: { top: 12 } }),
    table(inv.items.map((i) => ({ ...i, total: i.qty * i.price })), {
      columns: [
        { label: "Item", key: "item", share: 3 },
        { label: "Qty", key: "qty", width: 50, align: "right" },
        { label: "Price", key: "price", width: 80, align: "right", format: money },
        { label: "Total", key: "total", width: 80, align: "right", format: money },
      ],
      rowPadding: { x: 10, y: 6 },
      header: { background: "#f2f2f2" },
      margin: { top: 20 },
    }),
    row([text("Total due", { font: bold }), text(money(total), { font: bold })], { justify: "between", margin: { top: 12 } }),
    column([text(inv.notes, { size: 9, color: "#666666", field: "notes" })], { margin: { top: 16 } }),
  ], { gap: 6 });
}
