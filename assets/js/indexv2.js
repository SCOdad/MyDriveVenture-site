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

// A manual, two-view carousel. Phones always receive the actual mobile capture.
(() => {
  const proof = document.querySelector('.product-proof');
  if (!proof) return;
  const controls = proof.querySelector('.proof-controls');
  const stage = proof.querySelector('.proof-stage');
  const viewport = proof.querySelector('.proof-viewport');
  const image = proof.querySelector('img');
  const phone = matchMedia('(max-width: 760px)');
  let desktopView = 'web';
  function renderPreview() {
    const view = phone.matches ? 'mobile' : desktopView;
    controls.hidden = phone.matches;
    stage.dataset.previewState = view;
    image.src = `/assets/images/indexv2-cockpit${view === 'mobile' ? '-mobile' : ''}.webp`;
    image.width = view === 'mobile' ? 772 : 1491;
    image.height = view === 'mobile' ? 3090 : 1055;
    viewport.scrollTop = 0;
    for (const button of controls.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.previewView === view));
    }
  }
  controls.addEventListener('click', event => {
    const button = event.target.closest('button[data-preview-view]');
    if (!button) return;
    desktopView = button.dataset.previewView;
    renderPreview();
  });
  phone.addEventListener('change', renderPreview);
  renderPreview();
})();
