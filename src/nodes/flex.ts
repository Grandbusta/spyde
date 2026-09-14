import { type Constraints, INFINITY, constrain } from "../core/constraints.js";
import { type Offset, type Size, ZERO_SIZE, addOffset, rectAt } from "../core/geometry.js";
import type { LayoutContext, Node, PaintContext } from "../core/node.js";
import { FillNode } from "./fill.js";

export type Axis = "horizontal" | "vertical";

export interface FlexOptions {
  /** Space between children on the main axis. Default 0. Not added after the last child. */
  gap?: number;
}

/**
 * Shared engine behind `row` (horizontal) and `column` (vertical).
 *
 * Layout, in order:
 *  1. Non-fill children get an UNBOUNDED loose main axis and the parent's
 *     cross axis (loose). They take exactly the space their content needs.
 *  2. Leftover main-axis space = available - fixed children - gaps, floored at 0.
 *  3. Fill children split the leftover by share and get a TIGHT main axis.
 *     If the main axis is unbounded there is no leftover to fill, so fill
 *     children are treated like non-fill children.
 *  4. Main size = sum of children + gaps. Cross size = largest child.
 *     Both pass through constrain() (D1).
 *  5. Children are placed from the leading edge, cross offset 0.
 *
 * Paint: if step 4 clamped anything, all children are painted inside a clip.
 */
export class FlexNode implements Node {
  private readonly gap: number;
  private childSizes: Size[] = [];
  private childOffsets: Offset[] = [];
  private size: Size = ZERO_SIZE;
  private overflowing = false;

  constructor(
    private readonly axis: Axis,
    private readonly children: readonly Node[],
    options: FlexOptions = {},
  ) {
    this.gap = options.gap ?? 0;
  }

  layout(constraints: Constraints, ctx: LayoutContext): Size {
    const n = this.children.length;
    const axis = this.axis;
    const mainMax = main(axis, { width: constraints.maxWidth, height: constraints.maxHeight });
    const crossMax = cross(axis, { width: constraints.maxWidth, height: constraints.maxHeight });
    const gapTotal = n > 1 ? this.gap * (n - 1) : 0;
    const canFill = Number.isFinite(mainMax);

    this.childSizes = new Array<Size>(n).fill(ZERO_SIZE);
    this.childOffsets = new Array<Offset>(n).fill({ x: 0, y: 0 });

    // Pass 1: non-fill children (and every child when the main axis is unbounded).
    let fixedTotal = 0;
    let totalShare = 0;
    for (let i = 0; i < n; i++) {
      const child = this.children[i]!;
      if (canFill && child instanceof FillNode) {
        totalShare += Math.max(0, child.share);
        continue;
      }
      const size = child.layout(makeConstraints(axis, 0, INFINITY, 0, crossMax), ctx);
      this.childSizes[i] = size;
      fixedTotal += main(axis, size);
    }

    // Pass 2: fill children split what is left.
    if (canFill) {
      const leftover = Math.max(0, mainMax - fixedTotal - gapTotal);
      for (let i = 0; i < n; i++) {
        const child = this.children[i]!;
        if (!(child instanceof FillNode)) continue;
        const share = Math.max(0, child.share);
        const extent = totalShare > 0 ? (leftover * share) / totalShare : 0;
        this.childSizes[i] = child.layout(makeConstraints(axis, extent, extent, 0, crossMax), ctx);
      }
    }

    // Sizes and offsets.
    let mainTotal = 0;
    let crossTotal = 0;
    for (let i = 0; i < n; i++) {
      const size = this.childSizes[i]!;
      this.childOffsets[i] = makeOffset(axis, mainTotal, 0);
      mainTotal += main(axis, size) + (i < n - 1 ? this.gap : 0);
      crossTotal = Math.max(crossTotal, cross(axis, size));
    }

    const wanted = makeSize(axis, mainTotal, crossTotal);
    this.size = constrain(constraints, wanted);
    this.overflowing = wanted.width > this.size.width || wanted.height > this.size.height;
    return this.size;
  }

  paint(ctx: PaintContext, offset: Offset): void {
    if (this.overflowing) {
      ctx.renderer.save();
      ctx.renderer.clip(rectAt(offset, this.size));
    }
    for (let i = 0; i < this.children.length; i++) {
      this.children[i]!.paint(ctx, addOffset(offset, this.childOffsets[i]!));
    }
    if (this.overflowing) {
      ctx.renderer.restore();
    }
  }
}

// Axis helpers. "main" is the direction children are laid along;
// "cross" is the other one. For a row, main is width.

function main(axis: Axis, size: Size): number {
  return axis === "horizontal" ? size.width : size.height;
}

function cross(axis: Axis, size: Size): number {
  return axis === "horizontal" ? size.height : size.width;
}

function makeSize(axis: Axis, mainExtent: number, crossExtent: number): Size {
  return axis === "horizontal"
    ? { width: mainExtent, height: crossExtent }
    : { width: crossExtent, height: mainExtent };
}

function makeOffset(axis: Axis, mainPos: number, crossPos: number): Offset {
  return axis === "horizontal" ? { x: mainPos, y: crossPos } : { x: crossPos, y: mainPos };
}

function makeConstraints(
  axis: Axis,
  mainMin: number,
  mainMax: number,
  crossMin: number,
  crossMax: number,
): Constraints {
  return axis === "horizontal"
    ? { minWidth: mainMin, maxWidth: mainMax, minHeight: crossMin, maxHeight: crossMax }
    : { minWidth: crossMin, maxWidth: crossMax, minHeight: mainMin, maxHeight: mainMax };
}
