import type { Renderer, TextMetrics } from "../backend/renderer.js";
import type { Constraints } from "./constraints.js";
import type { Offset, Size } from "./geometry.js";
import type { ResolvedTextStyle, TextStyle } from "./style.js";

/** Passed down during the layout pass. */
export interface LayoutContext {
  /** See Renderer.measureText. */
  measureText(content: string, style: ResolvedTextStyle, maxWidth: number): TextMetrics;
  /** See Renderer.imageSize. */
  imageSize(src: string | Uint8Array): Size;
  /** Render-level default text style (RenderOptions.defaultStyle), if any. */
  readonly defaultStyle: TextStyle | undefined;
}

/** Passed down during the paint pass. */
export interface PaintContext {
  readonly renderer: Renderer;
}

/**
 * Every node implements this. Two passes:
 *
 * 1. `layout` is called top-down. The node receives constraints from its
 *    parent, lays out its children, remembers their sizes and offsets, and
 *    returns its own size. The returned size MUST satisfy the constraints;
 *    use `constrain()` before returning. A node may be laid out more
 *    than once (alignment "stretch", pagination); each call overwrites the
 *    stored state.
 *
 * 2. `paint` is called once, top-down. `offset` is the absolute position of
 *    this node's top-left corner on the page. The node draws itself and then
 *    paints its children at `offset + childOffset` using the values it
 *    stored during layout. Paint never measures anything.
 */
export interface Node {
  layout(constraints: Constraints, ctx: LayoutContext): Size;
  paint(ctx: PaintContext, offset: Offset): void;
}

/** What `layoutPage` reports back to the render loop or a parent column. */
export interface PageResult {
  /** Size of the part placed on this page. */
  readonly size: Size;
  /** What did not fit, to be laid out on the next page. Absent when everything fit. */
  readonly remainder?: Node;
  /**
   * How many direct children were consumed on this page: placed, or passed
   * over as page breaks. 0 with a remainder means "nothing fit, move me whole".
   */
  readonly placed: number;
}

export interface PageOptions {
  /** True when this node is being laid out at the very top of a fresh page. */
  readonly atPageTop: boolean;
}

/**
 * A node that can split its content across pages. Only `column` and
 * `table` implement it. Everything else is placed whole.
 */
export interface Splittable extends Node {
  layoutPage(constraints: Constraints, ctx: LayoutContext, page: PageOptions): PageResult;
}

export function isSplittable(node: Node): node is Splittable {
  return typeof (node as Partial<Splittable>).layoutPage === "function";
}
