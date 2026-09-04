// Public browser configuration. Environment selection is host-pinned.
if (!window.DV_ENVIRONMENT_CONFIG) throw new Error('Drive Venture environment configuration was not loaded');
window.DV_APP_CONFIG = Object.freeze({
  supabaseUrl: window.DV_ENVIRONMENT_CONFIG.supabaseUrl,
  publishableKey: window.DV_ENVIRONMENT_CONFIG.publishableKey,
});

// BKLG-0151: the visible Michigan skill checkboxes are the authoritative
// browser selection surface. The hidden <select multiple> remains a compatibility
// mirror, but late context refreshes must never make a checked skill disappear
// from the payload that log-drive-rpc sends to the authoritative save path.
window.addEventListener('load', () => {
  const api = window.DV_DRIVING_LOG;
  if (api && !api.__checkboxSelectionAuthoritative) {
    const fallback = api.getSelectedLessonIds?.bind(api);
    api.getSelectedLessonIds = () => {
      const grid = document.getElementById('drive-lesson-options');
      if (grid) return [...grid.querySelectorAll('input[type=checkbox]:checked')].map(box => box.value).filter(Boolean);
      return fallback ? fallback() : [];
    };
    api.__checkboxSelectionAuthoritative = true;
  }

  // Safari/narrow-layout guard. The compatibility <select multiple> must never
  // become the visible control, and the checkbox glyph is drawn by CSS rather
  // than relying on browser-native checkbox rendering.
  if (!document.getElementById('bklg-0151-skill-visibility-guard')) {
    const style = document.createElement('style');
    style.id = 'bklg-0151-skill-visibility-guard';
    style.textContent = `
      #drive-lesson{display:none!important;visibility:hidden!important;position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important}
      .drive-skill-option{position:relative!important}
      .drive-skill-option>input[type=checkbox]{position:absolute!important;opacity:0!important;width:1px!important;height:1px!important;pointer-events:none!important}
      .drive-skill-option>span{position:relative!important;padding-left:1.65rem!important;min-height:1.15rem!important}
      .drive-skill-option>span::before{content:"";box-sizing:border-box;position:absolute;left:0;top:.02rem;width:1.05rem;height:1.05rem;border:2px solid currentColor;background:#f8f4e9}
      .drive-skill-option>input[type=checkbox]:checked+span::after{content:"✓";position:absolute;left:.12rem;top:-.14rem;color:#101416;font-weight:900;font-size:1rem;line-height:1.2}
      .drive-skill-option>input[type=checkbox]:focus-visible+span::before{outline:3px solid #f8ba20;outline-offset:2px}
    `;
    document.head.appendChild(style);
  }
});

// BKLG-0081: accept the onboarding handoff email, prefill the shared login
// form used by both skins, then remove the email from the visible URL so it is
// not retained in bookmarks or copied links.
(() => {
  const field = document.getElementById('login-email');
  if (!field) return;
  const url = new URL(window.location.href);
  const email = String(url.searchParams.get('email') || '').trim();
  if (!email) return;
  field.value = email;
  field.focus();
  url.searchParams.delete('email');
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', next);
})();

