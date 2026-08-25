// Public configuration only. No secrets belong in browser JavaScript.
window.DV_OPERATOR_BACKLOG_ENDPOINT='https://cayoyqwrmouxuttloemc.supabase.co/functions/v1/operator-backlog';
window.DV_OPERATOR_FEEDBACK_ENDPOINT='https://cayoyqwrmouxuttloemc.supabase.co/functions/v1/operator-feedback';
window.DV_OPERATOR_PRODUCT_SIGNALS_ENDPOINT='https://cayoyqwrmouxuttloemc.supabase.co/functions/v1/operator-product-signals';
window.DV_OPERATOR_ANALYTICS_ENDPOINT='https://cayoyqwrmouxuttloemc.supabase.co/functions/v1/operator-analytics';
window.DV_OPERATOR_CLASSIFICATION_ENDPOINT='https://cayoyqwrmouxuttloemc.supabase.co/functions/v1/operator-classification';
if(document.querySelector('.site-header')&&!document.querySelector('script[data-dv-canonical-header]')){const h=document.createElement('script');h.src='/assets/js/canonical-header.js?v=20260825-0062b';h.defer=true;h.dataset.dvCanonicalHeader='true';document.head.appendChild(h)}