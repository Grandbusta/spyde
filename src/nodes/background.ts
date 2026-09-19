import { type Constraints, constrain } from "../core/constraints.js";
import { type Offset, type Size, ZERO_SIZE, rectAt } from "../core/geometry.js";
import type { LayoutContext, Node, PaintContext } from "../core/node.js";

/**
 * Paints a solid color behind its child.
 *
 * Layout: passes constraints straight through and takes the child's size.
 * Paint: fill the box, then paint the child on top. Because the fill uses
 * the size computed in layout, the color always covers exactly the content.
 */
export class BackgroundNode implements Node {
  private size: Size = ZERO_SIZE;

  constructor(private readonly child: Node, private readonly color: string) {}

  layout(constraints: Constraints, ctx: LayoutContext): Size {
    // The child is already constrained, so this constrain() is a no-op for a
    // well-behaved child. It stays as a guard so a misbehaving child cannot
    // push an oversize box up the tree.
    this.size = constrain(constraints, this.child.layout(constraints, ctx));
    return this.size;
  }

  paint(ctx: PaintContext, offset: Offset): void {
    ctx.renderer.fillRect(rectAt(offset, this.size), this.color);
    this.child.paint(ctx, offset);
  }
}
