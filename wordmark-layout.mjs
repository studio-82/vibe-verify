export const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const mix = (start, end, progress) => start + (end - start) * progress;

// Unfold horizontally before lifting the second line, so the words don't cross.
// The caller supplies measured rectangles; this module does no layout reads.
export function wordmarkLayout({ data, origin, dock, scrollY, still = false }) {
  const distance = Math.max(140, Math.min(260, origin.top - dock.top));
  const raw = clamp(scrollY / distance);
  const progress = still ? Number(raw >= 1) : smooth(raw);
  const horizontal = smooth(progress / .6);
  const vertical = smooth((progress - .6) / .4);
  const secondX = data.horizontalOffset * horizontal;
  const secondY = vertical === 0 ? 0 : -data.lineOffset * vertical;
  const viewWidth = data.width + secondX;
  const viewHeight = data.height + secondY;
  const targetWidth = Math.min(dock.width, dock.height * (data.width + data.horizontalOffset) / (data.height - data.lineOffset));
  const width = mix(origin.width, targetWidth, progress);
  const height = width * viewHeight / viewWidth;
  return {
    progress, secondX, secondY, viewWidth, viewHeight, width, height,
    x: mix(origin.left, dock.left, progress),
    y: mix(origin.top - scrollY, dock.top + (dock.height - height) / 2, progress),
  };
}
