import type { Constraints } from "../core/constraints.js";
import type { Offset, Size } from "../core/geometry.js";
import type { LayoutContext, Node, PaintContext } from "../core/node.js";

/**
 * Marks a child of a row or column as "take the leftover space".
 *
 * This node does no layout of its own. The flex engine checks each child
 * with `instanceof FillNode`, reads the share, and hands the wrapped child a
 * tight main-axis constraint. Outside a row or column it simply passes
 * everything through to its child.
 *
 * `share` is the proportion of leftover space this child gets relative to
 * the other fill children. Default 1. Zero or negative means no space.
 */
export class FillNode implements Node {
  constructor(
    readonly child: Node,
    readonly share: number = 1,
  ) {}

  layout(constraints: Constraints, ctx: LayoutContext): Size {
    return this.child.layout(constraints, ctx);
  }

  paint(ctx: PaintContext, offset: Offset): void {
    this.child.paint(ctx, offset);
  }
}
