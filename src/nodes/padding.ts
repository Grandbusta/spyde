import { type Constraints, constrain, deflate } from "../core/constraints.js";
import {
  type Insets, type Offset, type ResolvedInsets, type Size,
  ZERO_SIZE, addOffset, horizontal, rectAt, resolveInsets, vertical,
} from "../core/geometry.js";
import type { LayoutContext, Node, PaintContext } from "../core/node.js";

/**
 * Adds empty space around its child.
 *
 * Layout: shrink the constraints by the insets, lay out the child, then
 * report child size plus insets. If the parent's box is too small to hold
 * even the insets, the child gets zero space and the padding clips.
 */
export class PaddingNode implements Node {
  private readonly insets: ResolvedInsets;
  private childSize: Size = ZERO_SIZE;
  private size: Size = ZERO_SIZE;
  private overflowing = false;

  constructor(private readonly child: Node, insets: Insets) {
    this.insets = resolveInsets(insets);
  }

  layout(constraints: Constraints, ctx: LayoutContext): Size {
    this.childSize = this.child.layout(deflate(constraints, this.insets), ctx);
    const wanted: Size = {
      width: this.childSize.width + horizontal(this.insets),
      height: this.childSize.height + vertical(this.insets),
    };
    this.size = constrain(constraints, wanted);
    this.overflowing = wanted.width > this.size.width || wanted.height > this.size.height;
    return this.size;
  }

  paint(ctx: PaintContext, offset: Offset): void {
    const childOffset = addOffset(offset, { x: this.insets.left, y: this.insets.top });
    if (this.overflowing) {
      ctx.renderer.save();
      ctx.renderer.clip(rectAt(offset, this.size));
      this.child.paint(ctx, childOffset);
      ctx.renderer.restore();
    } else {
      this.child.paint(ctx, childOffset);
    }
  }
}
