(() => {
  if (window.DV_ENTITLEMENTS || window.DV_ENTITLEMENTS_INSTALLING || document.querySelector('script[data-dv-entitlements-safe]')) return;

  const script = document.createElement('script');
  script.src = '/assets/js/log-entitlements-safe.js?v=20260922-0201-safe1';
  script.async = false;
  script.dataset.dvEntitlementsSafe = 'true';
  script.addEventListener('error', () => {
    const form = document.getElementById('drive-form');
    if (!form) return;
    let panel = document.getElementById('drive-entitlement-status');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'drive-entitlement-status';
      panel.className = 'app-status drive-entitlement-status error';
      panel.setAttribute('role', 'status');
      form.prepend(panel);
    }
    panel.hidden = false;
    panel.className = 'app-status drive-entitlement-status error';
    panel.textContent = 'Drive Venture could not load family entitlement status. New drive logging may be unavailable until this refreshes.';
  });

  (document.head || document.documentElement).appendChild(script);
})();
