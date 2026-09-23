if (!window.location.pathname.startsWith('/staging/nudge/')) throw new Error('Unexpected nudge staging path');
window.DV_LIFECYCLE_NUDGE_ENDPOINT = window.DV_ENVIRONMENT_CONFIG.functionUrl('lifecycle-nudge');
document.getElementById('environment-notice').textContent = window.DV_ENVIRONMENT_CONFIG.name === 'prod'
  ? 'Staged interface · Live production data. Rule/template changes would affect production configuration.'
  : 'DEV validation · Synthetic data only. Live family nudge sending is disabled.';
