import { test } from "node:test";
import assert from "node:assert/strict";
import { validate, text, padding, background, fill, spacer, row, column, table, keep, width } from "../src/index.js";

test("validate: a correct document has no findings", () => {
  const doc = column([
    row([fill(text("ACME", { font: "Helvetica-Bold" })), fill(text("Invoice", { align: "right" }))]),
    table([{ item: "a", total: 1 }], { columns: [{ label: "Item", key: "item" }, { label: "Total", key: "total", align: "right" }] }),
    row([text("Total due"), text("€1.00")], { justify: "between" }),
    keep(column([text("a"), text("b")], { padding: 8, background: "#eee" })),
  ]);
  assert.deepEqual(validate(doc), []);
});

test("validate: fill or spacer not a direct child of a row or column", () => {
  const doc = column([row([padding(fill(text("x")), 8)]), background(spacer(), "#eee")]);
  const f = validate(doc);
  assert.equal(f.length, 2);
  assert.equal(f[0]!.level, "error");
  assert.equal(f[0]!.path, "column > row[0] > padding[0] > fill");
  assert.match(f[0]!.message, /direct child of a row or column/);
  assert.equal(f[1]!.path, "column > background[1] > spacer");
  assert.match(f[1]!.message, /^spacer\(\)/);
});

test("validate: fill inside width or keep inside a row is fine (those pass through), fill under padding is not", () => {
  assert.deepEqual(validate(row([fill(text("a")), keep(text("b"))])), []);
  assert.equal(validate(row([width(fill(text("a")), 40)])).length, 1);
});

test("validate: justify with a fill child is flagged as ignored", () => {
  const f = validate(row([text("a"), fill(text("b"))], { justify: "between" }));
  assert.equal(f.length, 1);
  assert.equal(f[0]!.level, "warning");
  assert.match(f[0]!.message, /justify: "between" is ignored/);
  assert.deepEqual(validate(row([text("a"), text("b")], { justify: "between" })), []);
});

test("validate: a table column key that no row has, with a suggestion", () => {
  const f = validate(table([{ item: "a", amount: 2 }], { columns: [{ label: "Amount", key: "ammount" as never }] }));
  assert.equal(f.length, 1);
  assert.equal(f[0]!.path, "table > column[0]");
  assert.match(f[0]!.message, /reads key "ammount", which no row has\. Did you mean "amount"\?/);
});

test("validate: a table column with neither key nor format", () => {
  const f = validate(table([{ a: 1 }], { columns: [{ label: "Empty" } as never] }));
  assert.equal(f.length, 1);
  assert.match(f[0]!.message, /neither key nor format/);
});

test("validate: unknown fonts are reported, registered ones are not", () => {
  const doc = column([text("a", { font: "Inter" }), table([{ x: 1 }], { columns: [{ key: "x", style: { font: "Roboto" } }], header: { style: { font: "Inter" } } })]);
  const f = validate(doc);
  assert.deepEqual(f.map((x) => [x.level, x.path]), [
    ["error", "column > text[0]"],
    ["error", "column > table[1] > header"],
    ["error", "column > table[1] > column[0]"],
  ]);
  assert.match(f[0]!.message, /fonts: \{ "Inter": /);
  assert.deepEqual(validate(doc, { fonts: { Inter: "./Inter.ttf", Roboto: "./Roboto.ttf" } }), []);
  assert.equal(validate(text("a"), { defaultStyle: { font: "Nope" } }).length, 1);
});

test("validate: long text directly in a row is a warning; in a fill or column it is not", () => {
  const long = "a very long description that will certainly not fit on one line of a row of ordinary width";
  assert.equal(validate(row([text(long)]))[0]?.level, "warning");
  assert.deepEqual(validate(row([fill(text(long))])), []);
  assert.deepEqual(validate(column([text(long)])), []);
});

test("validate: table padding option is a warning pointing at rowPadding and cell.padding", () => {
  const f = validate(table([{ a: 1 }], { columns: [{ key: "a" }], padding: 8 } as never));
  assert.match(f[0]!.message, /rowPadding.*cell: \{ padding \}/);
});

test("validate: never throws on odd input", () => {
  assert.deepEqual(validate(table([] as { a: number }[], { columns: [{ key: "a" }] })), []);   // no rows: keys cannot be checked
  assert.deepEqual(validate(column([])), []);
});
