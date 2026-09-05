import { pathForGlyph } from './wordmark-motion.mjs';
import { wordmarkLayout } from './wordmark-layout.mjs';

const root = document.documentElement;
const themeToggle = document.querySelector('.theme-toggle');
const themeColor = document.querySelector('meta[name="theme-color"]');

function syncTheme() {
  const dark = root.dataset.theme === 'dark';
  themeToggle?.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  if (themeColor) themeColor.content = dark ? '#141617' : '#f6f5f2';
}

if (themeToggle) {
  themeToggle.hidden = false;
  syncTheme();
  themeToggle.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('vibe-viewer-theme', root.dataset.theme); } catch (_) {}
    syncTheme();
  });
}

async function setupWordmark() {
  const title = document.querySelector('.wordmark');
  const motionToggle = document.querySelector('.motion-toggle');
  const dock = document.querySelector('.wordmark-dock');
  const header = document.querySelector('.site-header');
  if (!title || !motionToggle || !dock || !header) return;

  // The readable HTML title stays in place if the asset fails to load.
  const response = await fetch(new URL('./assets/wordmark.json', import.meta.url));
  if (!response.ok) return;
  const data = await response.json();
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${data.width} ${data.height}`);
  svg.setAttribute('width', data.width);
  svg.setAttribute('height', data.height);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'wordmark-flight');
  const firstWord = document.createElementNS(ns, 'g');
  const secondWord = document.createElementNS(ns, 'g');
  svg.append(firstWord, secondWord);
  const paths = data.glyphs.map((glyph, index) => {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', pathForGlyph(glyph, 0, false));
    (index < 4 ? firstWord : secondWord).append(path);
    return path;
  });

  const accessibleTitle = document.createElement('span');
  accessibleTitle.className = 'sr-only';
  accessibleTitle.textContent = 'vibe viewer';
  title.replaceChildren(accessibleTitle);
  title.classList.add('is-ready');
  dock.append(svg);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  try { paused = localStorage.getItem('vibe-viewer-motion') === 'paused'; } catch (_) {}
  let visible = true;
  let docked = false;
  let frame = null;
  let layoutFrame = null;
  let origin;
  let destination;
  let previousTime = null;
  let elapsed = 0;
  let lastDraw = -Infinity;

  function draw(animated) {
    paths.forEach((path, index) => path.setAttribute('d', pathForGlyph(data.glyphs[index], elapsed / 1000, animated)));
  }

  function tick(time) {
    // Pause elapsed time as well as work when the title isn't on screen.
    if (previousTime !== null) elapsed += Math.min(time - previousTime, 100);
    previousTime = time;
    if (time - lastDraw >= 1000 / 30) {
      draw(true);
      lastDraw = time;
    }
    frame = requestAnimationFrame(tick);
  }

  function syncMotion() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previousTime = null;
    const still = paused || reducedMotion.matches;
    motionToggle.hidden = reducedMotion.matches;
    motionToggle.textContent = paused ? 'Play motion' : 'Pause motion';
    motionToggle.setAttribute('aria-pressed', String(paused));
    if (still || docked) draw(false);
    if (!still && !docked && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function measure() {
    const rect = title.getBoundingClientRect();
    origin = { left: rect.left, top: rect.top + window.scrollY, width: rect.width };
    destination = dock.getBoundingClientRect();
  }

  function renderLayout() {
    const layout = wordmarkLayout({ data, origin, dock: destination, scrollY: window.scrollY, still: paused || reducedMotion.matches });
    svg.setAttribute('viewBox', `0 0 ${layout.viewWidth} ${layout.viewHeight}`);
    svg.style.width = `${layout.width}px`;
    svg.style.height = `${layout.height}px`;
    svg.style.transform = `translate3d(${layout.x}px, ${layout.y}px, 0)`;
    secondWord.setAttribute('transform', `translate(${layout.secondX} ${layout.secondY})`);
    header.style.setProperty('--dock-progress', Math.max(0, (layout.progress - .7) / .3));
    const nextDocked = layout.progress >= 1;
    const nextVisible = layout.y + layout.height > 0 && layout.y < window.innerHeight;
    dock.classList.toggle('is-docked', nextDocked);
    dock.setAttribute('aria-hidden', String(!nextDocked));
    dock.setAttribute('tabindex', nextDocked ? '0' : '-1');
    if (nextDocked !== docked || nextVisible !== visible) {
      docked = nextDocked;
      visible = nextVisible;
      syncMotion();
    }
  }

  function scheduleLayout(remeasure = false) {
    if (remeasure) measure();
    if (layoutFrame !== null) return;
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = null;
      renderLayout();
    });
  }

  motionToggle.addEventListener('click', () => {
    paused = !paused;
    try { localStorage.setItem('vibe-viewer-motion', paused ? 'paused' : 'playing'); } catch (_) {}
    renderLayout();
    syncMotion();
  });
  reducedMotion.addEventListener('change', () => { renderLayout(); syncMotion(); });
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('scroll', () => scheduleLayout(), { passive: true });
  window.addEventListener('resize', () => scheduleLayout(true), { passive: true });
  window.addEventListener('pageshow', () => scheduleLayout(true));
  document.fonts?.ready.then(() => scheduleLayout(true));
  measure();
  renderLayout();
  syncMotion();
}

setupWordmark().catch(() => {
  // The static typographic fallback is intentional, not an error screen.
});
