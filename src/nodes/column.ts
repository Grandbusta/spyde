import type { Node } from "../core/node.js";
import { FlexNode, type FlexOptions } from "./flex.js";

/** Stacks children top to bottom. */
export class ColumnNode extends FlexNode {
  constructor(children: readonly Node[], options?: FlexOptions) {
    super("vertical", children, options);
  }
}
