const themedRoot = document.documentElement;
const toggle = document.querySelector('.theme-toggle');

toggle?.addEventListener('click', () => {
  const active = themedRoot.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const next = active === 'dark' ? 'light' : 'dark';
  themedRoot.dataset.theme = next;
  localStorage.setItem('vibe-verify-theme', next);
});
