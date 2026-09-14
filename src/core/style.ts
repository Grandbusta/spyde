/** Public text style, every field optional */
export interface TextStyle {
  /** Built-in PDFKit font name or a name registered via RenderOptions.fonts. */
  font?: string;
  /** Font size in points. */
  size?: number;
  /** Any color string PDFKit accepts (D6). */
  color?: string;
  /** Multiplier of size, e.g. 1.2. */
  lineHeight?: number;
  align?: "left" | "center" | "right";
}

/** Every field present. What nodes and the renderer actually work with. */
export interface ResolvedTextStyle {
  readonly font: string;
  readonly size: number;
  readonly color: string;
  readonly lineHeight: number;
  readonly align: "left" | "center" | "right";
}

/** Library defaults. */
export const DEFAULT_STYLE: ResolvedTextStyle = {
  font: "Helvetica",
  size: 12,
  color: "#000000",
  lineHeight: 1.2,
  align: "left",
};

/**
 * PDFKit's built-in fonts. These need no font file. Any other name must be
 * registered through RenderOptions.fonts before use.
 */
export const BUILTIN_FONTS: ReadonlySet<string> = new Set([
  "Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Helvetica-BoldOblique",
  "Times-Roman", "Times-Bold", "Times-Italic", "Times-BoldItalic",
  "Courier", "Courier-Bold", "Courier-Oblique", "Courier-BoldOblique",
  "Symbol", "ZapfDingbats",
]);

/**
 * Resolution order: node style, then render-level default, then
 * library default. Later layers only fill fields the earlier ones left unset.
 */
export function resolveStyle(
  node: TextStyle | undefined,
  renderDefault: TextStyle | undefined,
): ResolvedTextStyle {
  return {
    font: node?.font ?? renderDefault?.font ?? DEFAULT_STYLE.font,
    size: node?.size ?? renderDefault?.size ?? DEFAULT_STYLE.size,
    color: node?.color ?? renderDefault?.color ?? DEFAULT_STYLE.color,
    lineHeight: node?.lineHeight ?? renderDefault?.lineHeight ?? DEFAULT_STYLE.lineHeight,
    align: node?.align ?? renderDefault?.align ?? DEFAULT_STYLE.align,
  };
}
