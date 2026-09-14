import { type Constraints, constrain } from "../core/constraints.js";
import { type Offset, type Size, ZERO_SIZE, rectAt } from "../core/geometry.js";
import type { LayoutContext, Node, PaintContext } from "../core/node.js";

export interface DividerOptions {
  color?: string;      // default "#cccccc"
  thickness?: number;  // default 1
}

/**
 * A line across the available space. Horizontal when the width is
 * bounded (in a column); otherwise vertical (in a row), spanning the height
 * if that is bounded. In a row, use `align: "stretch"` to give it height.
 */
export class DividerNode implements Node {
  private readonly color: string;
  private readonly thickness: number;
  private size: Size = ZERO_SIZE;

  constructor(options: DividerOptions = {}) {
    this.color = options.color ?? "#cccccc";
    this.thickness = options.thickness ?? 1;
  }

  layout(constraints: Constraints, _ctx: LayoutContext): Size {
    const wanted: Size = Number.isFinite(constraints.maxWidth)
      ? { width: constraints.maxWidth, height: this.thickness }
      : {
          width: this.thickness,
          height: Number.isFinite(constraints.maxHeight) ? constraints.maxHeight : this.thickness,
        };
    this.size = constrain(constraints, wanted);
    return this.size;
  }

  paint(ctx: PaintContext, offset: Offset): void {
    ctx.renderer.fillRect(rectAt(offset, this.size), this.color);
  }
}
