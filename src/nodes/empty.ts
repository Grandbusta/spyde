import { type Constraints, constrain } from "../core/constraints.js";
import { type Offset, type Size, ZERO_SIZE } from "../core/geometry.js";
import type { LayoutContext, Node, PaintContext } from "../core/node.js";

/** Zero size, draws nothing. Internal; `spacer()` is a fill around one of these. */
export class EmptyNode implements Node {
  layout(constraints: Constraints, _ctx: LayoutContext): Size {
    return constrain(constraints, ZERO_SIZE);
  }
  paint(_ctx: PaintContext, _offset: Offset): void {}
}
