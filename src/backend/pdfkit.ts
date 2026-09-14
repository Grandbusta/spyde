import PDFDocument from "pdfkit";
import type { Rect, Size } from "../core/geometry.js";
import { BUILTIN_FONTS, type ResolvedTextStyle } from "../core/style.js";
import type { Renderer, TextMetrics } from "./renderer.js";

/** Page size: a PDFKit preset name like "A4" or "LETTER", or [width, height] in points. */
export type PageSize = string | [width: number, height: number];

export interface PdfKitRendererOptions {
  size?: PageSize;
  /** Font name -> file path or font bytes. Registered once, usable by name in any text style. */
  fonts?: Record<string, string | Buffer>;
}

/**
 * Tiny epsilon added to text box width and height when drawing. Layout and
 * paint measure with the same PDFKit calls, but the wrapper accumulates
 * float32-rounded word widths, so an exact box can spuriously wrap the last
 * word or drop the last line. The epsilon can only make PDFKit draw *fewer*
 * lines than measured (never more), and the node's clip bounds everything.
 */
const EPSILON = 0.01;

/**
 * The only file that imports pdfkit. Implements the seven-method Renderer
 * interface and owns the document lifecycle.
 */
export class PdfKitRenderer implements Renderer {
  readonly doc: PDFKit.PDFDocument;
  private readonly registered = new Set<string>();

  constructor(options: PdfKitRendererOptions = {}) {
    this.doc = new PDFDocument({
      size: options.size ?? "A4",
      margin: 0,          // the layout engine owns margins, not PDFKit
      autoFirstPage: true,
    });
    for (const [name, src] of Object.entries(options.fonts ?? {})) {
      this.doc.registerFont(name, src);
      this.registered.add(name);
    }
  }

  pageSize(): Size {
    return { width: this.doc.page.width, height: this.doc.page.height };
  }

  measureText(content: string, style: ResolvedTextStyle, maxWidth: number): TextMetrics {
    this.applyStyle(style);
    const lineHeight = style.size * style.lineHeight;
    const lineGap = this.lineGapFor(style);

    if (!Number.isFinite(maxWidth)) {
      // Unbounded: no wrapping. One line per explicit newline.
      const lines = content.split("\n");
      let width = 0;
      for (const line of lines) width = Math.max(width, this.doc.widthOfString(line));
      return { width, height: lines.length * lineHeight, lineCount: lines.length };
    }

    const bounds = this.doc.boundsOfString(content, { width: maxWidth, lineGap });
    const lineCount = Math.max(1, Math.round(bounds.height / lineHeight));
    return { width: bounds.width, height: bounds.height, lineCount };
  }

  drawText(content: string, style: ResolvedTextStyle, box: Rect): void {
    this.applyStyle(style);
    this.doc.text(content, box.x, box.y, {
      width: box.width + EPSILON,
      height: box.height + EPSILON,   // `height` makes PDFKit stop instead of adding a page
      align: style.align,
      lineGap: this.lineGapFor(style),
    });
  }

  fillRect(rect: Rect, color: string): void {
    this.doc.rect(rect.x, rect.y, rect.width, rect.height).fill(color);
  }

  save(): void {
    this.doc.save();
  }

  clip(rect: Rect): void {
    this.doc.rect(rect.x, rect.y, rect.width, rect.height).clip();
  }

  restore(): void {
    this.doc.restore();
  }

  /** End the document and collect the bytes. Call once. */
  finish(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      this.doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      this.doc.on("end", () => resolve(Buffer.concat(chunks)));
      this.doc.on("error", reject);
      this.doc.end();
    });
  }

  private applyStyle(style: ResolvedTextStyle): void {
    if (!BUILTIN_FONTS.has(style.font) && !this.registered.has(style.font)) {
      throw new Error(
        `Unknown font "${style.font}". Use one of the built-in fonts ` +
        `(Helvetica, Times-Roman, Courier, ...) or register it in render options: ` +
        `fonts: { "${style.font}": "./path/to/font.ttf" }`,
      );
    }
    this.doc.font(style.font).fontSize(style.size).fillColor(style.color);
  }

  /**
   * PDFKit's line height is the font's natural height plus an optional gap.
   * We want `size * lineHeight`, so the gap is the difference. May be negative.
   */
  private lineGapFor(style: ResolvedTextStyle): number {
    return style.size * style.lineHeight - this.doc.currentLineHeight(true);
  }
}
