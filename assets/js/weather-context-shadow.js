(() => {
  const attemptedWithoutStorage = new Set();
  const RETRY_DELAY_MS = 500;
  const MAX_READY_ATTEMPTS = 10;

  function claimSession(driverId) {
    const key = `dv.weather-context-shadow.attempted.${driverId}`;
    try {
      if (window.sessionStorage.getItem(key)) return false;
      window.sessionStorage.setItem(key, '1');
      return true;
    } catch (_) {
      if (attemptedWithoutStorage.has(key)) return false;
      attemptedWithoutStorage.add(key);
      return true;
    }
  }

  async function collect(driverId) {
    const app = window.DV_LOG_APP;
    if (!driverId || !app?.client?.functions?.invoke || !claimSession(driverId)) return;
    try {
      await app.client.functions.invoke('drive-ops', {
        body: { action: 'weather_context_shadow', driver_id: driverId },
      });
    } catch (_) {
      // Shadow evidence must never affect the operational dashboard.
    }
  }

  function tryActiveDriver() {
    const app = window.DV_LOG_APP;
    const driverId = app?.getDriverId?.();
    if (!driverId || !app?.client?.functions?.invoke) return false;
    collect(driverId).catch(() => {});
    return true;
  }

  function retryUntilReady(attempt = 0) {
    if (tryActiveDriver() || attempt >= MAX_READY_ATTEMPTS - 1) return;
    window.setTimeout(() => retryUntilReady(attempt + 1), RETRY_DELAY_MS);
  }

  window.addEventListener('dv:dashboard-rendered', event => {
    const driverId = event?.detail?.driverId || window.DV_LOG_APP?.getDriverId?.();
    collect(driverId).catch(() => {});
  });

  retryUntilReady();
})();
