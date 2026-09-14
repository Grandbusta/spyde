// The public surface. Six factories, one render function, and the types a
// user can see. Nothing else is exported; internals may change freely.

export { text, padding, background, fill, row, column } from "./factories.js";
export { render } from "./render.js";

export type { RenderOptions } from "./render.js";
export type { PageSize } from "./backend/pdfkit.js";
export type { FlexOptions } from "./nodes/flex.js";
export type { Insets, Size, Offset, Rect } from "./core/geometry.js";
export type { TextStyle } from "./core/style.js";
export type { Node } from "./core/node.js";
