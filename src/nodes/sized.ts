import { type Constraints, clamp, constrain } from "../core/constraints.js";
import { type Offset, type Size, ZERO_SIZE } from "../core/geometry.js";
import type { LayoutContext, Node, PaintContext } from "../core/node.js";

/**
 * Makes one axis exact . The named axis becomes tight at `points`
 * (clamped to what the parent allows); the other passes through. The
 * child is forced to that size by its own constrain(), and clips itself if
 * its content is larger.
 */
export class SizedNode implements Node {
  private size: Size = ZERO_SIZE;

  constructor(
    readonly child: Node,
    readonly axis: "width" | "height",
    readonly points: number,
  ) {}

  layout(constraints: Constraints, ctx: LayoutContext): Size {
    const c: Constraints =
      this.axis === "width"
        ? { ...constraints, minWidth: clamp(this.points, constraints.minWidth, constraints.maxWidth),
            maxWidth: clamp(this.points, constraints.minWidth, constraints.maxWidth) }
        : { ...constraints, minHeight: clamp(this.points, constraints.minHeight, constraints.maxHeight),
            maxHeight: clamp(this.points, constraints.minHeight, constraints.maxHeight) };
    this.size = constrain(constraints, this.child.layout(c, ctx));
    return this.size;
  }

  paint(ctx: PaintContext, offset: Offset): void {
    this.child.paint(ctx, offset);
  }
}

/** Makes something exactly this wide. */
export class WidthNode extends SizedNode {
  constructor(child: Node, points: number) {
    super(child, "width", points);
  }
}

/** Makes something exactly this tall. */
export class HeightNode extends SizedNode {
  constructor(child: Node, points: number) {
    super(child, "height", points);
  }
}
