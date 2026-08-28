// Public configuration only. No secrets belong in browser JavaScript.
(() => {
  const PROD='https://cayoyqwrmouxuttloemc.supabase.co';
  const DEV='https://safwylxxhywbsfxpmchd.supabase.co';
  const host=String(window.location.hostname||'').toLowerCase();
  const isProdHost=host==='mydriveventure.com'||(host.endsWith('.mydriveventure.com')&&!/^(dev|staging|preview)\./.test(host));
  const base=isProdHost?PROD:DEV;
  if(!isProdHost&&base===PROD) throw new Error('Non-production feedback UI cannot target PROD.');
  window.DV_FEEDBACK_ENDPOINT=`${base}/functions/v1/public-feedback`;
  window.DV_FEEDBACK_ATTACHMENT_ENDPOINT=`${base}/functions/v1/feedback-attachment-upload`;
  window.DV_OPERATOR_FEEDBACK_ENDPOINT=`${base}/functions/v1/operator-feedback`;
})();
window.DV_PROJECT_STATE='ALPHA';
window.DV_CODE_REVISION='cc55ec20e82b212f4f5fd957ec14827dd063b232';
