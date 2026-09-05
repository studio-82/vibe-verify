import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { pathForGlyph } from '../wordmark-motion.mjs';
import { wordmarkLayout } from '../wordmark-layout.mjs';

const source = readFileSync(new URL('../site.js', import.meta.url), 'utf8')
  .replace("import { pathForGlyph } from './wordmark-motion.mjs';", '')
  .replace("import { wordmarkLayout } from './wordmark-layout.mjs';", '')
  .replace('import.meta.url', "'http://localhost/site.js'");
const outlines = JSON.parse(readFileSync(new URL('../assets/wordmark.json', import.meta.url), 'utf8'));

class Element {
  attributes = {};
  events = {};
  children = [];
  dataset = {};
  hidden = true;
  classList = { add: () => {}, toggle: () => {} };
  style = { setProperty: () => {} };
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, callback) { this.events[name] = callback; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
}

async function setup({ reduced = false, failFetch = false, failStorage = false } = {}) {
  const title = new Element();
  const theme = new Element();
  const motion = new Element();
  const root = new Element();
  const color = new Element();
  const dock = new Element();
  const header = new Element();
  const preferences = new Map();
  const frames = new Map();
  const media = { matches: reduced, addEventListener: (_, callback) => { media.change = callback; } };
  const document = {
    documentElement: root, hidden: false, events: {},
    querySelector: selector => ({ '.wordmark': title, '.wordmark-dock': dock, '.site-header': header, '.theme-toggle': theme, '.motion-toggle': motion, 'meta[name="theme-color"]': color })[selector],
    createElementNS: () => new Element(), createElement: () => new Element(),
    addEventListener: (name, callback) => { document.events[name] = callback; },
  };
  let frameNumber = 0;
  const window = { scrollY: 0, innerHeight: 900, events: {}, addEventListener: (name, callback) => { window.events[name] = callback; } };
  title.getBoundingClientRect = () => ({ left: 72, top: 300 - window.scrollY, width: 280 });
  dock.getBoundingClientRect = () => ({ left: 72, top: 34, width: 182, height: 28 });
  runInNewContext(source, {
    document, window,
    pathForGlyph, wordmarkLayout, URL, matchMedia: () => media,
    localStorage: {
      getItem: key => { if (failStorage) throw Error('Storage denied'); return preferences.get(key); },
      setItem: (key, value) => { if (failStorage) throw Error('Storage denied'); preferences.set(key, value); },
    },
    fetch: async () => ({ ok: !failFetch, json: async () => outlines }),
    requestAnimationFrame: callback => { frames.set(++frameNumber, callback); return frameNumber; },
    cancelAnimationFrame: id => frames.delete(id),
  });
  // Resolve fetch + JSON + setup continuations, without running a browser.
  await new Promise(resolve => setImmediate(resolve));
  function flushFrames() {
    for (const [id, callback] of [...frames]) { frames.delete(id); callback(16); }
  }
  return { title, theme, motion, root, color, dock, frames, document, window, media, preferences, flushFrames };
}

test('title becomes accessible vector lettering and starts exactly one animation loop', async () => {
  const state = await setup();
  assert.equal(state.title.children[0].textContent, 'vibe viewer');
  assert.equal(state.title.children.length, 1);
  assert.equal(state.dock.children[0].attributes['aria-hidden'], 'true');
  assert.equal(state.dock.children[0].children[0].children.length, 4);
  assert.equal(state.dock.children[0].children[1].children.length, 6);
  assert.equal(state.dock.attributes.tabindex, '-1');
  assert.equal(state.frames.size, 1);
  assert.equal(state.motion.hidden, false);
});

test('pause, docking, and hidden-tab states stop animation without duplicating loops', async () => {
  const state = await setup();
  state.motion.events.click();
  assert.equal(state.frames.size, 0);
  assert.equal(state.motion.textContent, 'Play motion');
  state.motion.events.click();
  state.window.scrollY = 500;
  state.window.events.scroll();
  state.flushFrames();
  assert.equal(state.frames.size, 0);
  assert.equal(state.dock.attributes.tabindex, '0');
  assert.equal(state.dock.attributes['aria-hidden'], 'false');
  state.window.scrollY = 0;
  state.window.events.scroll();
  state.flushFrames();
  assert.equal(state.frames.size, 1);
  state.document.hidden = true;
  state.document.events.visibilitychange();
  assert.equal(state.frames.size, 0);
});

test('a resize remeasures the single wordmark without creating a second copy', async () => {
  const state = await setup();
  state.dock.getBoundingClientRect = () => ({ left: 20, top: 18, width: 148, height: 24 });
  state.window.scrollY = 700;
  state.window.events.resize();
  state.flushFrames();
  assert.equal(state.dock.children.length, 1);
  assert.equal(state.dock.children[0].style.width, '148px');
  assert.equal(state.frames.size, 0);
});

test('reduced motion never starts an animation', async () => {
  const state = await setup({ reduced: true });
  assert.equal(state.frames.size, 0);
  assert.equal(state.motion.hidden, true);
  state.media.matches = false;
  state.media.change();
  assert.equal(state.frames.size, 1);
});

test('an unavailable asset leaves the HTML title intact', async () => {
  const state = await setup({ failFetch: true });
  assert.equal(state.title.children.length, 0);
  assert.equal(state.frames.size, 0);
  assert.equal(state.motion.hidden, true);
});

test('theme works even when browser storage is unavailable', async () => {
  const state = await setup({ failStorage: true });
  state.theme.events.click();
  assert.equal(state.root.dataset.theme, 'dark');
  assert.equal(state.color.content, '#141617');
  state.theme.events.click();
  assert.equal(state.root.dataset.theme, 'light');
  assert.equal(state.theme.attributes['aria-label'], 'Switch to dark theme');
});
