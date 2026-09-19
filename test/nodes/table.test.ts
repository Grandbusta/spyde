import { test } from "node:test";
import assert from "node:assert/strict";
import { TableNode } from "../../src/nodes/table.js";
import { ColumnNode } from "../../src/nodes/column.js";
import { TextNode } from "../../src/nodes/text.js";
import { loose } from "../../src/core/constraints.js";
import { FixedBox, fakeContexts } from "../fakeRenderer.js";

const w100 = loose({ width: 100, height: 500 });
const box = (h: number, color = "x") => new FixedBox({ width: 5, height: h }, color);
const painted = (ctx: ReturnType<typeof fakeContexts>) =>
  ctx.renderer.calls.map((c) => (c.op === "text" ? c.content : c.op === "fillRect" ? c.color : c.op));

test("table: string and number fields become text cells, label from the column", () => {
  const ctx = fakeContexts();
  const t = new TableNode([{ item: "Pen", qty: 3 }], { columns: [{ label: "Item", key: "item" }, { label: "Qty", key: "qty" }] });
  t.layout(w100, ctx.layoutCtx);
  t.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(painted(ctx), ["Item", "Qty", "Pen", "3"]);
});

test("table: header cells are bold by default, header.style overrides", () => {
  let ctx = fakeContexts();
  let t = new TableNode([{ a: 1 }], { columns: [{ label: "A", key: "a" }] });
  t.layout(w100, ctx.layoutCtx); t.paint(ctx.paintCtx, { x: 0, y: 0 });
  const first = ctx.renderer.calls[0]!;
  assert.ok(first.op === "text" && first.style.font === "Helvetica-Bold");

  ctx = fakeContexts();
  t = new TableNode([{ a: 1 }], { columns: [{ label: "A", key: "a" }], header: { style: { color: "#999" } } });
  t.layout(w100, ctx.layoutCtx); t.paint(ctx.paintCtx, { x: 0, y: 0 });
  const h = ctx.renderer.calls[0]!;
  assert.ok(h.op === "text" && h.style.color === "#999" && h.style.font === "Helvetica");
});

test("table: no label on any column -> no header row", () => {
  const ctx = fakeContexts();
  const t = new TableNode([{ a: "x" }], { columns: [{ key: "a" }] });
  t.layout(w100, ctx.layoutCtx); t.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(painted(ctx), ["x"]);
});

test("table: format transforms the field value; a computed column gets the whole row", () => {
  const ctx = fakeContexts();
  const money = (n: number) => `€${n.toFixed(2)}`;
  const t = new TableNode([{ qty: 2, price: 3.5 }], {
    columns: [
      { key: "price", format: money },
      { format: (_v, row) => money(row.qty * row.price) },
    ],
  });
  t.layout(w100, ctx.layoutCtx); t.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(painted(ctx), ["€3.50", "€7.00"]);
});

test("table: format may return any node", () => {
  const ctx = fakeContexts();
  const t = new TableNode([{ ok: true }], { columns: [{ key: "ok", format: (v) => box(10, v ? "green" : "red") }] });
  t.layout(w100, ctx.layoutCtx); t.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(painted(ctx), ["green"]);
});

test("table: cells default to equal shares with an 8pt gap", () => {
  const { layoutCtx } = fakeContexts();
  const a = box(10), b = box(10);
  const t = new TableNode([{ a, b }], { columns: [{ key: "a" }, { key: "b" }] });
  assert.deepEqual(t.layout(w100, layoutCtx), { width: 100, height: 10 });
  assert.equal(a.lastSize?.width, 46);
  assert.equal(b.lastSize?.width, 46);
});

test("table: a column with width is exact, the rest share the remainder", () => {
  const { layoutCtx } = fakeContexts();
  const a = box(10), b = box(10), c = box(10);
  new TableNode([{ a, b, c }], {
    columns: [{ key: "a", width: 30 }, { key: "b", share: 1 }, { key: "c", share: 2 }],
    gap: 5,
  }).layout(w100, layoutCtx);
  assert.equal(a.lastSize?.width, 30);
  assert.equal(b.lastSize?.width, 20);   // (100 - 30 - 10) / 3
  assert.equal(c.lastSize?.width, 40);
});

test("table: column align reaches header and text cells that do not set their own, and nothing else", () => {
  const ctx = fakeContexts();
  const t = new TableNode([{ a: "a", b: 1, c: 2 }], {
    columns: [
      { label: "A", key: "a", align: "right" },
      { label: "B", key: "b", align: "right", format: () => new TextNode("b", { align: "center" }) },
      { label: "C", key: "c", align: "right", format: () => box(10, "fixed") },
    ],
  });
  t.layout(w100, ctx.layoutCtx); t.paint(ctx.paintCtx, { x: 0, y: 0 });
  const aligns = ctx.renderer.calls.map((c) => (c.op === "text" ? c.style.align : c.op));
  assert.deepEqual(aligns, ["right", "right", "right", "right", "center", "fillRect"]);
});

test("table: rowGap goes between rows", () => {
  const ctx = fakeContexts();
  const t = new TableNode([{ x: box(10, "a") }, { x: box(10, "b") }], { columns: [{ key: "x" }], rowGap: 5 });
  assert.deepEqual(t.layout(w100, ctx.layoutCtx), { width: 100, height: 25 });
  t.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.equal(ctx.renderer.calls[1]?.op === "fillRect" && ctx.renderer.calls[1].rect.y, 15);
});

test("table: header.background paints a band behind the header row only", () => {
  const ctx = fakeContexts();
  const t = new TableNode([{ a: "x" }], { columns: [{ label: "A", key: "a" }], header: { background: "#eee", style: { size: 10 } }, cell: { style: { size: 10 } } });
  assert.deepEqual(t.layout(w100, ctx.layoutCtx), { width: 100, height: 24 });
  t.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(ctx.renderer.calls[0], { op: "fillRect", rect: { x: 0, y: 0, width: 100, height: 12 }, color: "#eee" });
  assert.deepEqual(painted(ctx), ["#eee", "A", "x"]);
});

test("table: rowPadding applies to header and body rows alike, so columns stay aligned", () => {
  const ctx = fakeContexts();
  const t = new TableNode([{ a: box(10, "cell") }], {
    columns: [{ label: "A", key: "a" }],
    header: { style: { size: 10 }, background: "#eee" },
    rowPadding: { x: 12, y: 8 },
  });
  assert.deepEqual(t.layout(w100, ctx.layoutCtx), { width: 100, height: 28 + 26 });   // (12+16) + (10+16)
  t.paint(ctx.paintCtx, { x: 0, y: 0 });
  const rects = ctx.renderer.calls.flatMap((c) => (c.op === "fillRect" ? [c.rect] : c.op === "text" ? [c.box] : []));
  assert.deepEqual(rects[0], { x: 0, y: 0, width: 100, height: 28 });          // band spans the padded header
  assert.deepEqual(rects[1], { x: 12, y: 8, width: 76, height: 12 });          // header text inset
  assert.deepEqual(rects[2], { x: 12, y: 36, width: 76, height: 10 });         // body cell at the same x
});

test("table: column style applies to that column's body cells, not the header", () => {
  const ctx = fakeContexts();
  const t = new TableNode([{ a: "x", b: "y" }], { columns: [{ label: "A", key: "a", style: { color: "#c00" } }, { label: "B", key: "b" }] });
  t.layout(w100, ctx.layoutCtx); t.paint(ctx.paintCtx, { x: 0, y: 0 });
  const colors = ctx.renderer.calls.map((c) => (c.op === "text" ? `${c.content}:${c.style.color}` : c.op));
  assert.deepEqual(colors, ["A:#000000", "B:#000000", "x:#c00", "y:#000000"]);
});

test("table: row function gives per-row background and style from the data", () => {
  const ctx = fakeContexts();
  const t = new TableNode([{ a: "r0", due: false }, { a: "r1", due: true }, { a: "r2", due: false }], {
    columns: [{ key: "a" }],
    cell: { style: { size: 10 } },
    row: (r, i) => ({ background: i % 2 ? "#fafafa" : undefined, style: r.due ? { color: "#c00" } : undefined }),
  });
  t.layout(w100, ctx.layoutCtx); t.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(painted(ctx), ["r0", "#fafafa", "r1", "r2"]);
  const r1 = ctx.renderer.calls[2]!;
  assert.ok(r1.op === "text" && r1.style.color === "#c00");
  const band = ctx.renderer.calls[1]!;
  assert.ok(band.op === "fillRect" && band.rect.width === 100 && band.rect.height === 12);
});

test("table: text style precedence is column, then row, then cell.style, field by field", () => {
  const ctx = fakeContexts();
  const t = new TableNode([{ a: "x" }], {
    columns: [{ key: "a", style: { color: "#111" } }],
    row: () => ({ style: { color: "#222", size: 9 } }),
    cell: { style: { color: "#333", size: 8, lineHeight: 2 } },
  });
  t.layout(w100, ctx.layoutCtx); t.paint(ctx.paintCtx, { x: 0, y: 0 });
  const c = ctx.renderer.calls[0]!;
  assert.ok(c.op === "text");
  if (c.op === "text") {
    assert.equal(c.style.color, "#111");     // column wins
    assert.equal(c.style.size, 9);           // row wins over cell.style
    assert.equal(c.style.lineHeight, 2);     // cell.style fills the rest
  }
});

test("table: column background fills the cell to the row's height, header included", () => {
  const ctx = fakeContexts();
  const t = new TableNode([{ a: box(10, "a"), b: box(30, "b") }], {
    columns: [{ label: "A", key: "a", background: "#eef" }, { label: "B", key: "b" }],
    header: { style: { size: 10 } },
  });
  t.layout(w100, ctx.layoutCtx); t.paint(ctx.paintCtx, { x: 0, y: 0 });
  const rects = ctx.renderer.calls.flatMap((c) => (c.op === "fillRect" ? [[c.color, c.rect.width, c.rect.height]] : []));
  assert.deepEqual(rects, [
    ["#eef", 46, 12],      // header cell A
    ["#eef", 46, 30],      // body cell A stretched to the 30-tall row
    ["a", 46, 30],
    ["b", 46, 30],
  ]);
});

test("table: cell.padding sits inside each cell and inside a column background", () => {
  const ctx = fakeContexts();
  const t = new TableNode([{ a: box(10, "a") }], { columns: [{ key: "a", background: "#eef" }], cell: { padding: 4 } });
  assert.deepEqual(t.layout(w100, ctx.layoutCtx), { width: 100, height: 18 });
  t.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(ctx.renderer.calls, [
    { op: "fillRect", rect: { x: 0, y: 0, width: 100, height: 18 }, color: "#eef" },
    { op: "fillRect", rect: { x: 4, y: 4, width: 92, height: 10 }, color: "a" },
  ]);
});

// Pagination. Header is text at size 10 -> 12pt tall in the fake.
const page = loose({ width: 100, height: 100 });

test("table: header repeats at the top of every page", () => {
  const rows = Array.from({ length: 5 }, (_, i) => ({ r: box(30, `r${i}`) }));
  const t = new TableNode(rows, { columns: [{ label: "H", key: "r" }], header: { style: { size: 10 } } });

  let ctx = fakeContexts();
  const p1 = t.layoutPage(page, ctx.layoutCtx, { atPageTop: true });
  assert.equal(p1.placed, 3);                        // header + 2 rows (12 + 30 + 30 = 72; +30 = 102)
  assert.deepEqual(p1.size, { width: 100, height: 72 });
  t.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(painted(ctx), ["H", "r0", "r1"]);

  ctx = fakeContexts();
  const t2 = p1.remainder as TableNode<{ r: FixedBox }>;
  const p2 = t2.layoutPage(page, ctx.layoutCtx, { atPageTop: true });
  t2.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(painted(ctx), ["H", "r2", "r3"]);

  ctx = fakeContexts();
  const t3 = p2.remainder as TableNode<{ r: FixedBox }>;
  const p3 = t3.layoutPage(page, ctx.layoutCtx, { atPageTop: true });
  assert.equal(p3.remainder, undefined);
  t3.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(painted(ctx), ["H", "r4"]);
});

test("table: a header is never left alone at the bottom of a page", () => {
  const ctx = fakeContexts();
  const t = new TableNode([{ r: box(30, "r0") }], { columns: [{ label: "H", key: "r" }], header: { style: { size: 10 } } });
  const col = new ColumnNode([box(85, "a"), t]);
  const r = col.layoutPage(page, ctx.layoutCtx, { atPageTop: true });
  assert.equal(r.placed, 1);
  col.paint(ctx.paintCtx, { x: 0, y: 0 });
  assert.deepEqual(painted(ctx), ["a"]);
  const r2 = (r.remainder as ColumnNode).layoutPage(page, ctx.layoutCtx, { atPageTop: true });
  assert.equal(r2.remainder, undefined);
});

test("table: a row taller than a page gets its own page and is clipped", () => {
  const ctx = fakeContexts();
  const t = new TableNode([{ r: box(150, "big") }, { r: box(10, "small") }], { columns: [{ key: "r" }] });
  const p1 = t.layoutPage(page, ctx.layoutCtx, { atPageTop: true });
  assert.equal(p1.placed, 1);
  assert.equal(p1.size.height, 100);
  assert.ok(p1.remainder);
});

test("table: everything fits -> plain layout, no remainder", () => {
  const ctx = fakeContexts();
  const t = new TableNode([{ r: box(10) }, { r: box(10) }], { columns: [{ label: "H", key: "r" }] });
  const r = t.layoutPage(page, ctx.layoutCtx, { atPageTop: true });
  assert.equal(r.remainder, undefined);
  assert.equal(r.placed, 3);
});
