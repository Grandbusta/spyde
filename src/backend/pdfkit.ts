import type { Rect, Size } from "../core/geometry.js";
import { BUILTIN_FONTS, type ResolvedTextStyle } from "../core/style.js";
import type { Platform } from "./platform.js";
import type { Renderer, TextMetrics } from "./renderer.js";

/**
 * PDFKit reads fonts and images from a Uint8Array directly, so bytes pass
 * straight through. A string is a file path, which only the Node platform
 * can read; PDFKit does that itself.
 */
function forPdfKit(src: string | Uint8Array, platform: Platform): string | Uint8Array {
  if (typeof src === "string") {
    platform.readFile(src);   // in a browser this throws a clear error before PDFKit tries the filesystem
    return src;
  }
  return src;
}

/** PDFKit takes the PDF dictionary's capitalised keys; empty values are left out. */
function pdfInfo(info: DocumentInfo): PDFKit.DocumentInfo {
  const out: PDFKit.DocumentInfo = {};
  if (info.title) out.Title = info.title;
  if (info.author) out.Author = info.author;
  if (info.subject) out.Subject = info.subject;
  if (info.keywords) out.Keywords = info.keywords;
  return out;
}

/** Page size: a PDFKit preset name like "A4" or "LETTER", or [width, height] in points. */
export type PageSize = string | [width: number, height: number];

/** Document properties written into the PDF, shown by viewers under "Properties". */
export interface DocumentInfo {
  title?: string;
  author?: string;
  subject?: string;
  /** Comma-separated, as PDF viewers expect. */
  keywords?: string;
}

export interface PdfKitRendererOptions {
  size?: PageSize;
  info?: DocumentInfo;
  /** Font name -> file path or font bytes. Registered once, usable by name in any text style. */
  fonts?: Record<string, string | Uint8Array>;
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
  private readonly imageSizes = new Map<string | Uint8Array, Size>();

  constructor(private readonly platform: Platform, options: PdfKitRendererOptions = {}) {
    this.doc = new platform.PDFDocument({
      size: options.size ?? "A4",
      margin: 0,          // the layout engine owns margins, not PDFKit
      autoFirstPage: true,
      ...(options.info ? { info: pdfInfo(options.info) } : {}),
    });
    for (const [name, src] of Object.entries(options.fonts ?? {})) {
      this.doc.registerFont(name, forPdfKit(src, this.platform) as string | Buffer);
      this.registered.add(name);
    }
  }

  pageSize(): Size {
    return { width: this.doc.page.width, height: this.doc.page.height };
  }

  addPage(): void {
    this.doc.addPage({ size: [this.doc.page.width, this.doc.page.height], margin: 0 });
  }

  imageSize(src: string | Uint8Array): Size {
    const cached = this.imageSizes.get(src);
    if (cached) return cached;
    // openImage is a public PDFKit method that the type definitions omit.
    const img = (this.doc as unknown as { openImage(s: string | Uint8Array): { width: number; height: number } })
      .openImage(forPdfKit(src, this.platform));
    const size = { width: img.width, height: img.height };
    this.imageSizes.set(src, size);
    return size;
  }

  drawImage(src: string | Uint8Array, box: Rect): void {
    this.doc.image(forPdfKit(src, this.platform) as string | Buffer, box.x, box.y, { width: box.width, height: box.height });
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
      return { width, height: lines.length * lineHeight, lineCount: lines.length, lines };
    }

    // Run PDFKit's own line wrapper without drawing, collecting each line it
    // emits. This is the path `heightOfString` uses, so the lines are exactly
    // the ones `drawText` will paint. The document's cursor is restored after.
    const doc = this.doc as unknown as {
      x: number; y: number;
      _text(text: string, x: number, y: number, options: object, lineCallback: (line: string) => void): void;
    };
    const { x, y } = doc;
    const lines: string[] = [];
    doc._text(content, x, y, { width: maxWidth, lineGap, height: Infinity }, (line) => {
      lines.push(line.replace(/\s+$/, ""));
    });
    doc.x = x;
    doc.y = y;
    let width = 0;
    for (const line of lines) width = Math.max(width, this.doc.widthOfString(line));
    return { width, height: lines.length * lineHeight, lineCount: lines.length, lines };
  }

  drawText(content: string, style: ResolvedTextStyle, box: Rect, _lines: readonly string[]): void {
    this.applyStyle(style);
    this.doc.text(content, box.x, box.y, {
      width: box.width + EPSILON,
      height: box.height + this.doc.currentLineHeight(true) + EPSILON,
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

  /** End the document and collect the bytes as a plain Uint8Array. Call once. */
  finish(): Promise<Uint8Array<ArrayBuffer>> {
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      this.doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));
      this.doc.on("end", () => {
        const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
        let offset = 0;
        for (const c of chunks) { out.set(c, offset); offset += c.byteLength; }
        resolve(out);
      });
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
