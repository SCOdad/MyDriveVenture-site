(() => {
  if (window.DV_ENTITLEMENTS_SAFE_LOADING || window.DV_ENTITLEMENTS) return;
  window.DV_ENTITLEMENTS_SAFE_LOADING = true;
  const script = document.createElement('script');
  script.src = '/assets/js/log-entitlements-safe.js?v=20260922-0201-safe1';
  script.async = false;
  script.onload = () => { window.DV_ENTITLEMENTS_SAFE_LOADING = false; };
  script.onerror = () => {
    window.DV_ENTITLEMENTS_SAFE_LOADING = false;
    const form = document.getElementById('drive-form');
    if (!form) return;
    let panel = document.getElementById('drive-entitlement-status');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'drive-entitlement-status';
      panel.className = 'app-status drive-entitlement-status error';
      form.prepend(panel);
    }
    panel.hidden = false;
    panel.textContent = 'Drive Venture could not load family entitlement status. New drive logging may be unavailable until this refreshes.';
  };
  document.head.appendChild(script);
})();
