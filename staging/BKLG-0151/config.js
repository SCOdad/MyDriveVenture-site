// Public browser configuration. Environment selection is host-pinned.
if (!window.DV_ENVIRONMENT_CONFIG) throw new Error('Drive Venture environment configuration was not loaded');
window.DV_APP_CONFIG = Object.freeze({
  supabaseUrl: window.DV_ENVIRONMENT_CONFIG.supabaseUrl,
  publishableKey: window.DV_ENVIRONMENT_CONFIG.publishableKey,
});

// BKLG-0151 staging only: the dashboard bootstrap dynamically appends the
// production trip-detail asset. Rewrite that single script request to the
// staged UAT implementation without changing production /log behavior.
(() => {
  const originalAppend = Element.prototype.appendChild;
  Element.prototype.appendChild = function(node) {
    if (node?.tagName === 'SCRIPT' && String(node.src || '').includes('/assets/js/log-drive-detail-v4.js')) {
      node.src = '/staging/BKLG-0151/assets/js/log-drive-detail-v4.js?v=20260904-0151-uat4';
      Element.prototype.appendChild = originalAppend;
    }
    return originalAppend.call(this, node);
  };
})();

// BKLG-0151: visible Michigan skill checkboxes are authoritative. Preserve the
// checked UI values even if a late form-context refresh updates the hidden
// compatibility select before submit.
(() => {
  const hideCompatibilitySelect = () => {
    const lesson = document.getElementById('drive-lesson');
    if (!lesson) return;
    lesson.hidden = true;
    lesson.setAttribute('aria-hidden', 'true');
    lesson.tabIndex = -1;
    lesson.style.setProperty('display', 'none', 'important');
    lesson.style.setProperty('visibility', 'hidden', 'important');
    lesson.style.setProperty('position', 'absolute', 'important');
    lesson.style.setProperty('width', '1px', 'important');
    lesson.style.setProperty('height', '1px', 'important');
    lesson.style.setProperty('overflow', 'hidden', 'important');
    lesson.style.setProperty('clip-path', 'inset(50%)', 'important');
  };

  const installGuard = () => {
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

    // The select is only a compatibility state mirror. Keep it out of the
    // visual and accessibility layout even if later scripts mutate its style.
    hideCompatibilitySelect();
    const lesson = document.getElementById('drive-lesson');
    if (lesson && !lesson.__bklg0151HideObserver) {
      const observer = new MutationObserver(() => hideCompatibilitySelect());
      observer.observe(lesson, { attributes: true, attributeFilter: ['style', 'hidden', 'aria-hidden', 'tabindex'] });
      lesson.__bklg0151HideObserver = observer;
    }

    // Narrow/Safari UAT repair: draw the checkbox indicator ourselves so it
    // remains visible even when the browser suppresses native checkbox chrome.
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
  };

  installGuard();
  window.addEventListener('load', installGuard);
  window.addEventListener('dv:dashboard-rendered', installGuard);
  window.addEventListener('dv:driving-log-context', installGuard);
})();

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

