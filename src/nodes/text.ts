import { type Constraints, constrain } from "../core/constraints.js";
import { type Offset, type Size, ZERO_SIZE, rectAt } from "../core/geometry.js";
import type { LayoutContext, Node, PaintContext } from "../core/node.js";
import { DEFAULT_STYLE, type ResolvedTextStyle, type TextStyle, resolveStyle } from "../core/style.js";
import type { TextMetrics } from "../backend/renderer.js";

/**
 * Puts a string on the page.
 *
 * Width: when the available width is bounded, the node takes ALL of it
 * and wraps inside it, like a paragraph. That is what makes `align` work and
 * what makes text in a column span the column. When the width is unbounded
 * (a non-fill child of a row) it hugs its content on one line.
 *
 * Height is whatever the wrapped text measures. If that exceeds the
 * constraints the node reports the max and clips.
 */
export class TextNode implements Node {
  private resolved: ResolvedTextStyle = DEFAULT_STYLE;
  private size: Size = ZERO_SIZE;
  private overflowing = false;
  private lines: readonly string[] = [];
  /**
   * Measurements by width and style. A node is laid out more than once when
   * a row stretches it or a column paginates, and measuring is the one
   * expensive call. Tied to the layout context so a new render starts fresh.
   */
  private measured = new Map<string, TextMetrics>();
  private measuredFor: LayoutContext | undefined;

  constructor(
    readonly content: string,
    readonly style?: TextStyle,
  ) {}

  /**
   * Internal, used by `table` to apply a column's `align`. Returns a new node
   * with `align` set, unless this node already sets its own.
   */
  withAlign(align: NonNullable<TextStyle["align"]>): TextNode {
    if (this.style?.align !== undefined) return this;
    return new TextNode(this.content, { ...this.style, align });
  }

  layout(constraints: Constraints, ctx: LayoutContext): Size {
    this.resolved = resolveStyle(this.style, ctx.defaultStyle);
    const bounded = Number.isFinite(constraints.maxWidth);
    const metrics = this.measure(ctx, constraints.maxWidth);
    this.lines = metrics.lines;
    const wanted: Size = {
      width: bounded ? constraints.maxWidth : metrics.width,
      height: metrics.height,
    };
    this.size = constrain(constraints, wanted);
    this.overflowing = metrics.width > this.size.width || metrics.height > this.size.height;
    return this.size;
  }

  private measure(ctx: LayoutContext, maxWidth: number): TextMetrics {
    if (this.measuredFor !== ctx) {
      this.measured.clear();
      this.measuredFor = ctx;
    }
    const r = this.resolved;
    const key = `${maxWidth}|${r.font}|${r.size}|${r.lineHeight}|${r.align}`;
    let m = this.measured.get(key);
    if (!m) {
      m = ctx.measureText(this.content, r, maxWidth);
      this.measured.set(key, m);
    }
    return m;
  }

  paint(ctx: PaintContext, offset: Offset): void {
    const box = rectAt(offset, this.size);
    if (this.overflowing) {
      ctx.renderer.save();
      ctx.renderer.clip(box);
      ctx.renderer.drawText(this.content, this.resolved, box, this.lines);
      ctx.renderer.restore();
    } else {
      ctx.renderer.drawText(this.content, this.resolved, box, this.lines);
    }
  }
}
