// Starting points shown in the editor. Each is a TypeScript template plus
// the sample data it expects, kept as text because that is what the editor
// holds and the worker runs.

export interface Example {
  name: string;
  code: string;
  data: string;
}

export const invoice: Example = {
  name: "Invoice",
  code: `import { column, row, table, text, fill } from "@grandbusta/spyde";

type Item = { item: string; qty: number; total: number };
type Invoice = { number: string; issued: string; items: Item[] };

const money = (n: number) => "€" + n.toFixed(2);

export default (data: Invoice) =>
  column([
    row([
      fill(text("ACME Ltd", { size: 20, font: "Helvetica-Bold" })),
      fill(column([
        text("Invoice #" + data.number, { align: "right", field: "number" }),
        text(data.issued, { align: "right", color: "#666" }),
      ], { gap: 2 })),
    ]),
    table(data.items, {
      columns: [
        { label: "Item", key: "item", share: 2 },
        { label: "Qty", key: "qty", align: "right" },
        { label: "Total", key: "total", align: "right", format: money },
      ],
      rowPadding: { x: 12, y: 8 },
      header: { background: "#f2f2f2" },
    }),
    row(
      [
        text("Total due", { font: "Helvetica-Bold" }),
        text(money(data.items.reduce((s, i) => s + i.total, 0)), { font: "Helvetica-Bold" }),
      ],
      { justify: "between", margin: { top: 16 } },
    ),
  ], { gap: 8 });
`,
  data: `{
  "number": "1042",
  "issued": "20 September 2026",
  "items": [
    { "item": "LG Speakers", "qty": 1, "total": 227.99 },
    { "item": "Apple iPhone", "qty": 2, "total": 1999.99 },
    { "item": "USB-C Cable, 2m", "qty": 3, "total": 29.97 }
  ]
}
`,
};

// Fifty deterministic transactions, so the statement runs to a second page.
const merchants = ["Grocer", "Transit", "Coffee", "Rent", "Salary", "Pharmacy", "Books", "Utilities"];
let balance = 1200;
const transactions = Array.from({ length: 50 }, (_, i) => {
  const merchant = merchants[i % merchants.length]!;
  const amount = merchant === "Salary" ? 2400 : -(((i * 37) % 180) + 4.5);
  balance = Math.round((balance + amount) * 100) / 100;
  const day = String((i % 28) + 1).padStart(2, "0");
  return { date: `2026-09-${day}`, merchant, amount, balance };
});

export const statement: Example = {
  name: "Statement",
  code: `import { column, row, text, padding, divider, table } from "@grandbusta/spyde";

type Transaction = { date: string; merchant: string; amount: number; balance: number };
type Statement = { holder: string; period: string; opening: number; transactions: Transaction[] };

// Options for render and validate: the statement is set in 10 pt throughout.
export const options = { defaultStyle: { size: 10 } };

const bold = "Helvetica-Bold";
const money = (n: number) => (n < 0 ? "-€" + (-n).toFixed(2) : "€" + n.toFixed(2));

export default (data: Statement) => {
  const rows = data.transactions;
  const credits = rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const debits = rows.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0);
  const closing = rows.length ? rows[rows.length - 1]!.balance : data.opening;

  return column([
    row([
      text("Northbank", { font: bold, size: 18, color: "#8b1e3f" }),
      column([
        text("Account statement", { font: bold, size: 16 }),
        text(data.holder + " · " + data.period, { color: "#666666" }),
      ], { gap: 2, align: "end" }),
    ], { justify: "between", align: "end" }),

    padding(divider(), { y: 12 }),

    // The header row repeats on every page; zebra stripes come from the
    // row function; credits are coloured per row.
    table(rows, {
      columns: [
        { label: "Date", key: "date", width: 80 },
        { label: "Description", key: "merchant" },
        { label: "Amount", key: "amount", width: 80, align: "right", format: money, background: "#e3f0e8" },
        { label: "Balance", key: "balance", width: 90, align: "right", format: money },
      ],
      header: { style: { font: bold, color: "#333333" }, background: "#f2f2f2" },
      row: (r, i) => ({
        background: i % 2 ? "#f7f7f7" : undefined,
        style: r.amount > 0 ? { color: "#0f8a4b" } : undefined,
      }),
      cell: { padding: { y: 5, x: 12 } },
      rowPadding: { x: 12 },
    }),

    // A card that never straddles a page: keep on the column.
    column([
      row([text("Opening balance"), text(money(data.opening))], { justify: "between" }),
      row([text("Total credits"), text(money(credits))], { justify: "between" }),
      row([text("Total debits"), text(money(debits))], { justify: "between" }),
      divider(),
      row([text("Closing balance", { font: bold }), text(money(closing), { font: bold })], { justify: "between" }),
    ], { gap: 6, padding: 12, background: "#f2f2f2", margin: { top: 24 }, keep: true }),
  ]);
};
`,
  data: JSON.stringify({ holder: "A. Lovelace", period: "1 – 28 September 2026", opening: 1200, transactions }, null, 2) + "\n",
};

export const examples: Example[] = [invoice, statement];
