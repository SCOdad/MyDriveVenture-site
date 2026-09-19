if (!window.location.pathname.startsWith('/staging/operator-leads/')) throw new Error('Unexpected leads staging path');
window.DV_OPERATOR_LEADS_ENDPOINT = window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-leads');
window.DV_LIFECYCLE_NUDGE_ENDPOINT = window.DV_ENVIRONMENT_CONFIG.functionUrl('lifecycle-nudge');
document.getElementById('environment-notice').textContent = window.DV_ENVIRONMENT_CONFIG.name === 'prod'
  ? 'Staged interface · Live production data. Adding leads and saving links updates real records.'
  : 'DEV validation · Synthetic data only.';
