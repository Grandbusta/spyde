/**
 * The public vocabulary. Six words. Every one follows the single rule from
 * PLAN.md section 3.1: content first, settings second.
 */
import type { Insets } from "./core/geometry.js";
import type { Node } from "./core/node.js";
import type { TextStyle } from "./core/style.js";
import { BackgroundNode } from "./nodes/background.js";
import { ColumnNode } from "./nodes/column.js";
import { FillNode } from "./nodes/fill.js";
import type { FlexOptions } from "./nodes/flex.js";
import { PaddingNode } from "./nodes/padding.js";
import { RowNode } from "./nodes/row.js";
import { TextNode } from "./nodes/text.js";

/** Puts a string on the page. */
export function text(content: string, style?: TextStyle): Node {
  return new TextNode(content, style);
}

/** Adds empty space around something. */
export function padding(child: Node, insets: Insets): Node {
  return new PaddingNode(child, insets);
}

/** Paints a color behind something. */
export function background(child: Node, color: string): Node {
  return new BackgroundNode(child, color);
}

/** Makes something take the leftover space in its row or column. */
export function fill(child: Node, share: number = 1): Node {
  return new FillNode(child, share);
}

/** Places things side by side. */
export function row(children: Node[], options?: FlexOptions): Node {
  return new RowNode(children, options);
}

/** Stacks things top to bottom. */
export function column(children: Node[], options?: FlexOptions): Node {
  return new ColumnNode(children, options);
}
