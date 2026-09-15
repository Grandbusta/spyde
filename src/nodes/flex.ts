import { type Constraints, INFINITY, constrain, deflate } from "../core/constraints.js";
import {
  type Insets, type Offset, type ResolvedInsets, type Size,
  ZERO_SIZE, addOffset, horizontal, rectAt, resolveInsets, vertical,
} from "../core/geometry.js";
import type { LayoutContext, Node, PaintContext } from "../core/node.js";
import { FillNode } from "./fill.js";

export type Axis = "horizontal" | "vertical";
export type Align = "start" | "center" | "end" | "stretch";
export type Justify = "start" | "center" | "end" | "between";

/**
 * Box properties a container can carry instead of being wrapped. Applied in
 * a fixed order, inside to out: content, padding, background, margin. Same
 * meaning as the `padding` and `background` words; use the words when you
 * need a different order.
 */
export interface BoxOptions {
  /** Space inside, between the edge and the children. */
  padding?: Insets;
  /** Colour behind the padded box. */
  background?: string;
  /** Space outside, around the background. */
  margin?: Insets;
}

export interface FlexOptions extends BoxOptions {
  /** Space between children on the main axis. Default 0. Not added after the last child. */
  gap?: number;
  /** Cross-axis placement of each child. Default "start". */
  align?: Align;
  /**
   * Main-axis distribution of leftover space. Default "start". Ignored when
   * the main axis is unbounded or any child is a `fill`.
   */
  justify?: Justify;
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
 *     Both pass through constrain().
 *  5. Children are placed from the leading edge; `align` shifts them on the
 *     cross axis and `justify` on the main axis.
 *
 * Paint: if step 4 clamped anything, all children are painted inside a clip.
 * Only the first `placedCount` children are painted; a column in split mode
 * (see ColumnNode.layoutPage) sets this below the child count.
 */
export class FlexNode implements Node {
  protected readonly gap: number;
  protected readonly align: Align;
  protected readonly justify: Justify;
  protected readonly padding: ResolvedInsets;
  protected readonly margin: ResolvedInsets;
  protected readonly background: string | undefined;
  protected childSizes: Size[] = [];
  protected childOffsets: Offset[] = [];
  /** Size of the content box (children plus gaps), before padding and margin. */
  protected size: Size = ZERO_SIZE;
  /** Content size before constrain(). Lets layoutPage tell whether everything fit. */
  protected wanted: Size = ZERO_SIZE;
  /** Content size plus padding plus margin, clamped to the parent's constraints. */
  protected outer: Size = ZERO_SIZE;
  protected placedCount = 0;
  private overflowing = false;

  constructor(
    protected readonly axis: Axis,
    protected readonly children: readonly Node[],
    protected readonly options: FlexOptions = {},
  ) {
    this.gap = options.gap ?? 0;
    this.align = options.align ?? "start";
    this.justify = options.justify ?? "start";
    this.padding = resolveInsets(options.padding);
    this.margin = resolveInsets(options.margin);
    this.background = options.background;
  }

  layout(constraints: Constraints, ctx: LayoutContext): Size {
    this.layoutContent(this.inner(constraints), ctx);
    return this.finishOuter(constraints);
  }

  /** Constraints for the content box: the parent's, minus margin and padding. */
  protected inner(constraints: Constraints): Constraints {
    return deflate(deflate(constraints, this.margin), this.padding);
  }

  /** Public form of `inner`, for generators that measure content against a column's box. */
  innerOf(constraints: Constraints): Constraints {
    return this.inner(constraints);
  }

  /** Turn the content size into the outer size and remember both. */
  protected finishOuter(constraints: Constraints): Size {
    const dw = horizontal(this.padding) + horizontal(this.margin);
    const dh = vertical(this.padding) + vertical(this.margin);
    this.outer = constrain(constraints, { width: this.size.width + dw, height: this.size.height + dh });
    return this.outer;
  }

  /** Lay the children out inside `constraints` (already reduced by margin and padding). */
  protected layoutContent(constraints: Constraints, ctx: LayoutContext): Size {
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
    let hasFill = false;
    if (canFill) {
      const leftover = Math.max(0, mainMax - fixedTotal - gapTotal);
      for (let i = 0; i < n; i++) {
        const child = this.children[i]!;
        if (!(child instanceof FillNode)) continue;
        hasFill = true;
        const share = Math.max(0, child.share);
        const extent = totalShare > 0 ? (leftover * share) / totalShare : 0;
        this.childSizes[i] = child.layout(makeConstraints(axis, extent, extent, 0, crossMax), ctx);
      }
    }

    return this.finalize(constraints, ctx, n, !hasFill);
  }

  /**
   * Compute sizes and offsets for the first `count` children from
   * `childSizes`, applying `align` and (if `allowJustify`) `justify`.
   */
  protected finalize(constraints: Constraints, ctx: LayoutContext, count: number, allowJustify: boolean): Size {
    const axis = this.axis;
    const mainMax = main(axis, { width: constraints.maxWidth, height: constraints.maxHeight });
    this.placedCount = count;

    let mainTotal = 0;
    let crossChildMax = 0;
    for (let i = 0; i < count; i++) {
      const size = this.childSizes[i]!;
      mainTotal += main(axis, size) + (i < count - 1 ? this.gap : 0);
      crossChildMax = Math.max(crossChildMax, cross(axis, size));
    }

    // Justify: only with a bounded main axis, no fills, and leftover room.
    let mainStart = 0;
    let extraGap = 0;
    let mainWanted = mainTotal;
    const justify = allowJustify && Number.isFinite(mainMax) && this.justify !== "start" ? this.justify : "start";
    if (justify !== "start") {
      const leftover = Math.max(0, mainMax - mainTotal);
      mainWanted = mainMax;
      if (justify === "center") mainStart = leftover / 2;
      else if (justify === "end") mainStart = leftover;
      else if (count > 1) extraGap = leftover / (count - 1);
    }

    this.wanted = makeSize(axis, mainWanted, crossChildMax);
    this.size = constrain(constraints, this.wanted);
    const crossExtent = cross(axis, this.size);

    // Align and offsets.
    let pos = mainStart;
    for (let i = 0; i < count; i++) {
      let size = this.childSizes[i]!;
      let crossPos = 0;
      if (this.align === "stretch") {
        const m = main(axis, size);
        size = this.children[i]!.layout(makeConstraints(axis, m, m, crossExtent, crossExtent), ctx);
        this.childSizes[i] = size;
      } else if (this.align === "center") {
        crossPos = (crossExtent - cross(axis, size)) / 2;
      } else if (this.align === "end") {
        crossPos = crossExtent - cross(axis, size);
      }
      this.childOffsets[i] = makeOffset(axis, pos, crossPos);
      pos += main(axis, size) + (i < count - 1 ? this.gap + extraGap : 0);
    }

    this.overflowing = this.wanted.width > this.size.width || this.wanted.height > this.size.height;
    return this.size;
  }

  paint(ctx: PaintContext, offset: Offset): void {
    // margin -> background over the padded box -> padding -> children
    const boxOrigin = addOffset(offset, { x: this.margin.left, y: this.margin.top });
    if (this.background !== undefined) {
      const box = {
        width: Math.max(0, this.outer.width - horizontal(this.margin)),
        height: Math.max(0, this.outer.height - vertical(this.margin)),
      };
      ctx.renderer.fillRect(rectAt(boxOrigin, box), this.background);
    }
    const origin = addOffset(boxOrigin, { x: this.padding.left, y: this.padding.top });
    if (this.overflowing) {
      ctx.renderer.save();
      ctx.renderer.clip(rectAt(origin, this.size));
    }
    for (let i = 0; i < this.placedCount; i++) {
      this.children[i]!.paint(ctx, addOffset(origin, this.childOffsets[i]!));
    }
    if (this.overflowing) {
      ctx.renderer.restore();
    }
  }
}

// Axis helpers. "main" is the direction children are laid along;
// "cross" is the other one. For a row, main is width.

export function main(axis: Axis, size: Size): number {
  return axis === "horizontal" ? size.width : size.height;
}

export function cross(axis: Axis, size: Size): number {
  return axis === "horizontal" ? size.height : size.width;
}

export function makeSize(axis: Axis, mainExtent: number, crossExtent: number): Size {
  return axis === "horizontal"
    ? { width: mainExtent, height: crossExtent }
    : { width: crossExtent, height: mainExtent };
}

export function makeOffset(axis: Axis, mainPos: number, crossPos: number): Offset {
  return axis === "horizontal" ? { x: mainPos, y: crossPos } : { x: crossPos, y: mainPos };
}

export function makeConstraints(
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
