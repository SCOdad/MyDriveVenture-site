// Public configuration only. No secrets belong in browser JavaScript.
window.DV_OPERATOR_BACKLOG_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-backlog');
window.DV_OPERATOR_FEEDBACK_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-feedback');
window.DV_OPERATOR_PRODUCT_SIGNALS_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-product-signals');
window.DV_OPERATOR_ANALYTICS_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-analytics');
window.DV_OPERATOR_CLASSIFICATION_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-classification');
if(document.querySelector('.site-header')&&!document.querySelector('script[data-dv-canonical-header]')){const h=document.createElement('script');h.src='/assets/js/canonical-header.js?v=20260825-0062c';h.defer=true;h.dataset.dvCanonicalHeader='true';document.head.appendChild(h)}