import { type Constraints, constrain } from "../core/constraints.js";
import { type Offset, type Size, ZERO_SIZE } from "../core/geometry.js";
import type { LayoutContext, Node, PaintContext } from "../core/node.js";

/**
 * Starts a new page here. Zero size, draws nothing. A column that
 * reaches one in split mode stops and puts everything after it on the next
 * page. Outside a column it is inert.
 */
export class PageBreakNode implements Node {
  layout(constraints: Constraints, _ctx: LayoutContext): Size {
    return constrain(constraints, ZERO_SIZE);
  }
  paint(_ctx: PaintContext, _offset: Offset): void {}
}
