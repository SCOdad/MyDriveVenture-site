(() => {
  const form = document.getElementById('dv-onboarding-form');
  if (!form) return;
  const message = document.getElementById('form-message');
  const button = document.getElementById('submit-button');
  const success = document.getElementById('onboarding-success');
  const avatarRequested = document.getElementById('custom-avatar-requested');
  const avatarWrap = document.getElementById('avatar-upload-wrap');
  const avatarPhoto = document.getElementById('avatar-photo');
  const submissionStorageKey = 'dv:onboarding:submission-id';
  let memorySubmissionId = '';

  function setMessage(text, isError = false) {
    message.textContent = text || '';
    message.classList.toggle('error', isError);
  }

  function value(data, name) {
    return String(data.get(name) || '').trim();
  }

  function syncAvatarUpload() {
    const requested = Boolean(avatarRequested && avatarRequested.checked);
    if (avatarWrap) avatarWrap.hidden = !requested;
    if (avatarPhoto) {
      avatarPhoto.required = requested;
      if (!requested) avatarPhoto.value = '';
    }
  }

  async function fileToPayload(file) {
    if (!file) return null;
    const maxBytes = 4 * 1024 * 1024;
    if (file.size > maxBytes) throw new Error('Driver photo must be 4 MB or smaller.');
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
    if (file.type && !allowed.has(file.type)) throw new Error('Driver photo must be JPEG, PNG, WebP, HEIC, or HEIF.');

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Unable to read the selected driver photo.'));
      reader.readAsDataURL(file);
    });

    const comma = dataUrl.indexOf(',');
    if (comma < 0) throw new Error('Unable to encode the selected driver photo.');
    return {
      filename: file.name || 'driver-photo',
      content_type: file.type || 'application/octet-stream',
      base64: dataUrl.slice(comma + 1)
    };
  }

  function getStableSubmissionId() {
    if (memorySubmissionId) return memorySubmissionId;
    try {
      const stored = sessionStorage.getItem(submissionStorageKey);
      if (stored) {
        memorySubmissionId = stored;
        return stored;
      }
    } catch (_) {}
    memorySubmissionId = `web-${crypto.randomUUID()}`;
    try { sessionStorage.setItem(submissionStorageKey, memorySubmissionId); } catch (_) {}
    return memorySubmissionId;
  }

  function clearSubmissionId() {
    memorySubmissionId = '';
    try { sessionStorage.removeItem(submissionStorageKey); } catch (_) {}
  }

  if (avatarRequested) avatarRequested.addEventListener('change', syncAvatarUpload);
  syncAvatarUpload();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('');
    syncAvatarUpload();
    if (!form.reportValidity()) return;
    if (button.disabled) return;

    const endpoint = String(window.DV_ONBOARDING_ENDPOINT || '').trim();
    if (!endpoint) {
      setMessage('Online onboarding is being connected. Please try again shortly.', true);
      return;
    }

    const data = new FormData(form);
    button.disabled = true;
    button.textContent = 'Submitting…';

    try {
      const photoFile = avatarPhoto && avatarPhoto.files ? avatarPhoto.files[0] : null;
      const photo = avatarRequested && avatarRequested.checked ? await fileToPayload(photoFile) : null;
      const guardianName = value(data, 'guardianName');
      const driverName = value(data, 'driverName');
      const payload = {
        source_response_id: getStableSubmissionId(),
        website: value(data, 'website'),
        guardian: {
          given_name: guardianName,
          family_name: '',
          display_name: guardianName,
          email: value(data, 'guardianEmail'),
          mobile: value(data, 'guardianMobile'),
          sms_opt_in: data.get('guardianSmsOptIn') === 'on'
        },
        driver: {
          given_name: driverName,
          family_name: '',
          display_name: driverName,
          birth_date: value(data, 'driverBirthDate'),
          email: value(data, 'driverEmail'),
          mobile: value(data, 'driverMobile'),
          sms_opt_in: data.get('driverSmsOptIn') === 'on',
          home_zip: value(data, 'homeZip'),
          home_state: 'MI',
          license_stage: value(data, 'licenseStage'),
          level1_license_date: value(data, 'licenseStageStartDate'),
          favorite_color: value(data, 'favoriteColor'),
          custom_avatar_requested: data.get('customAvatarRequested') === 'on'
        },
        avatar_photo: photo,
        vehicle: {
          name: value(data, 'vehicleName'),
          class: value(data, 'vehicleClass'),
          color: value(data, 'vehicleColor')
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) throw new Error(result.error || 'We could not submit onboarding right now.');
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
