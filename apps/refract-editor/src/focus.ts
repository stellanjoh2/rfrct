/**
 * Focus (keyboard **F**): pan and scale values that restore the default
 * centered contain-fit — image edges touch the viewport on the limiting axis.
 */
export function Focus(): { pan: { x: number; y: number }; scale: number } {
  return { pan: { x: 0, y: 0 }, scale: 1 };
}
