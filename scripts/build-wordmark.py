"""Build the small, self-hosted font and animated wordmark outlines.

Usage: python3 scripts/build-wordmark.py /path/to/Manrope[wght].ttf
Requires fonttools[woff]. Source: https://github.com/google/fonts/tree/main/ofl/manrope
The font's OFL licence is retained in assets/Manrope-OFL.txt.
"""

import json
import math
import sys
from pathlib import Path

from fontTools import subset
from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


class OutlinePen(BasePen):
    """Sample contours so straight stems can bend, not just their endpoints."""

    def __init__(self, glyph_set):
        super().__init__(glyph_set)
        self.contours = []
        self.contour = []

    def _moveTo(self, point):
        self.contour = [point]

    def _lineTo(self, point):
        start = self._getCurrentPoint()
        steps = max(1, math.ceil(math.dist(start, point) / 14))
        for step in range(1, steps + 1):
            t = step / steps
            self.contour.append(tuple(a + (b - a) * t for a, b in zip(start, point)))

    def _curveToOne(self, p1, p2, p3):
        p0 = self._getCurrentPoint()
        length = sum(math.dist(a, b) for a, b in zip((p0, p1, p2), (p1, p2, p3)))
        steps = max(3, math.ceil(length / 14))
        for step in range(1, steps + 1):
            t, u = step / steps, 1 - step / steps
            self.contour.append(tuple(u**3 * p0[i] + 3*u*u*t*p1[i] + 3*u*t*t*p2[i] + t**3*p3[i] for i in (0, 1)))

    def _qCurveToOne(self, p1, p2):
        p0 = self._getCurrentPoint()
        steps = max(3, math.ceil((math.dist(p0, p1) + math.dist(p1, p2)) / 14))
        for step in range(1, steps + 1):
            t, u = step / steps, 1 - step / steps
            self.contour.append(tuple(u*u*p0[i] + 2*u*t*p1[i] + t*t*p2[i] for i in (0, 1)))

    def _closePath(self):
        # Subdivide the closing edge too; the start and end deform identically.
        self._lineTo(self.contour[0])
        self.contours.append(self.contour)


def main():
    assets = Path(__file__).resolve().parents[1] / 'assets'
    source = TTFont(sys.argv[1])
    font = instantiateVariableFont(source, {'wght': 800}, inplace=False)
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font['head'].unitsPerEm
    size = 196
    scale = size / upm
    padding = 14
    glyphs = []
    maximum_x = 0
    for row, word in enumerate(('vibe', 'viewer')):
        cursor = padding
        baseline = 150 + row * 157
        for index, letter in enumerate(word):
            name = cmap[ord(letter)]
            pen = OutlinePen(glyph_set)
            glyph_set[name].draw(pen)
            contours = [[[round(cursor + x*scale, 2), round(baseline - y*scale, 2)] for x, y in contour] for contour in pen.contours]
            top = min(y for contour in contours for _, y in contour)
            glyphs.append({'letter': letter, 'baseline': baseline, 'top': top, 'phase': round(index * .57 + row * 1.4, 2), 'contours': contours})
            maximum_x = max(maximum_x, max(x for contour in contours for x, _ in contour))
            cursor += glyph_set[name].width * scale - size * .047
    first_right = max(x for glyph in glyphs[:4] for contour in glyph['contours'] for x, _ in contour)
    data = {'width': math.ceil(maximum_x + padding), 'height': 316, 'horizontalOffset': round(first_right - padding + 32, 2), 'lineOffset': 157, 'glyphs': glyphs}
    (assets / 'wordmark.json').write_text(json.dumps(data, separators=(',', ':')) + '\n')

    options = subset.Options()
    options.flavor = 'woff2'
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=list(range(0x20, 0x100)) + [0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2026, 0x2197])
    subsetter.subset(source)
    source.flavor = 'woff2'
    source.save(assets / 'manrope-latin.woff2')
    print(f'Built {len(glyphs)} glyphs; viewBox 0 0 {data["width"]} {data["height"]}.')


if __name__ == '__main__':
    main()
