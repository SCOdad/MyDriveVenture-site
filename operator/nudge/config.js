if (!window.location.pathname.startsWith('/operator/nudge/')) throw new Error('Unexpected nudge operator path');
window.DV_LIFECYCLE_NUDGE_ENDPOINT = window.DV_ENVIRONMENT_CONFIG.functionUrl('lifecycle-nudge');
document.getElementById('environment-notice').textContent = window.DV_ENVIRONMENT_CONFIG.name === 'prod'
  ? 'Production configuration · Rule and template changes affect the live PROD nudge catalog. Automated lifecycle sending is not scheduled.'
  : 'DEV validation · Synthetic data only. Live family nudge sending is disabled.';
