(() => {
  const selected = Object.freeze({
    projectRef: 'safwylxxhywbsfxpmchd',
    supabaseUrl: 'https://safwylxxhywbsfxpmchd.supabase.co',
    publishableKey: 'sb_publishable_RkvQiWAFZG0RFJT5OzjRcg_rKIzLe1e',
  });
  const host = String(window.location.hostname || '').toLowerCase();
  if (!['mydriveventure.com','www.mydriveventure.com'].includes(host)) {
    throw new Error(`BKLG-0151 staging refuses unexpected host: ${host || '(empty)'}`);
  }
  if (!window.location.pathname.startsWith('/staging/BKLG-0151')) {
    throw new Error('BKLG-0151 staging refuses unexpected path');
  }
  const functionUrl = slug => {
    if (!/^[a-z0-9-]+$/.test(String(slug || ''))) throw new Error('Invalid Edge Function slug');
    return `${selected.supabaseUrl}/functions/v1/${slug}`;
  };
  window.DV_ENVIRONMENT_CONFIG = Object.freeze({
    name: 'dev',
    staging: 'BKLG-0151',
    ...selected,
    functionUrl,
  });
})();