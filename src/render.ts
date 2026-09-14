import { type PageSize, PdfKitRenderer } from "./backend/pdfkit.js";
import { loose } from "./core/constraints.js";
import { type Insets, horizontal, resolveInsets, vertical } from "./core/geometry.js";
import type { LayoutContext, Node, PaintContext } from "./core/node.js";
import type { TextStyle } from "./core/style.js";

export interface RenderOptions {
  /** "A4", "LETTER", any PDFKit preset, or [width, height] in points. Default "A4". */
  size?: PageSize;
  /** Space between the page edge and the content. Default 40 on every side. */
  margins?: Insets;
  /** Font name -> file path or font bytes. See D2. */
  fonts?: Record<string, string | Buffer>;
  /** Applied to every text node that does not set the field itself. See D2. */
  defaultStyle?: TextStyle;
}

const DEFAULT_MARGINS = 40;

/**
 * Lay the tree out against the page content box and paint it. Single page
 * (milestone one). Anything that does not fit is clipped to the content box.
 */
export async function render(tree: Node, options: RenderOptions = {}): Promise<Buffer> {
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

  const layoutCtx: LayoutContext = {
    measureText: (content, style, maxWidth) => renderer.measureText(content, style, maxWidth),
    defaultStyle: options.defaultStyle,
  };
  tree.layout(loose(contentBox), layoutCtx);

  const paintCtx: PaintContext = { renderer };
  renderer.save();
  renderer.clip({ x: margins.left, y: margins.top, ...contentBox });
  tree.paint(paintCtx, { x: margins.left, y: margins.top });
  renderer.restore();

  return renderer.finish();
}
