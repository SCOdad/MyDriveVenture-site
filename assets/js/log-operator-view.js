(() => {
  const style = document.createElement('style');
  style.textContent = `.dv-access-badge{display:inline-flex;align-items:center;min-height:30px;padding:5px 9px;border:1px solid currentColor;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}.dv-access-badge.view{opacity:.82}`;
  document.head.appendChild(style);

  function getAccess(detail) {
    const driverId = detail?.driverId;
    return (detail?.model?.driver_access || []).find(a => a.driver_id === driverId) || null;
  }

  function ensureBadge() {
    const host = document.getElementById('driver-switcher');
    if (!host) return null;
    let badge = document.getElementById('driver-access-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'driver-access-badge';
      badge.className = 'dv-access-badge';
      host.appendChild(badge);
    }
    return badge;
  }

  function setFormReadOnly(formId, readOnly, hideCard) {
    const form = document.getElementById(formId);
    if (!form) return;
    if (hideCard) {
      const card = form.closest('.app-card');
      if (card) card.hidden = readOnly;
    } else {
      form.hidden = readOnly;
      const heading = form.previousElementSibling;
      if (heading && heading.tagName === 'H3') heading.hidden = readOnly;
    }
  }

  function applyOperatorView(detail) {
    const access = getAccess(detail);
    if (!access) return;
    const readOnly = access.mode === 'VIEW';

    setFormReadOnly('drive-form', readOnly, true);
    setFormReadOnly('vehicle-form', readOnly, false);
    document.querySelectorAll('[data-archive-vehicle]').forEach(button => { button.hidden = readOnly; });

    const model = detail?.model || {};
    const select = document.getElementById('driver-select');
    if (select) {
      Array.from(select.options).forEach(option => {
        const driver = (model.drivers || []).find(d => d.id === option.value);
        const driverAccess = (model.driver_access || []).find(a => a.driver_id === option.value);
        if (driver) option.textContent = `${driver.display_name || 'Driver'}${driverAccess?.mode === 'VIEW' ? ' · View only' : ''}`;
      });
    }

    const badge = ensureBadge();
    if (badge) {
      badge.textContent = readOnly ? 'Operator view · read only' : 'Family access';
      badge.className = `dv-access-badge${readOnly ? ' view' : ''}`;
    }
  }

  window.addEventListener('dv:dashboard-rendered', event => applyOperatorView(event.detail));
})();
