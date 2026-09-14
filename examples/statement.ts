// A multi-page account statement: fifty rows, a logo, a table header that
// repeats on every page, and a totals block that never straddles a page.
import { writeFile } from "node:fs/promises";
import { render, text, padding, row, column, image, divider, table } from "../src/index.js";

const bold = "Helvetica-Bold";
const money = (n: number) => (n < 0 ? `-€${(-n).toFixed(2)}` : `€${n.toFixed(2)}`);

// Deterministic fake transactions.
const merchants = ["Grocer", "Transit", "Coffee", "Rent", "Salary", "Pharmacy", "Books", "Utilities"];
let balance = 1200;
const rows = Array.from({ length: 50 }, (_, i) => {
  const merchant = merchants[i % merchants.length]!;
  const amount = merchant === "Salary" ? 2400 : -((i * 37) % 180 + 4.5);
  balance += amount;
  const day = String((i % 28) + 1).padStart(2, "0");
  return { date: `2026-09-${day}`, merchant, amount, balance };
});

const opening = 1200;
const closing = balance;
const credits = rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
const debits = rows.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0);

const doc = column([
  row([
    image("test/fixtures/dot.png", { width: 80, height: 28 }),
    column([
      text("Account statement", { font: bold, size: 16 }),
      text("1 – 28 September 2026", { color: "#666666" }),
    ], { gap: 2, align: "end" }),
  ], { justify: "between", align: "end" }),

  padding(divider(), { y: 12 }),

  // Table styling has three appearance groups and a grid.
  //   header: the header row          row: each body row, from the data
  //   cell:   defaults for every cell  rowPadding / gap / rowGap: the grid all rows share
  // rowPadding insets the cells from the edge of the bands; cell.padding gives
  // each cell room, so the Amount column's background fills top to bottom.
  table(rows, {
    columns: [
      { label: "Date",        key: "date",     width: 80 },
      { label: "Description", key: "merchant" },
      { label: "Amount",      key: "amount",   width: 80, align: "right", format: money, background: "#e3f0e8" },
      { label: "Balance",     key: "balance",  width: 90, align: "right", format: money },
    ],
    header: { style: { font: bold, color: "#333333" }, background: "#f2f2f2" },
    row: (r, i) => ({
      background: i % 2 ? "#f7f7f7" : undefined,          // zebra stripes
      style: r.amount > 0 ? { color: "#0f8a4b" } : undefined,   // credits in green
    }),
    cell: { style: { size: 10 }, padding: { y: 5,x: 12 } },
    rowPadding: { x: 12 },
  }),

  // A card: padding, background, margin and keep are options on the column,
  // applied inside to out. No wrappers needed.
  column([
    row([text("Opening balance"), text(money(opening))], { justify: "between" }),
    row([text("Total credits"), text(money(credits))], { justify: "between" }),
    row([text("Total debits"), text(money(debits))], { justify: "between" }),
    divider(),
    row([text("Closing balance", { font: bold }), text(money(closing), { font: bold })], { justify: "between" }),
  ], { gap: 6, padding: 12, background: "#f2f2f2", margin: { top: 24 }, keep: true }),
]);

const pdf = await render(doc, { defaultStyle: { size: 10 } });
await writeFile("examples/statement.pdf", pdf);
console.log(`wrote examples/statement.pdf (${pdf.length} bytes)`);
