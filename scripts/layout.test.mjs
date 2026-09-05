import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { wordmarkLayout } from '../wordmark-layout.mjs';

const data = JSON.parse(readFileSync(new URL('../assets/wordmark.json', import.meta.url), 'utf8'));
const origin = { left: 72, top: 300, width: 280 };
const dock = { left: 72, top: 34, width: 182, height: 30 };
const layoutAt = (scrollY, still = false) => wordmarkLayout({ data, origin, dock, scrollY, still });

test('at the top, the only wordmark is stacked at its hero position', () => {
  const result = layoutAt(0);
  assert.equal(result.progress, 0);
  assert.equal(result.x, origin.left);
  assert.equal(result.y, origin.top);
  assert.equal(result.width, origin.width);
  assert.equal(result.secondX, 0);
  assert.equal(result.secondY, 0);
});

test('after scrolling, both words share one baseline in the header', () => {
  const result = layoutAt(300);
  assert.equal(result.progress, 1);
  assert.equal(result.width, dock.width);
  assert.equal(result.x, dock.left);
  assert.equal(data.glyphs[4].baseline + result.secondY, data.glyphs[0].baseline);
  assert.ok(result.height <= dock.height);
  assert.equal(result.y + result.height / 2, dock.top + dock.height / 2);
});

test('every intermediate point stays finite and within the SVG viewBox', () => {
  let previous = 0;
  for (let scrollY = 0; scrollY < 1000; scrollY += 2) {
    const result = layoutAt(scrollY);
    assert.ok(result.progress >= previous);
    previous = result.progress;
    for (const value of Object.values(result)) assert.ok(Number.isFinite(value));
    assert.ok(result.width >= dock.width && result.width <= origin.width);
    for (const glyph of data.glyphs.slice(4)) {
      for (const contour of glyph.contours) {
        for (const [x, y] of contour) {
          assert.ok(x + result.secondX < result.viewWidth);
          assert.ok(y + result.secondY > 0 && y + result.secondY < result.viewHeight);
        }
      }
    }
  }
});

test('the second word clears the first before it rises into the same line', () => {
  const firstRight = Math.max(...data.glyphs.slice(0, 4).flatMap(g => g.contours.flatMap(c => c.map(p => p[0]))));
  const firstBottom = Math.max(...data.glyphs.slice(0, 4).flatMap(g => g.contours.flatMap(c => c.map(p => p[1]))));
  const secondLeft = Math.min(...data.glyphs.slice(4).flatMap(g => g.contours.flatMap(c => c.map(p => p[0]))));
  const secondTop = Math.min(...data.glyphs.slice(4).flatMap(g => g.contours.flatMap(c => c.map(p => p[1]))));
  for (let scrollY = 0; scrollY <= 300; scrollY++) {
    const result = layoutAt(scrollY);
    if (secondTop + result.secondY < firstBottom) assert.ok(secondLeft + result.secondX > firstRight);
  }
});

test('reduced motion switches positions without intermediate travel', () => {
  for (let scrollY = 0; scrollY <= 400; scrollY += 10) {
    const result = layoutAt(scrollY, true);
    assert.ok(result.progress === 0 || result.progress === 1);
  }
});
