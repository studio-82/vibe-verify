// A horizontal contour wave. No vertical displacement, no moving baseline.
// Phase differs per glyph, keeping the two lines from moving as one block.
export function waveOffset(y, glyph, seconds) {
  const height = glyph.baseline - glyph.top;
  if (height <= 0) return 0;
  const progress = Math.max(0, Math.min(1, (glyph.baseline - y) / height));
  if (progress === 0 || progress === 1) return 0;
  const envelope = Math.sin(progress * Math.PI) ** 1.2;
  const time = seconds * Math.PI * 2 / 4.8;
  return 6.4 * envelope * (
    .84 * Math.sin(progress * 7.6 + time + glyph.phase)
    + .16 * Math.sin(progress * 12.4 - time * .7 + glyph.phase)
  );
}

export function pathForGlyph(glyph, seconds, animated = true) {
  return glyph.contours.map(contour => contour.map(([x, y], index) => {
    const offset = animated ? waveOffset(y, glyph, seconds) : 0;
    return `${index === 0 ? 'M' : 'L'}${(x + offset).toFixed(2)},${y}`;
  }).join('') + 'Z').join('');
}
