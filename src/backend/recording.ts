import type { Rect, Size } from "../core/geometry.js";
import type { ResolvedTextStyle } from "../core/style.js";
import { PdfKitRenderer, type PdfKitRendererOptions } from "./pdfkit.js";
import type { Renderer, TextMetrics } from "./renderer.js";

/**
 * One drawing operation. Coordinates are absolute page coordinates in
 * points, exactly as the layout pass produced them; a clip's children are
 * not re-based, a painter subtracts the clip's origin if it needs to.
 */
export type Op =
  | { op: "text"; x: number; y: number; width: number; height: number; lines: string[]; style: ResolvedTextStyle }
  | { op: "rect"; x: number; y: number; width: number; height: number; color: string }
  | { op: "image"; x: number; y: number; width: number; height: number; src: string | Uint8Array }
  | { op: "clip"; x: number; y: number; width: number; height: number; children: Op[] };

export interface Page {
  readonly width: number;
  readonly height: number;
  readonly ops: Op[];
}

/** Everything a document draws, page by page. What the HTML painter consumes. */
export type DisplayList = Page[];

/**
 * A renderer that measures with a real PDFKit document, so layout is
 * identical to the PDF's, but records drawing calls as data instead of
 * drawing. Its PDFKit document is never drawn on and never finished.
 */
export class RecordingRenderer implements Renderer {
  private readonly measurer: PdfKitRenderer;
  private readonly pages: Page[] = [];
  /** Where ops currently go: the page's list, or the children of an open clip. */
  private targets: Op[][] = [];
  /** Depth of `targets` at each save(), so restore() can close any clips since. */
  private saves: number[] = [];

  constructor(options: PdfKitRendererOptions = {}) {
    this.measurer = new PdfKitRenderer(options);
    this.addPage();
  }

  pageSize(): Size {
    return this.measurer.pageSize();
  }

  addPage(): void {
    const { width, height } = this.measurer.pageSize();
    const page: Page = { width, height, ops: [] };
    this.pages.push(page);
    this.targets = [page.ops];
    this.saves = [];
  }

  measureText(content: string, style: ResolvedTextStyle, maxWidth: number): TextMetrics {
    return this.measurer.measureText(content, style, maxWidth);
  }

  imageSize(src: string | Uint8Array): Size {
    return this.measurer.imageSize(src);
  }

  drawText(_content: string, style: ResolvedTextStyle, box: Rect, lines: readonly string[]): void {
    this.current().push({ op: "text", ...box, lines: [...lines], style });
  }

  fillRect(rect: Rect, color: string): void {
    this.current().push({ op: "rect", ...rect, color });
  }

  drawImage(src: string | Uint8Array, box: Rect): void {
    this.current().push({ op: "image", ...box, src });
  }

  save(): void {
    this.saves.push(this.targets.length);
  }

  clip(rect: Rect): void {
    const clip: Op = { op: "clip", ...rect, children: [] };
    this.current().push(clip);
    this.targets.push(clip.children);
  }

  restore(): void {
    const depth = this.saves.pop() ?? 1;
    this.targets.length = Math.max(1, depth);
  }

  /** The recorded pages. Call once painting is done. */
  finish(): DisplayList {
    return this.pages;
  }

  private current(): Op[] {
    return this.targets[this.targets.length - 1]!;
  }
}
