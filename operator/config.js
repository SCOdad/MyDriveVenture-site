// Public configuration only. No secrets belong in browser JavaScript.
window.DV_OPERATOR_BACKLOG_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-backlog');
window.DV_OPERATOR_FEEDBACK_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-feedback');
window.DV_OPERATOR_PRODUCT_SIGNALS_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-product-signals');
window.DV_OPERATOR_ANALYTICS_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-analytics');
window.DV_OPERATOR_CLASSIFICATION_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-classification');
window.DV_OPERATOR_DICTIONARY_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-dictionary');
window.DV_OPERATOR_QUESTS_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-quests');
if(document.querySelector('.site-header')&&!document.querySelector('script[data-dv-canonical-header]')){const h=document.createElement('script');h.src='/assets/js/canonical-header.js?v=20260825-0062c';h.defer=true;h.dataset.dvCanonicalHeader='true';document.head.appendChild(h)}

window.DV_OPERATOR_LIFECYCLE_ENDPOINT=window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-lifecycle');
// BKLG-0239: discoverable operator entry point, read-only until lifecycle actions are certified.
if(location.pathname==='/operator/'||location.pathname==='/operator/index.html'){
  const tools=document.querySelector('.operator-tools');
  if(tools&&!tools.querySelector('a[href="/operator/lifecycle/"]')){
    const card=document.createElement('article');
    card.className='operator-tool';
    const heading=document.createElement('h3');heading.textContent='Lifecycle Management';
    const detail=document.createElement('p');detail.textContent='Preview family and driver dependencies before administrative lifecycle changes.';
    const link=document.createElement('a');link.className='button button-primary';
    link.href='/operator/lifecycle/';link.textContent='Lifecycle Preview';
    card.append(heading,detail,link);
    tools.append(card);
  }
}
