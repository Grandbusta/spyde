import { type PageSize, PdfKitRenderer } from "./backend/pdfkit.js";
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
 * Lay the tree out against the page content box and paint it, adding pages
 * while the root reports a remainder. Each page is clipped to the
 * content box; a child that fits nowhere is placed alone and clipped.
 */
export async function render(tree: Node, options: RenderOptions = {}): Promise<Uint8Array> {
  const renderer = new PdfKitRenderer({
    ...(options.size !== undefined ? { size: options.size } : {}),
    ...(options.fonts !== undefined ? { fonts: options.fonts } : {}),
  });

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

  return renderer.finish();
}
