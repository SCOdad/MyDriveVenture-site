(() => {
  const attemptedWithoutStorage = new Set();

  function sessionKey(driverId) {
    return `dv.location-shadow.attempted.${driverId}`;
  }

  function claimSession(driverId) {
    const key = sessionKey(driverId);
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

  function randomSessionId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(18);
    window.crypto?.getRandomValues?.(bytes);
    return `fallback_${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
  }

  async function collect(driverId) {
    const app = window.DV_LOG_APP;
    if (!driverId || !app?.client?.functions?.invoke || !claimSession(driverId)) return;
    if (!window.navigator?.geolocation?.getCurrentPosition) return;
    const config = window.DV_ENVIRONMENT_CONFIG;
    try {
      const response = await window.fetch(config.functionUrl('browser-location-snapshot'), {
        method: 'OPTIONS',
        headers: { apikey: config.publishableKey },
      });
      if (response.status !== 204) return;
    } catch (_) {
      return;
    }
    const sessionId = randomSessionId();
    try {
      window.navigator.geolocation.getCurrentPosition(position => {
        const coordinates = position?.coords;
        if (!coordinates) return;
        Promise.resolve(app.client.functions.invoke('browser-location-snapshot', {
          body: {
            driver_id: driverId,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            accuracy_m: coordinates.accuracy,
            observed_at: new Date(position.timestamp || Date.now()).toISOString(),
            session_id: sessionId,
          },
        })).catch(() => {});
      }, () => {}, {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 300000,
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
