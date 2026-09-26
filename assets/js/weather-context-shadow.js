(() => {
  const attemptedWithoutStorage = new Set();

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

  window.addEventListener('dv:dashboard-rendered', event => {
    collect(event?.detail?.driverId || window.DV_LOG_APP?.getDriverId?.()).catch(() => {});
  });
  const activeDriver = window.DV_LOG_APP?.getDriverId?.();
  if (activeDriver) collect(activeDriver).catch(() => {});
})();
