(() => {
  const form = document.getElementById('dv-onboarding-form');
  if (!form) return;
  const message = document.getElementById('form-message');
  const button = document.getElementById('submit-button');
  const success = document.getElementById('onboarding-success');

  function setMessage(text, isError = false) {
    message.textContent = text || '';
    message.classList.toggle('error', isError);
  }

  function value(data, name) {
    return String(data.get(name) || '').trim();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('');
    if (!form.reportValidity()) return;

    const endpoint = String(window.DV_ONBOARDING_ENDPOINT || '').trim();
    if (!endpoint) {
      setMessage('Online onboarding is being connected. Please try again shortly.', true);
      return;
    }

    const data = new FormData(form);
    const payload = {
      source_response_id: `web-${crypto.randomUUID()}`,
      website: value(data, 'website'),
      guardian: {
        given_name: value(data, 'guardianGivenName'),
        family_name: value(data, 'guardianFamilyName'),
        email: value(data, 'guardianEmail'),
        mobile: value(data, 'guardianMobile'),
        sms_opt_in: data.get('guardianSmsOptIn') === 'on'
      },
      driver: {
        given_name: value(data, 'driverGivenName'),
        family_name: value(data, 'driverFamilyName'),
        birth_date: value(data, 'driverBirthDate'),
        email: value(data, 'driverEmail'),
        mobile: value(data, 'driverMobile'),
        home_zip: value(data, 'homeZip'),
        license_stage: value(data, 'licenseStage'),
        level1_license_date: value(data, 'licenseStageStartDate'),
        favorite_color: value(data, 'favoriteColor'),
        custom_avatar_requested: data.get('customAvatarRequested') === 'on'
      },
      vehicle: {
        name: value(data, 'vehicleName'),
        class: value(data, 'vehicleClass'),
        color: value(data, 'vehicleColor')
      }
    };

    button.disabled = true;
    button.textContent = 'Submitting…';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) {
        throw new Error(result.error || 'We could not submit onboarding right now.');
      }
      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not submit onboarding right now.', true);
    } finally {
      button.disabled = false;
      button.textContent = 'Join the pilot';
    }
  });
})();
