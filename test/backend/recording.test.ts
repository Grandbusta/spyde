import { test } from "node:test";
import assert from "node:assert/strict";
import { RecordingRenderer } from "../../src/backend/recording.js";
import { PdfKitRenderer } from "../../src/backend/pdfkit.js";
import { DEFAULT_STYLE } from "../../src/core/style.js";
import { loose } from "../../src/core/constraints.js";
import type { LayoutContext, PaintContext } from "../../src/core/node.js";
import { text, column, background, padding, image } from "../../src/factories.js";

const style = { ...DEFAULT_STYLE, size: 10 };

test("recording: measures exactly like the PDFKit renderer", () => {
  const rec = new RecordingRenderer();
  const pdf = new PdfKitRenderer();
  const content = "the quick brown fox jumps over the lazy dog";
  assert.deepEqual(rec.measureText(content, style, 90), pdf.measureText(content, style, 90));
  assert.deepEqual(rec.pageSize(), pdf.pageSize());
});

test("recording: a text op carries the box, the lines, and the style", () => {
  const rec = new RecordingRenderer();
  const m = rec.measureText("one two three", style, 40);
  rec.drawText("one two three", style, { x: 10, y: 20, width: 40, height: m.height }, m.lines);
  const [page] = rec.finish();
  assert.deepEqual(page!.ops, [{ op: "text", x: 10, y: 20, width: 40, height: m.height, lines: [...m.lines], style }]);
});

test("recording: rects and images record their boxes; field rides on the style", () => {
  const rec = new RecordingRenderer();
  rec.fillRect({ x: 1, y: 2, width: 3, height: 4 }, "#eee");
  rec.drawImage("test/fixtures/dot.png", { x: 5, y: 6, width: 7, height: 8 });
  rec.drawText("x", { ...style, field: "number" }, { x: 0, y: 0, width: 10, height: 12 }, ["x"]);
  const ops = rec.finish()[0]!.ops;
  assert.deepEqual(ops[0], { op: "rect", x: 1, y: 2, width: 3, height: 4, color: "#eee" });
  assert.deepEqual(ops[1], { op: "image", x: 5, y: 6, width: 7, height: 8, src: "test/fixtures/dot.png" });
  const t = ops[2]!;
  assert.equal(t.op === "text" ? t.style.field : undefined, "number");
});

test("recording: save/clip/restore nests ops under the clip, later ops land outside it", () => {
  const rec = new RecordingRenderer();
  rec.fillRect({ x: 0, y: 0, width: 1, height: 1 }, "before");
  rec.save();
  rec.clip({ x: 10, y: 10, width: 100, height: 50 });
  rec.fillRect({ x: 12, y: 12, width: 1, height: 1 }, "inside");
  rec.restore();
  rec.fillRect({ x: 0, y: 0, width: 1, height: 1 }, "after");
  const ops = rec.finish()[0]!.ops;
  assert.equal(ops.length, 3);
  const [before, clip, after] = ops as [typeof ops[0], typeof ops[0], typeof ops[0]];
  assert.equal(before!.op === "rect" ? before.color : undefined, "before");
  assert.ok(clip!.op === "clip");
  if (clip!.op === "clip") {
    assert.deepEqual({ x: clip.x, y: clip.y, width: clip.width, height: clip.height }, { x: 10, y: 10, width: 100, height: 50 });
    assert.equal(clip.children.length, 1);
    const inside = clip.children[0]!;
    assert.equal(inside.op === "rect" ? inside.color : undefined, "inside");
  }
  assert.equal(after!.op === "rect" ? after.color : undefined, "after");
});

test("recording: nested clips nest; a save/restore pair without a clip changes nothing", () => {
  const rec = new RecordingRenderer();
  rec.save(); rec.clip({ x: 0, y: 0, width: 100, height: 100 });
  rec.save(); rec.clip({ x: 10, y: 10, width: 50, height: 50 });
  rec.fillRect({ x: 11, y: 11, width: 1, height: 1 }, "deep");
  rec.restore();
  rec.fillRect({ x: 1, y: 1, width: 1, height: 1 }, "outer");
  rec.restore();
  rec.save(); rec.restore();
  rec.fillRect({ x: 0, y: 0, width: 1, height: 1 }, "top");
  const ops = rec.finish()[0]!.ops;
  assert.equal(ops.length, 2);
  const outer = ops[0]!;
  assert.ok(outer.op === "clip");
  if (outer.op === "clip") {
    assert.equal(outer.children.length, 2);
    const inner = outer.children[0]!;
    assert.ok(inner.op === "clip" && inner.children.length === 1);
    const sibling = outer.children[1]!;
    assert.equal(sibling.op === "rect" ? sibling.color : undefined, "outer");
  }
  const top = ops[1]!;
  assert.equal(top.op === "rect" ? top.color : undefined, "top");
});

test("recording: addPage starts a new page of the same size and closes any open clip", () => {
  const rec = new RecordingRenderer({ size: [300, 400] });
  rec.save(); rec.clip({ x: 0, y: 0, width: 10, height: 10 });
  rec.addPage();
  rec.fillRect({ x: 0, y: 0, width: 1, height: 1 }, "p2");
  const pages = rec.finish();
  assert.equal(pages.length, 2);
  assert.deepEqual([pages[1]!.width, pages[1]!.height], [300, 400]);
  assert.equal(pages[0]!.ops.length, 1);            // the clip
  assert.equal(pages[1]!.ops[0]!.op, "rect");        // at page level, not inside the old clip
});

test("recording: a small tree painted through it records what the PDF would draw", () => {
  const rec = new RecordingRenderer();
  const layoutCtx: LayoutContext = {
    measureText: (c, s, w) => rec.measureText(c, s, w),
    imageSize: (src) => rec.imageSize(src),
    defaultStyle: { size: 10 },
  };
  const paintCtx: PaintContext = { renderer: rec };
  const tree = column([
    text("Invoice #1042", { field: "number" }),
    background(padding(text("hello"), 4), "#f2f2f2"),
    image("test/fixtures/dot.png", { width: 20 }),
  ], { gap: 2 });
  tree.layout(loose({ width: 200, height: 500 }), layoutCtx);
  tree.paint(paintCtx, { x: 40, y: 40 });
  const ops = rec.finish()[0]!.ops.map((o) => o.op);
  assert.deepEqual(ops, ["text", "rect", "text", "image"]);
  const first = rec.finish()[0]!.ops[0]!;
  if (first.op === "text") {
    assert.deepEqual(first.lines, ["Invoice #1042"]);
    assert.equal(first.style.field, "number");
    assert.equal(first.x, 40);
  }
});
