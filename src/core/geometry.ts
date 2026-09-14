/** All numbers are PDF points, 1/72 inch (D5). */

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Offset {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Public insets form, accepted by `padding()` and `RenderOptions.margins`.
 * - a number: all four sides
 * - `{ x, y }`: horizontal and vertical
 * - `{ top, right, bottom, left }`: each side, missing sides are 0
 */
export type Insets =
  | number
  | { x?: number; y?: number }
  | { top?: number; right?: number; bottom?: number; left?: number };

/** Fully resolved insets, always four numbers. */
export interface ResolvedInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export const ZERO_SIZE: Size = { width: 0, height: 0 };
export const ZERO_OFFSET: Offset = { x: 0, y: 0 };
export const ZERO_INSETS: ResolvedInsets = { top: 0, right: 0, bottom: 0, left: 0 };

export function resolveInsets(insets: Insets | undefined): ResolvedInsets {
  if (insets === undefined) return ZERO_INSETS;
  if (typeof insets === "number") {
    return { top: insets, right: insets, bottom: insets, left: insets };
  }
  if ("x" in insets || "y" in insets) {
    const { x = 0, y = 0 } = insets as { x?: number; y?: number };
    return { top: y, right: x, bottom: y, left: x };
  }
  const { top = 0, right = 0, bottom = 0, left = 0 } = insets as {
    top?: number; right?: number; bottom?: number; left?: number;
  };
  return { top, right, bottom, left };
}

export function horizontal(insets: ResolvedInsets): number {
  return insets.left + insets.right;
}

export function vertical(insets: ResolvedInsets): number {
  return insets.top + insets.bottom;
}

export function addOffset(a: Offset, b: Offset): Offset {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function rectAt(offset: Offset, size: Size): Rect {
  return { x: offset.x, y: offset.y, width: size.width, height: size.height };
}
