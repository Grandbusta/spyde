// The public surface. Fourteen factories, one render function, and the
// types a user can see. Nothing else is exported; internals may change freely.

export {
  text, padding, background, fill, row, column,                       // milestone one
  keep, pageBreak, image, spacer, divider, width, height, table,      // milestone two
} from "./factories.js";
export { render, renderDisplayList, renderHtml } from "./render.js";

export type { RenderOptions } from "./render.js";
export type { PageSize } from "./backend/pdfkit.js";
export type { DisplayList, Page, Op } from "./backend/recording.js";
export type { HtmlOptions } from "./backend/html.js";
export type { FlexOptions, BoxOptions, Align, Justify } from "./nodes/flex.js";
export type { TableOptions, TableColumn, CellValue, RowAppearance } from "./nodes/table.js";
export type { ImageOptions } from "./nodes/image.js";
export type { DividerOptions } from "./nodes/divider.js";
export type { Insets, Size, Offset, Rect } from "./core/geometry.js";
export type { TextStyle } from "./core/style.js";
export type { Node } from "./core/node.js";
