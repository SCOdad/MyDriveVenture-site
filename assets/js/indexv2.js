// Isolated BKLG-0220 navigation. No session reads or product mutations.
(() => {
  const button = document.querySelector('.menu-toggle');
  const nav = document.getElementById('primary-nav');
  const mobile = window.matchMedia('(max-width: 760px)');
  if (!button || !nav) return;
  function setOpen(open) {
    button.setAttribute('aria-expanded', String(open));
    nav.hidden = mobile.matches && !open;
  }
  function syncViewport() {
    button.hidden = !mobile.matches;
    setOpen(false);
  }
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', event => { if (event.target.closest('a') && mobile.matches) setOpen(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      button.focus();
    }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.nav-shell')) setOpen(false); });
  mobile.addEventListener('change', syncViewport);
  syncViewport();
})();
