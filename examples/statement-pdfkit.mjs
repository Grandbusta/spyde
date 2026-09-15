// The statement example, written directly against PDFKit for comparison
// with examples/statement.ts. Same data, same layout: logo + bottom-aligned
// title block, a four-column table with fixed and flexible widths,
// right-aligned money, a header repeated on every page, and a totals box
// that never straddles a page. Run with:  node examples/statement-pdfkit.mjs
import PDFDocument from "pdfkit";
import { writeFileSync } from "node:fs";

const bold = "Helvetica-Bold";
const money = (n) => (n < 0 ? `-€${(-n).toFixed(2)}` : `€${n.toFixed(2)}`);

// Same deterministic fake transactions as examples/statement.ts.
const merchants = ["Grocer", "Transit", "Coffee", "Rent", "Salary", "Pharmacy", "Books", "Utilities"];
let balance = 1200;
const rows = Array.from({ length: 50 }, (_, i) => {
  const merchant = merchants[i % merchants.length];
  const amount = merchant === "Salary" ? 2400 : -((i * 37) % 180 + 4.5);
  balance += amount;
  const day = String((i % 28) + 1).padStart(2, "0");
  return { date: `2026-09-${day}`, merchant, amount, balance };
});
const opening = 1200;
const closing = balance;
const credits = rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
const debits = rows.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0);

// Page geometry.
const doc = new PDFDocument({ size: "A4", margin: 0 });
const chunks = [];
doc.on("data", (c) => chunks.push(c));
const margin = 40;
const pageW = doc.page.width, pageH = doc.page.height;
const left = margin, right = pageW - margin, contentW = right - left, bottom = pageH - margin;
let y = margin;

const lineH = (size) => size * 1.2;
const setFont = (font, size) => doc.font(font).fontSize(size).fillColor("#000000");

// ---- Header: logo left, title block right, bottom edges aligned ----
const logoW = 80, logoH = 28;
setFont(bold, 16);
const titleH = lineH(16);
setFont("Helvetica", 10);
const subH = lineH(10);
const titleBlockH = titleH + 2 + subH;
const headerH = Math.max(logoH, titleBlockH);
doc.rect(left, y + headerH - logoH, logoW, logoH).fill("#0f8a4b");
setFont(bold, 16);
doc.text("Account statement", left, y + headerH - titleBlockH, { width: contentW, align: "right" });
setFont("Helvetica", 10);
doc.fillColor("#666666").text("1 – 28 September 2026", left, y + headerH - subH, { width: contentW, align: "right" });
y += headerH;

// ---- Divider with 12pt above and below ----
y += 12;
doc.rect(left, y, contentW, 1).fill("#cccccc");
y += 1 + 12;

// ---- Table ----
const gap = 8, rowGap = 6;
const fixed = [80, null, 80, 90];                       // null = flexible
const flexW = contentW - gap * 3 - fixed.filter(Boolean).reduce((a, b) => a + b, 0);
const colW = fixed.map((w) => w ?? flexW);
const colX = colW.reduce((xs, w, i) => (xs.push(i === 0 ? left : xs[i - 1] + colW[i - 1] + gap), xs), []);
const align = ["left", "left", "right", "right"];
const rowH = lineH(10);

function drawRow(cells, font) {
  setFont(font, 10);
  cells.forEach((c, i) => doc.text(c, colX[i], y, { width: colW[i], align: align[i], lineBreak: false }));
  y += rowH;
}
function drawHeader() {
  drawRow(["Date", "Description", "Amount", "Balance"], bold);
}
function newPage() {
  doc.addPage({ size: "A4", margin: 0 });
  y = margin;
}

drawHeader();
for (const r of rows) {
  if (y + rowGap + rowH > bottom) {           // row would not fit: new page, repeat header
    newPage();
    drawHeader();
  }
  y += rowGap;
  drawRow([r.date, r.merchant, money(r.amount), money(r.balance)], "Helvetica");
}

// ---- Totals box: keep together ----
const pad = 12, innerGap = 6;
const totalsLines = 4;
const boxH = pad + totalsLines * rowH + innerGap * 4 + 1 + pad;   // rows, gaps, divider
y += 24;
if (y + boxH > bottom) {
  newPage();
}
doc.rect(left, y, contentW, boxH).fill("#f2f2f2");
let ty = y + pad;
const innerL = left + pad, innerW = contentW - 2 * pad;
function totalLine(label, value, font) {
  setFont(font, 10);
  doc.text(label, innerL, ty, { width: innerW, align: "left", lineBreak: false });
  doc.text(value, innerL, ty, { width: innerW, align: "right", lineBreak: false });
  ty += rowH + innerGap;
}
totalLine("Opening balance", money(opening), "Helvetica");
totalLine("Total credits", money(credits), "Helvetica");
totalLine("Total debits", money(debits), "Helvetica");
doc.rect(innerL, ty, innerW, 1).fill("#cccccc");
ty += 1 + innerGap;
totalLine("Closing balance", money(closing), bold);
y += boxH;

doc.end();
await new Promise((r) => doc.on("end", r));
writeFileSync("examples/statement-pdfkit.pdf", Buffer.concat(chunks));
console.log("wrote examples/statement-pdfkit.pdf");
