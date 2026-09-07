// Public configuration only. No secrets belong in browser JavaScript.
window.DV_OPERATOR_BACKLOG_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-backlog');
window.DV_OPERATOR_FEEDBACK_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-feedback');
window.DV_OPERATOR_PRODUCT_SIGNALS_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-product-signals');
window.DV_OPERATOR_ANALYTICS_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-analytics');
window.DV_OPERATOR_LEADS_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-leads');
window.DV_OPERATOR_CLASSIFICATION_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-classification');
if(document.querySelector('.site-header')&&!document.querySelector('script[data-dv-canonical-header]')){const h=document.createElement('script');h.src='/assets/js/canonical-header.js?v=20260825-0062c';h.defer=true;h.dataset.dvCanonicalHeader='true';document.head.appendChild(h)}
if(document.getElementById('operator-dashboard')){
  if(!document.querySelector('link[data-dv-operator-leads]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/css/operator-leads.css?v=20260907-alpha';l.dataset.dvOperatorLeads='true';document.head.appendChild(l)}
  if(!document.querySelector('script[data-dv-operator-leads]')){const s=document.createElement('script');s.src='/operator/leads.js?v=20260907-alpha';s.defer=true;s.dataset.dvOperatorLeads='true';document.body.appendChild(s)}
}