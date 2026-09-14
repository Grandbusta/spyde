/**
 * The public vocabulary. Fourteen words. Every one follows the single rule
 * from PLAN.md section 3.1: content first, settings second.
 */
import type { Insets } from "./core/geometry.js";
import type { Node } from "./core/node.js";
import type { TextStyle } from "./core/style.js";
import { BackgroundNode } from "./nodes/background.js";
import { ColumnNode } from "./nodes/column.js";
import { DividerNode, type DividerOptions } from "./nodes/divider.js";
import { EmptyNode } from "./nodes/empty.js";
import { FillNode } from "./nodes/fill.js";
import type { FlexOptions } from "./nodes/flex.js";
import { ImageNode, type ImageOptions } from "./nodes/image.js";
import { KeepNode } from "./nodes/keep.js";
import { PaddingNode } from "./nodes/padding.js";
import { PageBreakNode } from "./nodes/pageBreak.js";
import { RowNode } from "./nodes/row.js";
import { HeightNode, WidthNode } from "./nodes/sized.js";
import { TableNode, type TableOptions } from "./nodes/table.js";
import { TextNode } from "./nodes/text.js";

// Milestone one

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

/** Stacks things top to bottom. Splits across pages when it has to, unless `keep` is set. */
export function column(children: Node[], options?: FlexOptions & { keep?: boolean }): Node {
  const { keep: keepTogether, ...rest } = options ?? {};
  const node = new ColumnNode(children, rest);
  return keepTogether ? new KeepNode(node) : node;
}

// Milestone two

/** Keeps something on one page. Moves it whole to the next page if it does not fit. */
export function keep(child: Node): Node {
  return new KeepNode(child);
}

/** Starts a new page here. */
export function pageBreak(): Node {
  return new PageBreakNode();
}

/** Puts a picture on the page. PNG or JPEG, path or bytes. */
export function image(src: string | Uint8Array, options?: ImageOptions): Node {
  return new ImageNode(src, options);
}

/** Takes leftover space and draws nothing. Pushes neighbours apart. */
export function spacer(): Node {
  return new FillNode(new EmptyNode());
}

/** Draws a line across the available width (or height, in a row). */
export function divider(options?: DividerOptions): Node {
  return new DividerNode(options);
}

/** Makes something exactly this wide. */
export function width(child: Node, points: number): Node {
  return new WidthNode(child, points);
}

/** Makes something exactly this tall. */
export function height(child: Node, points: number): Node {
  return new HeightNode(child, points);
}

/**
 * Rows and columns of cells, with a header that repeats on every page.
 * `rows` is your data; each column says which field to show and how.
 */
export function table<T>(rows: T[], options: TableOptions<T> & { keep?: boolean }): Node {
  const { keep: keepTogether, ...rest } = options;
  const node = new TableNode(rows, rest);
  return keepTogether ? new KeepNode(node) : node;
}
