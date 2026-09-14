import type { Constraints } from "../core/constraints.js";
import type { Offset, Size } from "../core/geometry.js";
import type { LayoutContext, Node, PaintContext } from "../core/node.js";

/**
 * Keeps its child on one page. It has no logic: a column moves any
 * child that does not fit to the next page, and only `column`/`table` can
 * split, so wrapping a splittable node in `keep` is what makes it move
 * whole. The class exists so the intent is visible in the tree.
 */
export class KeepNode implements Node {
  constructor(private readonly child: Node) {}

  layout(constraints: Constraints, ctx: LayoutContext): Size {
    return this.child.layout(constraints, ctx);
  }

  paint(ctx: PaintContext, offset: Offset): void {
    this.child.paint(ctx, offset);
  }
}
