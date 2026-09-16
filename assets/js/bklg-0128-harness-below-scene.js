(() => {
  if (document.documentElement.dataset.dvRoute !== 'bklg0128uat') return;

  const frame = document.getElementById('uat-frame');
  const harness = document.getElementById('uat-harness');
  if (!frame || !harness) return;

  let raf = 0;
  let boundFrameWindow = null;

  function placeHarnessBelowScene() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const doc = frame.contentDocument;
      if (!doc) return;
      const windshield = doc.querySelector('.dv03-windshield');
      if (!windshield) return;

      let slot = doc.getElementById('bklg0128-harness-slot');
      if (!slot) {
        slot = doc.createElement('div');
        slot.id = 'bklg0128-harness-slot';
        slot.setAttribute('aria-hidden', 'true');
        windshield.insertAdjacentElement('afterend', slot);
      }

      const margin = window.innerWidth <= 760 ? 6 : 12;
      const harnessHeight = Math.max(48, harness.offsetHeight || 0);
      slot.style.height = `${harnessHeight + margin * 2}px`;
      slot.style.width = '100%';
      slot.style.pointerEvents = 'none';

      const frameRect = frame.getBoundingClientRect();
      const windshieldRect = windshield.getBoundingClientRect();
      const slotRect = slot.getBoundingClientRect();
      const visible = slotRect.bottom > 0 && slotRect.top < frameRect.height;
      harness.classList.toggle('is-ux-anchored', visible);
      if (!visible) return;

      const width = harness.offsetWidth || Math.min(390, window.innerWidth - margin * 2);
      const uxRight = frameRect.left + windshieldRect.right - margin;
      const maxLeft = Math.max(margin, window.innerWidth - width - margin);
      const left = Math.max(margin, Math.min(maxLeft, uxRight - width));
      const top = frameRect.top + slotRect.top + margin;

      harness.style.top = `${Math.max(margin, top)}px`;
      harness.style.left = `${left}px`;
    });
  }

  function bindFrameEvents() {
    const win = frame.contentWindow;
    if (!win || boundFrameWindow === win) {
      placeHarnessBelowScene();
      return;
    }
    boundFrameWindow = win;
    win.addEventListener('scroll', placeHarnessBelowScene, { passive: true });
    win.addEventListener('resize', placeHarnessBelowScene, { passive: true });
    win.addEventListener('dv:dashboard-rendered', placeHarnessBelowScene);
    win.addEventListener('dv:driver-changing', () => setTimeout(placeHarnessBelowScene, 0));
    const windshield = frame.contentDocument?.querySelector('.dv03-windshield');
    if (windshield && window.ResizeObserver) new ResizeObserver(placeHarnessBelowScene).observe(windshield);
    placeHarnessBelowScene();
  }

  frame.addEventListener('load', bindFrameEvents);
  window.addEventListener('resize', placeHarnessBelowScene, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(placeHarnessBelowScene).observe(harness);
  if (window.MutationObserver) new MutationObserver(placeHarnessBelowScene).observe(harness, {
    attributes: true,
    childList: true,
    subtree: true
  });

  window.DV_BKLG_0128_HARNESS_POSITION = Object.freeze({ placeHarnessBelowScene });
})();
