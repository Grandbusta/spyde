import type { Rect, Size } from "../core/geometry.js";
import type { ResolvedTextStyle } from "../core/style.js";

/** What measuring a string reports back to layout. */
export interface TextMetrics {
  /** Width of the widest line after wrapping to maxWidth. */
  readonly width: number;
  /** Total height of all wrapped lines, including line spacing. */
  readonly height: number;
  readonly lineCount: number;
}

/**
 * The only seam between the layout engine and PDFKit. `backend/pdfkit.ts`
 * is the single file allowed to import pdfkit; everything else talks to this.
 * Tests use a fake implementation with a deterministic text measurer.
 */
export interface Renderer {
  /** Full page size in points, before margins. */
  pageSize(): Size;

  /**
   * Measure `content` wrapped to `maxWidth` in `style`. Layout uses this so
   * a text node's box matches exactly what drawText will paint.
   */
  measureText(content: string, style: ResolvedTextStyle, maxWidth: number): TextMetrics;

  /** Paint `content` inside `box`, wrapping to box.width. */
  drawText(content: string, style: ResolvedTextStyle, box: Rect): void;

  fillRect(rect: Rect, color: string): void;

  /** Push graphics state. Pair every call with restore(). */
  save(): void;

  /** Clip all subsequent drawing to `rect` until the matching restore() (D1). */
  clip(rect: Rect): void;

  /** Pop graphics state. */
  restore(): void;
}
