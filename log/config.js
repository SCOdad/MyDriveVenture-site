// Public browser configuration. Supabase publishable keys are designed for client-side use with RLS.
(() => {
  const PROD_URL = 'https://cayoyqwrmouxuttloemc.supabase.co';
  const PROD_KEY = 'sb_publishable_7RzACdnPmj_QiYSqzJRlfw_YaXyMws6';
  const host = String(window.location.hostname || '').toLowerCase();
  const nonProdSubdomain = /^(dev|staging|preview)\./.test(host);
  const isProdHost = !nonProdSubdomain && (host === 'mydriveventure.com' || host.endsWith('.mydriveventure.com'));
  const injected = window.DV_RUNTIME_CONFIG || {};
  const supabaseUrl = String(injected.supabaseUrl || (isProdHost ? PROD_URL : '')).trim();
  const publishableKey = String(injected.publishableKey || (isProdHost ? PROD_KEY : '')).trim();

  if (!supabaseUrl || !publishableKey) {
    throw new Error('Drive Venture non-production browser environment is not configured. Refusing to fall back to PROD.');
  }
  if (!isProdHost && supabaseUrl === PROD_URL) {
    throw new Error('Drive Venture non-production host attempted to use the PROD Supabase project.');
  }

  window.DV_APP_CONFIG = { supabaseUrl, publishableKey };
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

