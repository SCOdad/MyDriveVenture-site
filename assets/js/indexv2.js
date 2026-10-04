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

// Manual product previews. Video loads only on an explicit Text selection.
(() => {
  const proof = document.querySelector('.product-proof');
  if (!proof) return;
  const controls = proof.querySelector('.proof-controls');
  const stage = proof.querySelector('.proof-stage');
  const viewport = proof.querySelector('.proof-viewport');
  const image = viewport.querySelector('img');
  const videoPanel = proof.querySelector('.text-preview');
  const video = videoPanel.querySelector('video');
  const textDetails = proof.querySelector('.text-demo-details');
  const message = proof.querySelector('.video-message');
  const phone = matchMedia('(max-width: 760px)');
  let desktopView = 'web';
  let phoneView = 'mobile';
  function renderPreview(play = false) {
    const view = phone.matches ? phoneView : desktopView;
    const isText = view === 'text';
    controls.hidden = false;
    controls.querySelector('[data-preview-view="web"]').hidden = phone.matches;
    stage.dataset.previewState = view;
    viewport.hidden = isText;
    videoPanel.hidden = !isText;
    textDetails.hidden = !isText;
    message.hidden = true;
    if (!isText) {
      video.pause();
      image.src = `/assets/images/indexv2-cockpit${view === 'mobile' ? '-mobile' : ''}.webp`;
      image.width = view === 'mobile' ? 772 : 1491;
      image.height = view === 'mobile' ? 3090 : 1055;
      viewport.scrollTop = 0;
    } else if (play) {
      if (!video.hasAttribute('src')) video.src = video.dataset.videoSrc;
      video.play().catch(() => { message.hidden = false; });
    }
    for (const button of controls.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.previewView === view));
    }
  }
  controls.addEventListener('click', event => {
    const button = event.target.closest('button[data-preview-view]');
    if (!button) return;
    if (phone.matches) phoneView = button.dataset.previewView;
    else desktopView = button.dataset.previewView;
    renderPreview(button.dataset.previewView === 'text');
  });
  phone.addEventListener('change', () => renderPreview());
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
  renderPreview();
})();
