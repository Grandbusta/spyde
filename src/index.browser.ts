// Browser entry. Same API as index.ts; fonts and images must be bytes, not
// paths. Bundlers pick this file through the package's `browser` condition.

export {
  text, padding, background, fill, row, column,                       // milestone one
  keep, pageBreak, image, spacer, divider, width, height, table,      // milestone two
} from "./factories.js";
import { createSpyde } from "./render.js";
import { browserPlatform } from "./platform/browser.js";

const spyde = createSpyde(browserPlatform);
/** Lay the tree out and produce the PDF bytes. */
export const render = spyde.render;
/** The same layout as data: pages of text, rect, image, and clip ops. */
export const renderDisplayList = spyde.renderDisplayList;
/** The same layout as an HTML fragment for a live preview. */
export const renderHtml = spyde.renderHtml;
export { validate } from "./validate.js";
export type { Finding, ValidateOptions } from "./validate.js";

export type { RenderOptions } from "./render.js";
export type { PageSize, DocumentInfo } from "./backend/pdfkit.js";
export type { DisplayList, Page, Op } from "./backend/recording.js";
export type { HtmlOptions } from "./backend/html.js";
export type { FlexOptions, BoxOptions, Align, Justify } from "./nodes/flex.js";
export type { TableOptions, TableColumn, CellValue, RowAppearance } from "./nodes/table.js";
export type { ImageOptions } from "./nodes/image.js";
export type { DividerOptions } from "./nodes/divider.js";
export type { Insets, Size, Offset, Rect } from "./core/geometry.js";
export type { TextStyle } from "./core/style.js";
export type { Node } from "./core/node.js";
