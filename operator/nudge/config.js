if (!window.location.pathname.startsWith('/operator/nudge/')) throw new Error('Unexpected nudge operator path');
window.DV_LIFECYCLE_NUDGE_ENDPOINT = window.DV_ENVIRONMENT_CONFIG.functionUrl('lifecycle-nudge');
document.getElementById('environment-notice').textContent = window.DV_ENVIRONMENT_CONFIG.name === 'prod'
  ? 'Production configuration · Rule and template changes affect the live PROD nudge catalog. The delivery control below shows whether scheduled lifecycle sending is paused or active.'
  : 'DEV validation · Synthetic data only. Live family nudge sending is disabled.';
