(() => {
  const environments = Object.freeze({
    prod: Object.freeze({
      projectRef: 'cayoyqwrmouxuttloemc',
      supabaseUrl: 'https://cayoyqwrmouxuttloemc.supabase.co',
      publishableKey: 'sb_publishable_7RzACdnPmj_QiYSqzJRlfw_YaXyMws6',
    }),
    dev: Object.freeze({
      projectRef: 'safwylxxhywbsfxpmchd',
      supabaseUrl: 'https://safwylxxhywbsfxpmchd.supabase.co',
      publishableKey: 'sb_publishable_RkvQiWAFZG0RFJT5OzjRcg_rKIzLe1e',
    }),
  });
  const productionHosts = new Set(['mydriveventure.com', 'www.mydriveventure.com', 'log.mydriveventure.com']);
  const developmentHosts = new Set(['localhost', '127.0.0.1', 'dev.mydriveventure.com']);
  const host = String(window.location.hostname || '').toLowerCase();
  const cloudflareDevHost = host === 'mydriveventure-dev.pages.dev' || host.endsWith('.mydriveventure-dev.pages.dev');
  const name = productionHosts.has(host) ? 'prod' : developmentHosts.has(host) || cloudflareDevHost ? 'dev' : null;
  if (!name) throw new Error(`Drive Venture refuses unknown deployment host: ${host || '(empty)'}`);
  const selected = environments[name];
  const actualRef = new URL(selected.supabaseUrl).hostname.split('.')[0];
  if (actualRef !== selected.projectRef) throw new Error('Drive Venture environment/project mismatch');
  const functionUrl = slug => {
    if (!/^[a-z0-9-]+$/.test(String(slug || ''))) throw new Error('Invalid Edge Function slug');
    return `${selected.supabaseUrl}/functions/v1/${slug}`;
  };
  window.DV_ENVIRONMENT_CONFIG = Object.freeze({
    name,
    projectRef: selected.projectRef,
    supabaseUrl: selected.supabaseUrl,
    publishableKey: selected.publishableKey,
    functionUrl,
  });
})();
