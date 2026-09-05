import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { waveOffset, pathForGlyph } from '../wordmark-motion.mjs';

const data = JSON.parse(readFileSync(new URL('../assets/wordmark.json', import.meta.url), 'utf8'));

test('wordmark contains the two intended words and complete contours', () => {
  assert.equal(data.glyphs.map(glyph => glyph.letter).join(''), 'vibeviewer');
  for (const glyph of data.glyphs) {
    assert.ok(glyph.baseline > glyph.top);
    for (const contour of glyph.contours) {
      assert.deepEqual(contour.at(-1), contour[0]);
      for (const [x, y] of contour) {
        assert.ok(Number.isFinite(x) && Number.isFinite(y));
        assert.ok(x >= 0 && x <= data.width);
        assert.ok(y >= 0 && y <= data.height);
      }
    }
  }
});

test('baseline and letter tops remain pinned throughout the animation', () => {
  for (const glyph of data.glyphs) {
    for (let time = 0; time < 12; time += .2) {
      assert.equal(waveOffset(glyph.baseline, glyph, time), 0);
      assert.ok(Math.abs(waveOffset(glyph.top, glyph, time)) < 1e-12);
    }
  }
});

test('contour displacement is bounded and time-dependent', () => {
  for (const glyph of data.glyphs) {
    for (let time = 0; time < 10; time += .4) {
      for (const contour of glyph.contours) {
        for (const [, y] of contour) assert.ok(Math.abs(waveOffset(y, glyph, time)) <= 6.4);
      }
    }
    assert.notEqual(pathForGlyph(glyph, 0), pathForGlyph(glyph, 1));
  }
});

test('the paused/reduced-motion path is stable and has no vertical displacement', () => {
  for (const glyph of data.glyphs) {
    assert.equal(pathForGlyph(glyph, 0, false), pathForGlyph(glyph, 10, false));
    const expectedY = glyph.contours.flatMap(contour => contour.map(point => point[1]));
    const actualY = [...pathForGlyph(glyph, 1).matchAll(/[ML][^,]+,([-\d.]+)/g)].map(match => Number(match[1]));
    assert.deepEqual(actualY, expectedY);
    assert.ok(!/NaN|undefined|Infinity/.test(pathForGlyph(glyph, 1)));
  }
});

test('all ten letters render comfortably within the padded viewBox', () => {
  for (let time = 0; time < 10; time += .4) {
    for (const glyph of data.glyphs) {
      for (const contour of glyph.contours) {
        for (const [x, y] of contour) {
          const animatedX = x + waveOffset(y, glyph, time);
          assert.ok(animatedX > 0 && animatedX < data.width);
        }
      }
    }
  }
});
