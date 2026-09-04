const checkoutURL = "";

const themedRoot = document.documentElement;
const toggle = document.querySelector('.theme-toggle');

toggle?.addEventListener('click', () => {
  const active = themedRoot.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const next = active === 'dark' ? 'light' : 'dark';
  themedRoot.dataset.theme = next;
  localStorage.setItem('vibe-verify-theme', next);
});

document.querySelectorAll('[data-checkout-link]').forEach((link) => {
  if (checkoutURL) {
    link.href = checkoutURL;
    return;
  }
  link.addEventListener('click', (event) => {
    event.preventDefault();
    document.querySelector('#pricing')?.scrollIntoView({ behavior: 'smooth' });
  });
});
