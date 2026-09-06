(() => {
  if (window.DV_DRIVER_SWITCH_SYNC_BOUND) return;
  const app = window.DV_LOG_APP;
  if (!app?.selectDriver) return;
  window.DV_DRIVER_SWITCH_SYNC_BOUND = true;

  let initialDeepLinkHandled = false;

  function params() { return new URLSearchParams(window.location.search); }
  function validDriverId(driverId) {
    return !!driverId && (app.getModel?.().drivers || []).some(driver => driver.id === driverId);
  }
  function syncUrl(driverId) {
    if (!validDriverId(driverId)) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('driver') === driverId) return;
    url.searchParams.set('driver', driverId);
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }
  async function applyInitialDeepLink() {
    if (initialDeepLinkHandled) return;
    const drivers = app.getModel?.().drivers || [];
    if (!drivers.length) return;
    const requested = params().get('driver');
    initialDeepLinkHandled = true;
    if (!requested || !validDriverId(requested)) return;
    if (app.getDriverId?.() !== requested) await app.selectDriver(requested, { persist: true });
    else syncUrl(requested);
  }

  window.addEventListener('dv:driver-changing', event => {
    const driverId = event.detail?.driverId;
    if (validDriverId(driverId)) syncUrl(driverId);
  });
  window.addEventListener('dv:dashboard-rendered', () => {
    applyInitialDeepLink().catch(error => console.error('Driver deep-link selection failed', error));
  });

  applyInitialDeepLink().catch(error => console.error('Driver deep-link selection failed', error));
})();
