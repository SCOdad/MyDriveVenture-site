// Public configuration only. Never place Supabase secrets or service-role keys here.
window.DV_ONBOARDING_ENDPOINT = 'https://cayoyqwrmouxuttloemc.supabase.co/functions/v1/public-onboarding-v2';

// Driver email is the primary login identity for the Drive Venture experience.
// Keep this guard here so the live /join form cannot create a driver with no
// usable authentication path even if the static markup is served from cache.
(() => {
  const form = document.getElementById('dv-onboarding-form');
  const field = form?.querySelector('input[name="driverEmail"]');
  if (!field) return;
  field.required = true;

  const label = field.closest('label');
  const fieldLabel = label?.querySelector('.field-label');
  if (fieldLabel) {
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
  }

  // BKLG-0081: make successful onboarding hand off directly to the driver's
  // login path. The only onboarding value carried forward is the required
  // driver email, URL-encoded for the login prefill.
  const success = document.getElementById('onboarding-success');
  if (!success) return;
  const heading = success.querySelector('h2');
  if (heading) heading.textContent = 'Your driver is ready for Drive Venture.';
  const paragraphs = success.querySelectorAll('p');
  if (paragraphs[1]) paragraphs[1].textContent = 'Next, open Drive Venture and sign in with the driver email you just registered. We’ll email a secure sign-in link.';
  if (paragraphs[2]) paragraphs[2].textContent = 'Grown-ups can also sign in separately with their own registered email.';
  const cta = success.querySelector('a.button');
  if (cta) {
    cta.textContent = 'Open Drive Venture';
    cta.classList.add('primary');
    cta.addEventListener('click', () => {
      const email = field.value.trim();
      cta.href = email ? `/log/?email=${encodeURIComponent(email)}` : '/log/';
    });
  }
})();
