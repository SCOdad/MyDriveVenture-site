// Public configuration only. Never place Supabase secrets or service-role keys here.
window.DV_ONBOARDING_ENDPOINT = 'https://cayoyqwrmouxuttloemc.supabase.co/functions/v1/public-onboarding-v2';

// Driver email is the primary login identity for the Drive Venture experience.
// Keep this guard here so the live /join form cannot create a driver with no
// usable authentication path even if the static markup is served from cache.
(() => {
  const field = document.querySelector('#dv-onboarding-form input[name="driverEmail"]');
  if (!field) return;
  field.required = true;

  const label = field.closest('label');
  const fieldLabel = label?.querySelector('.field-label');
  if (!fieldLabel) return;

  const optional = fieldLabel.querySelector('.meta');
  if (optional) optional.remove();
  if (!fieldLabel.querySelector('.required-marker')) {
    const marker = document.createElement('span');
    marker.className = 'required-marker';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = '*';
    const tip = fieldLabel.querySelector('.tip');
    fieldLabel.insertBefore(marker, tip || null);
    fieldLabel.insertBefore(document.createTextNode(' '), tip || null);
  }

  const tip = fieldLabel.querySelector('.tip');
  if (tip) {
    tip.dataset.tip = 'Required so the driver can receive a magic link and sign in to their Drive Venture account. The driver is the primary app user.';
    tip.setAttribute('aria-label', 'Why driver email is required');
  }
})();
