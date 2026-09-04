// Public browser configuration. Environment selection is host-pinned.
if (!window.DV_ENVIRONMENT_CONFIG) throw new Error('Drive Venture environment configuration was not loaded');
window.DV_APP_CONFIG = Object.freeze({
  supabaseUrl: window.DV_ENVIRONMENT_CONFIG.supabaseUrl,
  publishableKey: window.DV_ENVIRONMENT_CONFIG.publishableKey,
});

// BKLG-0151 staging only: supported experiences dynamically append shared
// production assets. Route those requests to this UAT package while leaving
// production /log behavior untouched.
(() => {
  const originalAppend = Element.prototype.appendChild;
  Element.prototype.appendChild = function(node) {
    if (node?.tagName === 'SCRIPT') {
      const src = String(node.src || '');
      if (src.includes('/assets/js/log-drive-detail-v4.js')) {
        node.src = '/staging/BKLG-0151/assets/js/log-drive-detail-v4.js?v=20260904-0151-uat4';
      } else if (src.includes('/assets/js/log-driving-log-v1.js')) {
        node.src = '/staging/BKLG-0151/assets/js/log-driving-log-v1.js?v=20260904-0151-uat4';
      }
    }
    return originalAppend.call(this, node);
  };
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
