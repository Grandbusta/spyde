import type { Node } from "./core/node.js";
import { BUILTIN_FONTS, type TextStyle } from "./core/style.js";
import { BackgroundNode } from "./nodes/background.js";
import { EmptyNode } from "./nodes/empty.js";
import { FillNode } from "./nodes/fill.js";
import { FlexNode } from "./nodes/flex.js";
import { KeepNode } from "./nodes/keep.js";
import { PaddingNode } from "./nodes/padding.js";
import { SizedNode } from "./nodes/sized.js";
import { TableNode } from "./nodes/table.js";
import { TextNode } from "./nodes/text.js";

export interface Finding {
  /** "error": certainly not what was meant. "warning": probably not. */
  level: "error" | "warning";
  /** Where in the tree, e.g. `column[2] > row[0] > padding > fill`. */
  path: string;
  message: string;
}

export interface ValidateOptions {
  /** The fonts that will be registered at render time, so names can be checked. */
  fonts?: Record<string, unknown>;
  /** The render-level default style, so its font can be checked too. */
  defaultStyle?: TextStyle;
}

/**
 * Check a document for the mistakes that render without complaint and
 * produce a wrong page. Returns a list of findings; an empty list means
 * nothing was found. Never throws and never renders.
 *
 * Checks: a fill or spacer that is not a direct child of a row or column;
 * justify on a row or column that also has a fill or spacer; a table column
 * whose key no row has, or with neither key nor format; a font that is
 * neither built in nor registered; long text placed directly in a row.
 */
export function validate(tree: Node, options: ValidateOptions = {}): Finding[] {
  const findings: Finding[] = [];
  const known = new Set([...BUILTIN_FONTS, ...Object.keys(options.fonts ?? {})]);
  const checkFont = (style: TextStyle | undefined, path: string, what: string) => {
    const font = style?.font;
    if (font !== undefined && !known.has(font)) {
      findings.push({ level: "error", path, message: `${what} uses font "${font}", which is neither built in nor registered. Register it in render options: fonts: { "${font}": "./path/to/font.ttf" }.` });
    }
  };
  checkFont(options.defaultStyle, "render options", "defaultStyle");

  const walk = (node: Node, path: string, parent: Node | undefined) => {
    if (node instanceof FillNode) {
      if (!(parent instanceof FlexNode)) {
        const name = node.child instanceof EmptyNode ? "spacer()" : "fill()";
        findings.push({ level: "error", path, message: `${name} has no effect here: it must be a direct child of a row or column. Move the wrapper inside the fill, e.g. fill(padding(x, 8)) rather than padding(fill(x), 8).` });
      }
      walk(node.child, `${path} > ${kind(node.child)}`, node);
      return;
    }
    if (node instanceof TextNode) {
      checkFont(node.style, path, "text");
      if (parent instanceof FlexNode && parent.axis === "horizontal" && node.content.length > 60 && !node.content.includes("\n")) {
        findings.push({ level: "warning", path, message: `Text of ${node.content.length} characters sits directly in a row, so it stays on one line and may be clipped. Wrap it in fill() to give it a width to wrap in.` });
      }
      return;
    }
    if (node instanceof FlexNode) {
      const hasFill = node.children.some((c) => c instanceof FillNode);
      if (hasFill && node.options.justify !== undefined && node.options.justify !== "start") {
        findings.push({ level: "warning", path, message: `justify: "${node.options.justify}" is ignored because a child is a fill or spacer; fills already decide how the leftover space is used. Remove one or the other.` });
      }
      node.children.forEach((c, i) => walk(c, `${path} > ${kind(c)}[${i}]`, node));
      return;
    }
    if (node instanceof TableNode) {
      checkTable(node, path, findings, checkFont);
      return;
    }
    if (node instanceof PaddingNode || node instanceof BackgroundNode || node instanceof KeepNode || node instanceof SizedNode) {
      walk(node.child, `${path} > ${kind(node.child)}`, node);
    }
  };
  walk(tree, kind(tree), undefined);
  return findings;
}

function checkTable(
  table: TableNode<unknown>, path: string, findings: Finding[],
  checkFont: (style: TextStyle | undefined, path: string, what: string) => void,
): void {
  const opts = table.options as Record<string, unknown> & typeof table.options;
  if ("padding" in opts) {
    findings.push({ level: "warning", path, message: `table has no "padding" option. Use rowPadding for space around each row, or cell: { padding } for space inside each cell.` });
  }
  checkFont(opts.header?.style, `${path} > header`, "table header");
  checkFont(opts.cell?.style, `${path} > cell`, "table cell");
  const sample = table.rows.slice(0, 20) as Record<string, unknown>[];
  const keys = new Set<string>();
  for (const r of sample) if (r && typeof r === "object") for (const k of Object.keys(r)) keys.add(k);
  opts.columns.forEach((col, i) => {
    const cpath = `${path} > column[${i}]`;
    checkFont(col.style, cpath, "table column");
    if (col.key === undefined && col.format === undefined) {
      findings.push({ level: "warning", path: cpath, message: `Column ${label(col.label, i)} has neither key nor format, so every cell in it is empty.` });
      return;
    }
    if (col.key !== undefined && sample.length > 0 && !keys.has(String(col.key))) {
      const near = closest(String(col.key), [...keys]);
      findings.push({ level: "warning", path: cpath, message: `Column ${label(col.label, i)} reads key "${String(col.key)}", which no row has.${near ? ` Did you mean "${near}"?` : ""} Rows have: ${[...keys].join(", ")}.` });
    }
  });
}

function label(l: string | undefined, i: number): string {
  return l !== undefined ? `"${l}"` : `#${i + 1}`;
}

function kind(node: Node): string {
  if (node instanceof TextNode) return "text";
  if (node instanceof FillNode) return node.child instanceof EmptyNode ? "spacer" : "fill";
  if (node instanceof FlexNode) return node.axis === "horizontal" ? "row" : "column";
  if (node instanceof TableNode) return "table";
  if (node instanceof PaddingNode) return "padding";
  if (node instanceof BackgroundNode) return "background";
  if (node instanceof KeepNode) return "keep";
  if (node instanceof SizedNode) return node.axis;
  return (node.constructor?.name ?? "node").replace(/Node$/, "").toLowerCase();
}

/** Nearest string by edit distance, if reasonably close. */
function closest(target: string, candidates: string[]): string | undefined {
  let best: string | undefined;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = distance(target.toLowerCase(), c.toLowerCase());
    if (d < bestD) { bestD = d; best = c; }
  }
  return best !== undefined && bestD <= Math.max(2, Math.floor(target.length / 3)) ? best : undefined;
}

function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length]![b.length]!;
}
