// Public configuration only. No secrets belong in browser JavaScript.
(() => {
  const PROD_URL='https://cayoyqwrmouxuttloemc.supabase.co';
  const host=String(window.location.hostname||'').toLowerCase();
  const nonProdSubdomain=/^(dev|staging|preview)\./.test(host);
  const isProdHost=!nonProdSubdomain&&(host==='mydriveventure.com'||host.endsWith('.mydriveventure.com'));
  const injected=window.DV_RUNTIME_CONFIG||{};
  const base=String(injected.supabaseUrl||(isProdHost?PROD_URL:'')).replace(/\/$/,'');
  if(!base) throw new Error('Drive Venture non-production feedback environment is not configured. Refusing PROD fallback.');
  if(!isProdHost&&base===PROD_URL) throw new Error('Non-production feedback host attempted to use PROD Supabase.');
  window.DV_FEEDBACK_ENDPOINT=`${base}/functions/v1/public-feedback`;
  window.DV_FEEDBACK_ATTACHMENT_ENDPOINT=`${base}/functions/v1/feedback-attachment-upload`;
  window.DV_OPERATOR_FEEDBACK_ENDPOINT=`${base}/functions/v1/operator-feedback`;
})();
window.DV_PROJECT_STATE = 'ALPHA';
// Source revision containing the released feedback/operator experience.
window.DV_CODE_REVISION = 'cc55ec20e82b212f4f5fd957ec14827dd063b232';
