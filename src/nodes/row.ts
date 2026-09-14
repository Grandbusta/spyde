import type { Node } from "../core/node.js";
import { FlexNode, type FlexOptions } from "./flex.js";

/** Places children side by side, left to right. */
export class RowNode extends FlexNode {
  constructor(children: readonly Node[], options?: FlexOptions) {
    super("horizontal", children, options);
  }
}
