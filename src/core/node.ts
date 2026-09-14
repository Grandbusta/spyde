import type { Renderer, TextMetrics } from "../backend/renderer.js";
import type { Constraints } from "./constraints.js";
import type { Offset, Size } from "./geometry.js";
import type { ResolvedTextStyle, TextStyle } from "./style.js";

/** Passed down during the layout pass. */
export interface LayoutContext {
  /** See Renderer.measureText. */
  measureText(content: string, style: ResolvedTextStyle, maxWidth: number): TextMetrics;
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
 * 1. `layout` is called once, top-down. The node receives constraints from
 *    its parent, lays out its children, remembers their sizes and offsets,
 *    and returns its own size. The returned size MUST satisfy the
 *    constraints; use `constrain()` before returning (D1).
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
