import { type PageSize, PdfKitRenderer, type PdfKitRendererOptions } from "./backend/pdfkit.js";
import { type HtmlOptions, paintHtml } from "./backend/html.js";
import { type DisplayList, RecordingRenderer } from "./backend/recording.js";
import type { Renderer } from "./backend/renderer.js";
import { loose } from "./core/constraints.js";
import { type Insets, horizontal, resolveInsets, vertical } from "./core/geometry.js";
import { type LayoutContext, type Node, type PaintContext, isSplittable } from "./core/node.js";
import type { TextStyle } from "./core/style.js";

export interface RenderOptions {
  /** "A4", "LETTER", any PDFKit preset, or [width, height] in points. Default "A4". */
  size?: PageSize;
  /** Space between the page edge and the content. Default 40 on every side. */
  margins?: Insets;
  /** Font name -> file path or font bytes. */
  fonts?: Record<string, string | Uint8Array>;
  /** Applied to every text node that does not set the field itself. */
  defaultStyle?: TextStyle;
}

const DEFAULT_MARGINS = 40;

/**
 * The page loop, shared by every output. Lays the tree out against the
 * page content box and paints it, adding pages while the root reports a
 * remainder. Each page is clipped to the content box; a child that fits
 * nowhere is placed alone and clipped, never an error.
 */
function layoutPages(tree: Node, renderer: Renderer, options: RenderOptions): void {
  const page = renderer.pageSize();
  const margins = resolveInsets(options.margins ?? DEFAULT_MARGINS);
  const contentBox = {
    width: Math.max(0, page.width - horizontal(margins)),
    height: Math.max(0, page.height - vertical(margins)),
  };
  const origin = { x: margins.left, y: margins.top };

  const layoutCtx: LayoutContext = {
    measureText: (content, style, maxWidth) => renderer.measureText(content, style, maxWidth),
    imageSize: (src) => renderer.imageSize(src),
    defaultStyle: options.defaultStyle,
  };
  const paintCtx: PaintContext = { renderer };

  let node: Node | undefined = tree;
  let first = true;
  while (node) {
    if (!first) renderer.addPage();
    first = false;

    const remainder: Node | undefined = isSplittable(node)
      ? node.layoutPage(loose(contentBox), layoutCtx, { atPageTop: true }).remainder
      : (node.layout(loose(contentBox), layoutCtx), undefined);

    renderer.save();
    renderer.clip({ ...origin, ...contentBox });
    node.paint(paintCtx, origin);
    renderer.restore();

    node = remainder;
  }
}

function backendOptions(options: RenderOptions): PdfKitRendererOptions {
  return {
    ...(options.size !== undefined ? { size: options.size } : {}),
    ...(options.fonts !== undefined ? { fonts: options.fonts } : {}),
  };
}

/** Lay the tree out and produce the PDF bytes. */
export async function render(tree: Node, options: RenderOptions = {}): Promise<Uint8Array> {
  const renderer = new PdfKitRenderer(backendOptions(options));
  layoutPages(tree, renderer, options);
  return renderer.finish();
}

/**
 * Lay the tree out and return what would be drawn, page by page, as data.
 * Measured with PDFKit, so positions are identical to `render`'s. This is
 * what the HTML painter consumes; it is public for other painters and for
 * tests that want to inspect a layout without a PDF.
 */
export function renderDisplayList(tree: Node, options: RenderOptions = {}): DisplayList {
  const renderer = new RecordingRenderer(backendOptions(options));
  layoutPages(tree, renderer, options);
  return renderer.finish();
}

/**
 * Lay the tree out and paint it as an HTML fragment for a live preview.
 * Same layout as `render`, measured with PDFKit; only the painter differs.
 * See `HtmlOptions` for images, class prefix, and the stylesheet.
 */
export function renderHtml(tree: Node, options: RenderOptions & HtmlOptions = {}): string {
  return paintHtml(renderDisplayList(tree, options), options);
}
