import { type Constraints, constrain, INFINITY } from "../core/constraints.js";
import { type Offset, type Size, ZERO_SIZE } from "../core/geometry.js";
import type { LayoutContext, Node, PageOptions, PageResult, PaintContext, Splittable } from "../core/node.js";
import type { Insets } from "../core/geometry.js";
import type { TextStyle } from "../core/style.js";
import { BackgroundNode } from "./background.js";
import { ColumnNode } from "./column.js";
import type { FlexOptions } from "./flex.js";
import { FillNode } from "./fill.js";
import { PaddingNode } from "./padding.js";
import { RowNode } from "./row.js";
import { WidthNode } from "./sized.js";
import { TextNode } from "./text.js";

/** What a cell can be: text (strings and numbers become text nodes) or any node. */
export type CellValue = string | number | Node;

interface ColumnBase {
  /** Text shown in the header row. Omit on every column for a table with no header row. */
  label?: string;
  /** Share of the leftover width. Default 1. Ignored when `width` is set. */
  share?: number;
  /** Exact width in points. */
  width?: number;
  /** Applied to text cells (header included) that do not set their own align. */
  align?: NonNullable<TextStyle["align"]>;
  /** Text style for this column's body cells. Beats the row's style and `cell.style`. */
  style?: TextStyle;
  /** Colour behind this column's cells, header included. Painted over the row's background. */
  background?: string;
}

/** A column that reads one field of the row, optionally formatting it with `format`. */
type KeyedColumn<T> = {
  [K in keyof T]: ColumnBase & {
    key: K;
    format?: (value: T[K], row: T) => CellValue;
  };
}[keyof T];

/** A column computed from the whole row. */
type ComputedColumn<T> = ColumnBase & {
  key?: undefined;
  format: (value: undefined, row: T) => CellValue;
};

export type TableColumn<T> = KeyedColumn<T> | ComputedColumn<T>;

export interface TableOptions<T> {
  columns: TableColumn<T>[];
  /** How the header row looks. Text style defaults to bold. */
  header?: {
    style?: TextStyle;
    /** Colour painted behind the header row. */
    background?: string;
  };
  /**
   * Per-row appearance, decided from the data. Return nothing for the
   * defaults. Background is painted across the whole row.
   */
  row?: (row: T, index: number) => RowAppearance | undefined;
  /** Defaults for every cell. */
  cell?: {
    /** Text style for cells made from strings and numbers. Lowest precedence. */
    style?: TextStyle;
    /** Space inside every cell. Column and cell backgrounds fill the padded cell. */
    padding?: Insets;
  };
  /**
   * Space inside every row, header included, so the header band and the
   * body cells stay aligned. Same forms as `padding`.
   */
  rowPadding?: Insets;
  /** Space between columns. Default 8. */
  gap?: number;
  /** Space between rows. Default 0. */
  rowGap?: number;
  /** Colour behind the whole table. Each page fragment gets its own. */
  background?: string;
  /** Space outside the table. */
  margin?: Insets;
}

const DEFAULT_HEADER_STYLE: TextStyle = { font: "Helvetica-Bold" };

/** What the `row` function returns. Either field may be left undefined. */
export interface RowAppearance {
  style?: TextStyle | undefined;
  background?: string | undefined;
}

/** Later arguments win, but only for fields they actually set. */
function mergeStyles(...layers: (TextStyle | undefined)[]): TextStyle | undefined {
  let out: TextStyle | undefined;
  for (const layer of layers) {
    if (!layer) continue;
    out = { ...out };
    for (const [k, v] of Object.entries(layer)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * Rows and columns of cells. Rows are plain data; each column says
 * which field to show, how to format it, its header, width and alignment.
 * Underneath it is a column of rows of fills, so it adds no layout math.
 * The only thing a table does that you could not write by hand is repeat
 * its header on every page.
 */
export class TableNode<T> implements Splittable {
  private readonly headerRow: Node | undefined;
  private readonly bodyRows: Node[];
  private readonly rowGap: number;
  /** All rows; used when everything fits on one page. */
  private readonly full: ColumnNode;
  /** The rows placed on the current page, when split. */
  private pageColumn: ColumnNode | undefined;
  /** Measured row heights by available width, shared with remainders so each row is measured once. */
  private readonly heights: Map<Node, Map<number, number>>;

  constructor(
    rows: T[],
    private readonly options: TableOptions<T>,
    /** Internal: a remainder reuses the already-built rows instead of rebuilding them. */
    prebuilt?: { headerRow: Node | undefined; bodyRows: Node[]; heights: Map<Node, Map<number, number>> },
  ) {
    this.rowGap = options.rowGap ?? 0;
    if (prebuilt) {
      this.headerRow = prebuilt.headerRow;
      this.bodyRows = prebuilt.bodyRows;
      this.heights = prebuilt.heights;
    } else {
      const cols = options.columns;
      const hasHeader = cols.some((c) => c.label !== undefined);
      this.headerRow = hasHeader
        ? this.makeRow(
            cols.map((c) => new TextNode(c.label ?? "", options.header?.style ?? DEFAULT_HEADER_STYLE)),
            options.header?.background,
          )
        : undefined;
      this.bodyRows = rows.map((row, i) => {
        const per = options.row?.(row, i);
        return this.makeRow(cols.map((c) => this.cellFor(c, row, per?.style)), per?.background);
      });
      this.heights = new Map();
    }
    this.full = new ColumnNode(this.allRows(this.bodyRows), this.columnOptions());
  }

  layout(constraints: Constraints, ctx: LayoutContext): Size {
    this.pageColumn = undefined;
    return this.full.layout(constraints, ctx);
  }

  paint(ctx: PaintContext, offset: Offset): void {
    (this.pageColumn ?? this.full).paint(ctx, offset);
  }

  /**
   * Pagination. Measure the header, then rows one by one until one does not
   * fit. Heights are cached per width and shared with the remainder, so a
   * long table is measured once overall. A header with no rows under it is
   * never left at the bottom of a page.
   */
  layoutPage(constraints: Constraints, ctx: LayoutContext, page: PageOptions): PageResult {
    const inner = this.full.innerOf(constraints);
    if (!Number.isFinite(inner.maxHeight)) {
      this.pageColumn = undefined;
      return { size: this.full.layout(constraints, ctx), placed: this.bodyRows.length + (this.headerRow ? 1 : 0) };
    }

    const measure: Constraints = { minWidth: 0, maxWidth: inner.maxWidth, minHeight: 0, maxHeight: INFINITY };
    let used = this.headerRow ? this.heightOf(this.headerRow, measure, ctx) : 0;
    let placed = 0;
    for (const row of this.bodyRows) {
      const gapBefore = used > 0 ? this.rowGap : 0;
      const h = this.heightOf(row, measure, ctx);
      if (h <= inner.maxHeight - used - gapBefore || (placed === 0 && page.atPageTop)) {
        used += gapBefore + h;
        placed++;
      } else {
        break;
      }
    }

    const headerCount = this.headerRow ? 1 : 0;
    if (placed === this.bodyRows.length) {
      this.pageColumn = undefined;
      return { size: this.full.layout(constraints, ctx), placed: placed + headerCount };
    }
    if (placed === 0) {
      this.pageColumn = undefined;
      return { size: constrain(constraints, ZERO_SIZE), remainder: this, placed: 0 };
    }

    this.pageColumn = new ColumnNode(this.allRows(this.bodyRows.slice(0, placed)), this.columnOptions());
    const size = this.pageColumn.layout(constraints, ctx);
    const remainder = new TableNode<T>([], this.options, {
      headerRow: this.headerRow,
      bodyRows: this.bodyRows.slice(placed),
      heights: this.heights,
    });
    return { size, remainder, placed: placed + headerCount };
  }

  private heightOf(row: Node, measure: Constraints, ctx: LayoutContext): number {
    let byWidth = this.heights.get(row);
    if (!byWidth) this.heights.set(row, (byWidth = new Map()));
    const cached = byWidth.get(measure.maxWidth);
    if (cached !== undefined) return cached;
    const h = row.layout(measure, ctx).height;
    byWidth.set(measure.maxWidth, h);
    return h;
  }

  private columnOptions(): FlexOptions {
    const { background, margin } = this.options;
    return {
      gap: this.rowGap,
      ...(background !== undefined ? { background } : {}),
      ...(margin !== undefined ? { margin } : {}),
    };
  }

  private allRows(body: Node[]): Node[] {
    return this.headerRow ? [this.headerRow, ...body] : body;
  }

  private cellFor(col: TableColumn<T>, row: T, rowStyle: TextStyle | undefined): Node {
    const value = col.key !== undefined ? row[col.key] : undefined;
    // The union of column shapes is only for callers; here any format function takes (value, row).
    const format = col.format as ((v: unknown, r: T) => CellValue) | undefined;
    const out: CellValue = format ? format(value, row) : (value as CellValue);
    // Most specific wins, field by field: column, then row, then the table's cell.style.
    return this.toNode(out, mergeStyles(this.options.cell?.style, rowStyle, col.style));
  }

  private toNode(v: CellValue, style: TextStyle | undefined): Node {
    if (typeof v === "string" || typeof v === "number") return new TextNode(String(v), style);
    if (v === undefined || v === null) return new TextNode("", style);
    return v;
  }

  private makeRow(cells: Node[], background: string | undefined): Node {
    const cols = this.options.columns;
    const { rowPadding, gap } = this.options;
    const cellPadding = this.options.cell?.padding;
    const anyColumnBackground = cols.some((c) => c.background !== undefined);
    const wrapped = cells.map((cell, i) => {
      const spec = cols[i]!;
      let content = spec.align !== undefined && cell instanceof TextNode ? cell.withAlign(spec.align) : cell;
      if (cellPadding !== undefined) content = new PaddingNode(content, cellPadding);
      if (spec.background !== undefined) content = new BackgroundNode(content, spec.background);
      return spec.width !== undefined ? new WidthNode(content, spec.width) : new FillNode(content, spec.share ?? 1);
    });
    // A column background must fill the row's height, so stretch cells when one is present.
    let row: Node = new RowNode(wrapped, { gap: gap ?? 8, ...(anyColumnBackground ? { align: "stretch" as const } : {}) });
    if (rowPadding !== undefined) row = new PaddingNode(row, rowPadding);
    if (background !== undefined) row = new BackgroundNode(row, background);
    return row;
  }
}
