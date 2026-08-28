// Public configuration only. No secrets belong in browser JavaScript.
(() => {
  const PROD_URL='https://cayoyqwrmouxuttloemc.supabase.co';
  const host=String(window.location.hostname||'').toLowerCase();
  const nonProdSubdomain=/^(dev|staging|preview)\./.test(host);
  const isProdHost=!nonProdSubdomain&&(host==='mydriveventure.com'||host.endsWith('.mydriveventure.com'));
  const injected=window.DV_RUNTIME_CONFIG||{};
  const base=String(injected.supabaseUrl||(isProdHost?PROD_URL:'')).replace(/\/$/,'');
  if(!base) throw new Error('Drive Venture non-production waitlist environment is not configured. Refusing PROD fallback.');
  if(!isProdHost&&base===PROD_URL) throw new Error('Non-production waitlist host attempted to use PROD Supabase.');
  window.DV_WAITLIST_ENDPOINT=`${base}/functions/v1/public-waitlist`;
})();
