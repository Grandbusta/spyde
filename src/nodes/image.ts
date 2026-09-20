import { type Constraints, constrain } from "../core/constraints.js";
import { type Offset, type Rect, type Size, ZERO_SIZE, rectAt } from "../core/geometry.js";
import type { LayoutContext, Node, PaintContext } from "../core/node.js";

export interface ImageOptions {
  width?: number;
  height?: number;
}

/**
 * Puts a picture on the page. PNG or JPEG, path or bytes.
 *
 * Sizing:
 *   width + height  -> the node is that box; the image fits inside, top-left
 *   width only      -> height from the aspect ratio
 *   height only     -> width from the aspect ratio
 *   neither         -> natural size at 72 px/inch, scaled down to fit the
 *                      available width if that is bounded
 * The result is clamped to the constraints. Whatever the final box,
 * the image is drawn fitted inside it with its aspect ratio kept, so it is
 * never distorted.
 */
export class ImageNode implements Node {
  private natural: Size = ZERO_SIZE;
  private size: Size = ZERO_SIZE;

  constructor(
    readonly src: string | Uint8Array,
    readonly options: ImageOptions = {},
  ) {}

  layout(constraints: Constraints, ctx: LayoutContext): Size {
    this.natural = ctx.imageSize(this.src);
    const { width: nw, height: nh } = this.natural;
    const ratio = nw > 0 && nh > 0 ? nw / nh : 1;
    const { width: w, height: h } = this.options;

    let wanted: Size;
    if (w !== undefined && h !== undefined) wanted = { width: w, height: h };
    else if (w !== undefined) wanted = { width: w, height: w / ratio };
    else if (h !== undefined) wanted = { width: h * ratio, height: h };
    else {
      wanted = { width: nw, height: nh };
      if (Number.isFinite(constraints.maxWidth) && nw > constraints.maxWidth) {
        wanted = { width: constraints.maxWidth, height: constraints.maxWidth / ratio };
      }
    }
    this.size = constrain(constraints, wanted);
    return this.size;
  }

  paint(ctx: PaintContext, offset: Offset): void {
    const box = this.fitted(rectAt(offset, this.size));
    if (box.width <= 0 || box.height <= 0) return;
    ctx.renderer.drawImage(this.src, box);
  }

  /** Largest aspect-correct rectangle inside `box`, anchored top-left. */
  private fitted(box: Rect): Rect {
    const { width: nw, height: nh } = this.natural;
    if (nw <= 0 || nh <= 0) return box;
    const scale = Math.min(box.width / nw, box.height / nh);
    return { x: box.x, y: box.y, width: nw * scale, height: nh * scale };
  }
}
