import { type Constraints, INFINITY } from "../core/constraints.js";
import { ZERO_SIZE } from "../core/geometry.js";
import { type LayoutContext, type Node, type PageOptions, type PageResult, type Splittable, isSplittable } from "../core/node.js";
import { FlexNode, type FlexOptions } from "./flex.js";
import { PageBreakNode } from "./pageBreak.js";

/** Stacks children top to bottom. The only milestone-one node that can split across pages. */
export class ColumnNode extends FlexNode implements Splittable {
  constructor(children: readonly Node[], options?: FlexOptions) {
    super("vertical", children, options);
  }

  /**
   * Pagination.
   *
   * 1. Try a normal layout. If the wanted height fits, that is the page:
   *    fills were honoured and nothing is split.
   * 2. Otherwise, split mode. Walk children top to bottom with the remaining
   *    height; place each one that fits. Stop at the first that does not,
   *    or at a pageBreak, and hand back a new column of the rest.
   *    - fill/spacer children take their content size (no leftover to give).
   *    - a nested splittable child is asked to split with the remaining
   *      height; whatever it places goes on this page and its remainder
   *      leads ours.
   *    - a child that fits nowhere is placed anyway when we are at the top
   *      of a fresh page, so every page makes progress.
   * 3. justify is ignored in split mode; align applies as usual.
   */
  /**
   * Pagination. Walk the children once, top to bottom, with the remaining
   * height:
   * - place each child that fits (fill/spacer children take their content
   *   size here, since there is no leftover to give while splitting);
   * - a nested splittable child is asked to split with the remaining height;
   *   whatever it places goes on this page and its remainder leads ours;
   * - a child that fits nowhere is placed anyway at the top of a fresh page,
   *   so every page makes progress;
   * - a pageBreak ends the page.
   * If the walk reaches the end, everything fit: run the normal layout so
   * fills and justify are honoured. Otherwise hand back a column of the rest.
   * Each child is measured once per page it is considered on, so a long
   * column costs a single pass overall.
   */
  layoutPage(constraints: Constraints, ctx: LayoutContext, page: PageOptions): PageResult {
    const inner = this.inner(constraints);
    if (!Number.isFinite(inner.maxHeight)) {
      this.layoutContent(inner, ctx);
      return { size: this.finishOuter(constraints), placed: this.children.length };
    }

    const n = this.children.length;
    const maxHeight = inner.maxHeight;
    const crossMax = inner.maxWidth;
    const childConstraints: Constraints = { minWidth: 0, maxWidth: crossMax, minHeight: 0, maxHeight: INFINITY };
    this.childSizes = new Array(n).fill(ZERO_SIZE);
    let used = 0;
    let count = 0;
    let consumed = 0;
    let remainder: Node | undefined;
    let broke = false;

    for (let i = 0; i < n; i++) {
      const child = this.children[i]!;
      if (child instanceof PageBreakNode) {
        remainder = this.rest(i + 1);
        consumed = i + 1;
        broke = true;
        break;
      }
      const gapBefore = count > 0 ? this.gap : 0;
      const avail = maxHeight - used - gapBefore;
      const atTop = page.atPageTop && count === 0;

      if (isSplittable(child)) {
        const r = child.layoutPage({ ...childConstraints, maxHeight: Math.max(0, avail) }, ctx, { atPageTop: atTop });
        if (r.remainder && r.placed === 0) {
          remainder = this.rest(i);
          break;
        }
        this.childSizes[i] = r.size;
        used += gapBefore + r.size.height;
        count++;
        consumed = count;
        if (r.remainder) {
          remainder = this.rest(i + 1, r.remainder);
          break;
        }
        continue;
      }

      const s = child.layout(childConstraints, ctx);
      if (s.height <= avail || atTop) {
        this.childSizes[i] = s;
        used += gapBefore + s.height;
        count++;
        consumed = count;
      } else {
        remainder = this.rest(i);
        break;
      }
    }

    if (!remainder && !broke) {
      // Everything fit. The normal layout honours fills and justify.
      this.layoutContent(inner, ctx);
      return { size: this.finishOuter(constraints), placed: n };
    }

    this.finalize(inner, ctx, count, false);
    const pageSize = this.finishOuter(constraints);
    return remainder ? { size: pageSize, remainder, placed: consumed } : { size: pageSize, placed: consumed };
  }

  /** A new column of the children from `from` onward, optionally led by `first`. */
  private rest(from: number, first?: Node): Node | undefined {
    const tail = this.children.slice(from);
    const children = first ? [first, ...tail] : tail;
    if (children.length === 0) return undefined;
    return new ColumnNode(children, this.options);
  }
}
