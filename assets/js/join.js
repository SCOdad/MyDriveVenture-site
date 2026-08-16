(() => {
  const form = document.getElementById('dv-onboarding-form');
  if (!form) return;
  const message = document.getElementById('form-message');
  const button = document.getElementById('submit-button');
  const success = document.getElementById('onboarding-success');
  const submissionStorageKey = 'dv:onboarding:submission-id';
  let memorySubmissionId = '';

  function setMessage(text, isError = false) {
    message.textContent = text || '';
    message.classList.toggle('error', isError);
  }

  function value(data, name) {
    return String(data.get(name) || '').trim();
  }

  function getStableSubmissionId() {
    if (memorySubmissionId) return memorySubmissionId;

    try {
      const stored = sessionStorage.getItem(submissionStorageKey);
      if (stored) {
        memorySubmissionId = stored;
        return stored;
      }
    } catch (_) {
      // Continue with in-memory idempotency if browser storage is unavailable.
    }

    memorySubmissionId = `web-${crypto.randomUUID()}`;
    try {
      sessionStorage.setItem(submissionStorageKey, memorySubmissionId);
    } catch (_) {
      // In-memory value still protects repeated clicks in this page lifetime.
    }
    return memorySubmissionId;
  }

  function clearSubmissionId() {
    memorySubmissionId = '';
    try {
      sessionStorage.removeItem(submissionStorageKey);
    } catch (_) {
      // Nothing else to do.
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('');
    if (!form.reportValidity()) return;
    if (button.disabled) return;

    const endpoint = String(window.DV_ONBOARDING_ENDPOINT || '').trim();
    if (!endpoint) {
      setMessage('Online onboarding is being connected. Please try again shortly.', true);
      return;
    }

    const data = new FormData(form);
    const payload = {
      // Reuse the same ID after a timeout/network retry so the backend's
      // unique (source, source_response_id) constraint can return the original
      // onboarding result rather than creating a second family/driver.
      source_response_id: getStableSubmissionId(),
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
      clearSubmissionId();
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
