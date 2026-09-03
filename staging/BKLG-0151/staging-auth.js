(() => {
  const DEV = window.DV_APP_CONFIG || {};
  const PROD = Object.freeze({
    supabaseUrl: 'https://cayoyqwrmouxuttloemc.supabase.co',
    publishableKey: 'sb_publishable_7RzACdnPmj_QiYSqzJRlfw_YaXyMws6',
  });
  const STAGING_PATH = '/staging/BKLG-0151/';
  const loginForm = document.getElementById('login-form');
  const loginStatus = document.getElementById('login-status');
  const loginEmail = document.getElementById('login-email');
  const button = loginForm?.querySelector('button');

  const setStatus = (text, kind='') => {
    if (!loginStatus) return;
    loginStatus.textContent = text || '';
    loginStatus.className = `app-status${kind ? ` ${kind}` : ''}`;
  };

  if (!window.supabase || !DEV.supabaseUrl || !DEV.publishableKey) return;

  const devClient = window.DV_SUPABASE_CLIENT || window.supabase.createClient(
    DEV.supabaseUrl,
    DEV.publishableKey,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
  window.DV_SUPABASE_CLIENT = devClient;

  async function bridgeFromProd() {
    // If this is the return from the DEV magic-link exchange, let the normal
    // Supabase client finish consuming the URL rather than starting a new bridge.
    if (location.search.includes('code=') || location.hash.includes('access_token=')) return;

    const { data: devData } = await devClient.auth.getSession();
    if (devData.session) return;

    const prodClient = window.supabase.createClient(
      PROD.supabaseUrl,
      PROD.publishableKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: 'sb-cayoyqwrmouxuttloemc-auth-token',
        },
      }
    );
    const { data: prodData } = await prodClient.auth.getSession();
    const prodSession = prodData.session;
    if (!prodSession?.access_token) return;

    if (loginEmail) loginEmail.disabled = true;
    if (button) button.disabled = true;
    setStatus('Opening the BKLG-0151 staging session…');

    const response = await fetch(`${DEV.supabaseUrl}/functions/v1/staging-auth-bridge`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${prodSession.access_token}`,
        apikey: DEV.publishableKey,
        'content-type': 'application/json',
      },
      body: '{}',
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok !== true || !body?.action_link) {
      if (loginEmail) loginEmail.disabled = false;
      if (button) button.disabled = false;
      setStatus(
        response.status === 403
          ? 'This staging build requires an active Drive Venture operator session.'
          : 'We could not open the staging session automatically. You can use the DEV test login instead.',
        'error'
      );
      return;
    }
    location.replace(String(body.action_link));
  }

  bridgeFromProd().catch(() => {
    if (loginEmail) loginEmail.disabled = false;
    if (button) button.disabled = false;
    setStatus('We could not open the staging session automatically. You can use the DEV test login instead.', 'error');
  });
})();