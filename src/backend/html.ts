import { readFileSync } from "node:fs";
import type { ResolvedTextStyle } from "../core/style.js";
import type { DisplayList, Op } from "./recording.js";

export interface HtmlOptions {
  /** Turn an image source into a URL. Default: a data URI (a path is read once per call). */
  imageSrc?: (src: string | Uint8Array) => string;
  /** CSS class prefix. Default "spyde". */
  classPrefix?: string;
  /** "inline" (default) puts the <style> block at the top of the fragment; "none" omits it. */
  stylesheet?: "inline" | "none";
  /** Indent by nesting and put each line of text on its own line. Default false (compact). */
  pretty?: boolean;
}

/**
 * Turn a display list into an HTML fragment: one <style> block, then one
 * positioned container per page with one element per op. Every position
 * and size is in CSS pt, 1:1 with the layout. Text is one block per line
 * PDFKit produced, with wrapping off, so the browser never re-wraps. All
 * text and attribute values are escaped; no user string becomes markup.
 */
export function paintHtml(list: DisplayList, options: HtmlOptions = {}): string {
  const prefix = options.classPrefix ?? "spyde";
  const imageSrc = options.imageSrc ?? makeDataUriResolver();
  const styles = new StyleTable(prefix);
  for (const page of list) collectStyles(page.ops, styles);

  const w = new Writer(options.pretty ?? false);
  if ((options.stylesheet ?? "inline") === "inline") w.raw(styles.stylesheet());
  list.forEach((page, i) => {
    w.open(`<div class="${prefix}-page" data-page="${i + 1}" style="width:${pt(page.width)};height:${pt(page.height)}">`);
    paintOps(page.ops, 0, 0, prefix, styles, imageSrc, w);
    w.close("</div>");
  });
  return w.toString();
}

/** Collects output lines; indents by nesting when pretty. */
class Writer {
  private readonly lines: string[] = [];
  private depth = 0;
  constructor(private readonly pretty: boolean) {}
  raw(s: string): void { this.lines.push(s); }
  line(s: string): void { this.lines.push(this.pretty ? "  ".repeat(this.depth) + s : s); }
  open(s: string): void { this.line(s); this.depth++; }
  close(s: string): void { this.depth--; this.line(s); }
  /** A text box: compact on one line, or one line per inner div when pretty. */
  text(openTag: string, innerDivs: string[], closeTag: string): void {
    if (!this.pretty) { this.lines.push(openTag + innerDivs.join("") + closeTag); return; }
    this.open(openTag);
    for (const d of innerDivs) this.line(d);
    this.close(closeTag);
  }
  toString(): string { return this.lines.join("\n"); }
}

function collectStyles(ops: Op[], styles: StyleTable): void {
  for (const op of ops) {
    if (op.op === "text") styles.classFor(op.style);
    else if (op.op === "clip") collectStyles(op.children, styles);
  }
}

function paintOps(
  ops: Op[], originX: number, originY: number,
  prefix: string, styles: StyleTable, imageSrc: (src: string | Uint8Array) => string, w: Writer,
): void {
  for (const op of ops) {
    const box = `left:${pt(op.x - originX)};top:${pt(op.y - originY)};width:${pt(op.width)};height:${pt(op.height)}`;
    switch (op.op) {
      case "text": {
        const field = op.style.field !== undefined ? ` data-field="${escapeAttr(op.style.field)}"` : "";
        const lines = op.lines.map((l) => `<div>${l === "" ? "&nbsp;" : escapeText(l)}</div>`);
        w.text(`<div class="${prefix}-text ${styles.classFor(op.style)}"${field} style="${box}">`, lines, "</div>");
        break;
      }
      case "rect":
        w.line(`<div class="${prefix}-rect" style="${box};background:${escapeAttr(op.color)}"></div>`);
        break;
      case "image":
        w.line(`<img class="${prefix}-image" alt="" src="${escapeAttr(imageSrc(op.src))}" style="${box}">`);
        break;
      case "clip":
        w.open(`<div class="${prefix}-clip" style="${box}">`);
        paintOps(op.children, op.x, op.y, prefix, styles, imageSrc, w);
        w.close("</div>");
        break;
    }
  }
}

/** Distinct resolved text styles, numbered in order of first appearance. */
class StyleTable {
  private readonly classes = new Map<string, { name: string; style: ResolvedTextStyle }>();
  constructor(private readonly prefix: string) {}

  classFor(style: ResolvedTextStyle): string {
    const key = `${style.font}|${style.size}|${style.color}|${style.lineHeight}|${style.align}`;
    let entry = this.classes.get(key);
    if (!entry) {
      entry = { name: `${this.prefix}-s${this.classes.size + 1}`, style };
      this.classes.set(key, entry);
    }
    return entry.name;
  }

  stylesheet(): string {
    const p = this.prefix;
    const rules = [
      `.${p}-page{position:relative;overflow:hidden;background:#fff}`,
      `.${p}-text{position:absolute;overflow:hidden;white-space:nowrap}`,
      `.${p}-rect,.${p}-image,.${p}-clip{position:absolute}`,
      `.${p}-clip{overflow:hidden}`,
      `.${p}-image{display:block}`,
    ];
    for (const { name, style } of this.classes.values()) {
      const font = cssFont(style.font);
      rules.push(
        `.${name}{font-family:${font.family};font-weight:${font.weight};font-style:${font.style};` +
        `font-size:${pt(style.size)};line-height:${pt(style.size * style.lineHeight)};` +
        `color:${escapeAttr(style.color)};text-align:${style.align}}`,
      );
    }
    return `<style>\n${rules.join("\n")}\n</style>`;
  }
}

/** Built-in PDFKit font names map to CSS families; registered names pass through. */
export function cssFont(name: string): { family: string; weight: "normal" | "bold"; style: "normal" | "italic" } {
  const weight = /-Bold/.test(name) ? "bold" : "normal";
  const style = /-(Oblique|Italic)|BoldOblique|BoldItalic/.test(name) ? "italic" : "normal";
  let family: string;
  if (name.startsWith("Helvetica")) family = "Helvetica, Arial, sans-serif";
  else if (name.startsWith("Times")) family = '"Times New Roman", Times, serif';
  else if (name.startsWith("Courier")) family = '"Courier New", Courier, monospace';
  else if (name === "Symbol") family = "Symbol, serif";
  else if (name === "ZapfDingbats") family = '"Zapf Dingbats", "ZapfDingbats", serif';
  else family = `"${name.replace(/"/g, "")}"`;
  return { family, weight, style };
}

function makeDataUriResolver(): (src: string | Uint8Array) => string {
  const cache = new Map<string | Uint8Array, string>();
  return (src) => {
    const hit = cache.get(src);
    if (hit) return hit;
    const bytes = typeof src === "string" ? new Uint8Array(readFileSync(src)) : src;
    const mime = bytes[0] === 0x89 && bytes[1] === 0x50 ? "image/png" : bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg" : "application/octet-stream";
    const uri = `data:${mime};base64,${Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64")}`;
    cache.set(src, uri);
    return uri;
  };
}

function pt(n: number): string {
  return `${Math.round(n * 100) / 100}pt`;
}

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, "&quot;");
}
