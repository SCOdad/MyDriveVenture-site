// Public configuration only. No secrets belong in browser JavaScript.
(() => {
  const PROD = 'https://cayoyqwrmouxuttloemc.supabase.co';
  const DEV = 'https://safwylxxhywbsfxpmchd.supabase.co';
  const host = String(window.location.hostname || '').toLowerCase();
  const isProdHost = host === 'mydriveventure.com' || (host.endsWith('.mydriveventure.com') && !/^(dev|staging|preview)\./.test(host));
  const base = isProdHost ? PROD : DEV;
  if (!isProdHost && base === PROD) throw new Error('Non-production operator UI cannot target PROD.');
  window.DV_OPERATOR_BACKLOG_ENDPOINT=`${base}/functions/v1/operator-backlog`;
  window.DV_OPERATOR_FEEDBACK_ENDPOINT=`${base}/functions/v1/operator-feedback`;
  window.DV_OPERATOR_PRODUCT_SIGNALS_ENDPOINT=`${base}/functions/v1/operator-product-signals`;
  window.DV_OPERATOR_ANALYTICS_ENDPOINT=`${base}/functions/v1/operator-analytics`;
  window.DV_OPERATOR_CLASSIFICATION_ENDPOINT=`${base}/functions/v1/operator-classification`;
})();
if(document.querySelector('.site-header')&&!document.querySelector('script[data-dv-canonical-header]')){const h=document.createElement('script');h.src='/assets/js/canonical-header.js?v=20260825-0062c';h.defer=true;h.dataset.dvCanonicalHeader='true';document.head.appendChild(h)}