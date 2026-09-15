import { type ResolvedInsets, type Size, horizontal, vertical } from "./geometry.js";

/**
 * What a parent hands a child during layout: the smallest and largest box the
 * child may return. A "tight" axis has min === max, meaning the parent has
 * decided. A "loose" axis has min 0, meaning the child chooses.
 */
export interface Constraints {
  readonly minWidth: number;
  readonly maxWidth: number;
  readonly minHeight: number;
  readonly maxHeight: number;
}

export const INFINITY = Number.POSITIVE_INFINITY;

/** Both axes tight to exactly `size`. */
export function tight(size: Size): Constraints {
  return {
    minWidth: size.width,
    maxWidth: size.width,
    minHeight: size.height,
    maxHeight: size.height,
  };
}

/** Both axes loose: anything from 0 up to `max`. */
export function loose(max: Size): Constraints {
  return { minWidth: 0, maxWidth: max.width, minHeight: 0, maxHeight: max.height };
}

/** Same maxima, minima dropped to 0. Used when a parent lets a child pick its own size. */
export function loosen(c: Constraints): Constraints {
  return { minWidth: 0, maxWidth: c.maxWidth, minHeight: 0, maxHeight: c.maxHeight };
}

/**
 * Shrink constraints by insets, for the child of a padding node.
 * Never goes below 0 on either bound, and keeps min <= max.
 */
export function deflate(c: Constraints, insets: ResolvedInsets): Constraints {
  const dw = horizontal(insets);
  const dh = vertical(insets);
  const maxWidth = Math.max(0, c.maxWidth - dw);
  const maxHeight = Math.max(0, c.maxHeight - dh);
  return {
    minWidth: clamp(c.minWidth - dw, 0, maxWidth),
    maxWidth,
    minHeight: clamp(c.minHeight - dh, 0, maxHeight),
    maxHeight,
  };
}

/**
 * Clamp a size into the constraints. This is the single place the overflow
 * rule is enforced: a node computes what it wants, then passes it
 * through here before returning, so the result always satisfies its parent.
 */
export function constrain(c: Constraints, size: Size): Size {
  return {
    width: clamp(size.width, c.minWidth, c.maxWidth),
    height: clamp(size.height, c.minHeight, c.maxHeight),
  };
}

export function isTightWidth(c: Constraints): boolean {
  return c.minWidth === c.maxWidth;
}

export function isTightHeight(c: Constraints): boolean {
  return c.minHeight === c.maxHeight;
}

export function hasBoundedWidth(c: Constraints): boolean {
  return Number.isFinite(c.maxWidth);
}

export function hasBoundedHeight(c: Constraints): boolean {
  return Number.isFinite(c.maxHeight);
}

/** The largest size the constraints allow. Infinite axes stay infinite. */
export function biggest(c: Constraints): Size {
  return { width: c.maxWidth, height: c.maxHeight };
}

/** The smallest size the constraints allow. */
export function smallest(c: Constraints): Size {
  return { width: c.minWidth, height: c.minHeight };
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
