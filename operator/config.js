// Public configuration only. No secrets belong in browser JavaScript.
(() => {
  const PROD_URL='https://cayoyqwrmouxuttloemc.supabase.co';
  const host=String(window.location.hostname||'').toLowerCase();
  const nonProdSubdomain=/^(dev|staging|preview)\./.test(host);
  const isProdHost=!nonProdSubdomain&&(host==='mydriveventure.com'||host.endsWith('.mydriveventure.com'));
  const injected=window.DV_RUNTIME_CONFIG||{};
  const base=String(injected.supabaseUrl||(isProdHost?PROD_URL:'')).replace(/\/$/,'');
  if(!base) throw new Error('Drive Venture non-production operator environment is not configured. Refusing PROD fallback.');
  if(!isProdHost&&base===PROD_URL) throw new Error('Non-production operator host attempted to use PROD Supabase.');
  window.DV_OPERATOR_BACKLOG_ENDPOINT=`${base}/functions/v1/operator-backlog`;
  window.DV_OPERATOR_FEEDBACK_ENDPOINT=`${base}/functions/v1/operator-feedback`;
  window.DV_OPERATOR_PRODUCT_SIGNALS_ENDPOINT=`${base}/functions/v1/operator-product-signals`;
  window.DV_OPERATOR_ANALYTICS_ENDPOINT=`${base}/functions/v1/operator-analytics`;
  window.DV_OPERATOR_CLASSIFICATION_ENDPOINT=`${base}/functions/v1/operator-classification`;
})();
if(document.querySelector('.site-header')&&!document.querySelector('script[data-dv-canonical-header]')){const h=document.createElement('script');h.src='/assets/js/canonical-header.js?v=20260825-0062c';h.defer=true;h.dataset.dvCanonicalHeader='true';document.head.appendChild(h)}