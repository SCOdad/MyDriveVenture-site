// Public configuration only. No secrets belong in browser JavaScript.
(() => {
  const PROD='https://cayoyqwrmouxuttloemc.supabase.co';
  const DEV='https://safwylxxhywbsfxpmchd.supabase.co';
  const host=String(window.location.hostname||'').toLowerCase();
  const isProdHost=host==='mydriveventure.com'||(host.endsWith('.mydriveventure.com')&&!/^(dev|staging|preview)\./.test(host));
  const base=isProdHost?PROD:DEV;
  if(!isProdHost&&base===PROD) throw new Error('Non-production waitlist UI cannot target PROD.');
  window.DV_WAITLIST_ENDPOINT=`${base}/functions/v1/public-waitlist`;
})();
