import type { Renderer, TextMetrics } from "../src/backend/renderer.js";
import type { Constraints } from "../src/core/constraints.js";
import type { Offset, Rect, Size } from "../src/core/geometry.js";
import type { LayoutContext, PaintContext } from "../src/core/node.js";
import type { ResolvedTextStyle, TextStyle } from "../src/core/style.js";

/** One recorded drawing call. Tests assert on the sequence of these. */
export type Call =
  | { op: "text"; content: string; style: ResolvedTextStyle; box: Rect; lines: readonly string[] }
  | { op: "fillRect"; rect: Rect; color: string }
  | { op: "image"; src: string | Uint8Array; box: Rect }
  | { op: "page" }
  | { op: "save" }
  | { op: "clip"; rect: Rect }
  | { op: "restore" };

/**
 * A Renderer that draws nothing and records every call.
 *
 * Text measurement is deterministic so layout tests need no font files:
 * every character is `size * CHAR_WIDTH` wide, lines wrap at word boundaries
 * to fit maxWidth, and each line is `size * lineHeight` tall.
 */
export class FakeRenderer implements Renderer {
  static readonly CHAR_WIDTH = 0.5;

  readonly calls: Call[] = [];
  /** Natural sizes for image sources. Unlisted sources are 100×50. */
  readonly images = new Map<string | Uint8Array, Size>();

  constructor(private readonly page: Size = { width: 595.28, height: 841.89 }) {}

  pageSize(): Size {
    return this.page;
  }

  addPage(): void {
    this.calls.push({ op: "page" });
  }

  imageSize(src: string | Uint8Array): Size {
    return this.images.get(src) ?? { width: 100, height: 50 };
  }

  drawImage(src: string | Uint8Array, box: Rect): void {
    this.calls.push({ op: "image", src, box });
  }

  measureText(content: string, style: ResolvedTextStyle, maxWidth: number): TextMetrics {
    const charW = style.size * FakeRenderer.CHAR_WIDTH;
    const lineH = style.size * style.lineHeight;
    const lines = wrap(content, (s) => s.length * charW, maxWidth);
    const width = lines.reduce((m, l) => Math.max(m, l.length * charW), 0);
    return { width, height: lines.length * lineH, lineCount: lines.length, lines };
  }

  drawText(content: string, style: ResolvedTextStyle, box: Rect, lines: readonly string[]): void {
    this.calls.push({ op: "text", content, style, box, lines });
  }

  fillRect(rect: Rect, color: string): void {
    this.calls.push({ op: "fillRect", rect, color });
  }

  save(): void {
    this.calls.push({ op: "save" });
  }

  clip(rect: Rect): void {
    this.calls.push({ op: "clip", rect });
  }

  restore(): void {
    this.calls.push({ op: "restore" });
  }

  /** Just the op names, for asserting call order compactly. */
  ops(): string[] {
    return this.calls.map((c) => c.op);
  }
}

/** Greedy word wrap. A single word wider than maxWidth stays on its own line. */
function wrap(content: string, widthOf: (s: string) => number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of content.split("\n")) {
    const words = paragraph.split(" ");
    let line = "";
    for (const word of words) {
      const candidate = line === "" ? word : `${line} ${word}`;
      if (line !== "" && widthOf(candidate) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Layout and paint contexts wired to one FakeRenderer. */
export function fakeContexts(
  options: { page?: Size; defaultStyle?: TextStyle } = {},
): { renderer: FakeRenderer; layoutCtx: LayoutContext; paintCtx: PaintContext } {
  const renderer = new FakeRenderer(options.page);
  const layoutCtx: LayoutContext = {
    measureText: (c, s, w) => renderer.measureText(c, s, w),
    imageSize: (src) => renderer.imageSize(src),
    defaultStyle: options.defaultStyle,
  };
  const paintCtx: PaintContext = { renderer };
  return { renderer, layoutCtx, paintCtx };
}

/**
 * A node with a fixed preferred size. Reports that size clamped to the
 * constraints, records the constraints it was given, and paints a fillRect
 * so tests can see where it landed.
 */
export class FixedBox {
  lastConstraints: Constraints | undefined;
  lastSize: Size | undefined;

  constructor(
    readonly preferred: Size,
    readonly color: string = "fixed",
  ) {}

  layout(constraints: Constraints, _ctx: LayoutContext): Size {
    this.lastConstraints = constraints;
    const w = Math.min(Math.max(this.preferred.width, constraints.minWidth), constraints.maxWidth);
    const h = Math.min(Math.max(this.preferred.height, constraints.minHeight), constraints.maxHeight);
    this.lastSize = { width: w, height: h };
    return this.lastSize;
  }

  paint(ctx: PaintContext, offset: Offset): void {
    const s = this.lastSize ?? this.preferred;
    ctx.renderer.fillRect({ x: offset.x, y: offset.y, width: s.width, height: s.height }, this.color);
  }
}
