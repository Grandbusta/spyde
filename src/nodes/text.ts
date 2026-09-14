import { type Constraints, constrain } from "../core/constraints.js";
import { type Offset, type Size, ZERO_SIZE, rectAt } from "../core/geometry.js";
import type { LayoutContext, Node, PaintContext } from "../core/node.js";
import { DEFAULT_STYLE, type ResolvedTextStyle, type TextStyle, resolveStyle } from "../core/style.js";

/**
 * Puts a string on the page.
 *
 * Width (D11): when the available width is bounded, the node takes ALL of it
 * and wraps inside it, like a paragraph. That is what makes `align` work and
 * what makes text in a column span the column. When the width is unbounded
 * (a non-fill child of a row, see D10) it hugs its content on one line.
 *
 * Height is whatever the wrapped text measures. If that exceeds the
 * constraints the node reports the max and clips (D1).
 */
export class TextNode implements Node {
  private resolved: ResolvedTextStyle = DEFAULT_STYLE;
  private size: Size = ZERO_SIZE;
  private overflowing = false;

  constructor(
    private readonly content: string,
    private readonly style?: TextStyle,
  ) {}

  layout(constraints: Constraints, ctx: LayoutContext): Size {
    this.resolved = resolveStyle(this.style, ctx.defaultStyle);
    const bounded = Number.isFinite(constraints.maxWidth);
    const metrics = ctx.measureText(this.content, this.resolved, constraints.maxWidth);
    const wanted: Size = {
      width: bounded ? constraints.maxWidth : metrics.width,
      height: metrics.height,
    };
    this.size = constrain(constraints, wanted);
    this.overflowing = metrics.width > this.size.width || metrics.height > this.size.height;
    return this.size;
  }

  paint(ctx: PaintContext, offset: Offset): void {
    const box = rectAt(offset, this.size);
    if (this.overflowing) {
      ctx.renderer.save();
      ctx.renderer.clip(box);
      ctx.renderer.drawText(this.content, this.resolved, box);
      ctx.renderer.restore();
    } else {
      ctx.renderer.drawText(this.content, this.resolved, box);
    }
  }
}
