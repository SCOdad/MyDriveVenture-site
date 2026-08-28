// Public browser configuration. Supabase publishable keys are designed for client-side use with RLS.
(() => {
  const PROD_URL = 'https://cayoyqwrmouxuttloemc.supabase.co';
  const PROD_KEY = 'sb_publishable_7RzACdnPmj_QiYSqzJRlfw_YaXyMws6';
  const DEV_URL = 'https://safwylxxhywbsfxpmchd.supabase.co';
  const DEV_KEY = 'sb_publishable_RkvQiWAFZG0RFJT5OzjRcg_rKIzLe1e';
  const host = String(window.location.hostname || '').toLowerCase();
  const isProdHost = host === 'mydriveventure.com' || host.endsWith('.mydriveventure.com') && !/^(dev|staging|preview)\./.test(host);
  const injected = window.DV_RUNTIME_CONFIG || {};
  const supabaseUrl = String(injected.supabaseUrl || (isProdHost ? PROD_URL : DEV_URL)).trim();
  const publishableKey = String(injected.publishableKey || (isProdHost ? PROD_KEY : DEV_KEY)).trim();

  if (!supabaseUrl || !publishableKey) {
    throw new Error('Drive Venture browser environment is not configured.');
  }
  if (!isProdHost && supabaseUrl === PROD_URL) {
    throw new Error('Drive Venture non-production host attempted to use the PROD Supabase project.');
  }
  if (isProdHost && supabaseUrl !== PROD_URL) {
    throw new Error('Drive Venture production host attempted to use a non-production Supabase project.');
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
