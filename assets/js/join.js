(() => {
  const form = document.getElementById('dv-onboarding-form');
  if (!form) return;
  const message = document.getElementById('form-message');
  const button = document.getElementById('submit-button');
  const success = document.getElementById('onboarding-success');
  const avatarRequested = document.getElementById('custom-avatar-requested');
  const avatarWrap = document.getElementById('avatar-upload-wrap');
  const avatarPhoto = document.getElementById('avatar-photo');
  const guardianMobile = form.elements.guardianMobile;
  const driverMobile = form.elements.driverMobile;
  const homeZip = form.elements.homeZip;
  const licenseStage = form.elements.licenseStage;
  const guardianSmsOptIn = form.elements.guardianSmsOptIn;
  const driverSmsOptIn = form.elements.driverSmsOptIn;
  const submissionStorageKey = 'dv:onboarding:submission-id';
  const STAGES={MI:[['LEVEL_1','Learner / Level 1 permit'],['LEVEL_2','Intermediate / Level 2 license'],['LEVEL_3','Full / Level 3 license']],KS:[['INSTRUCTION','Instruction permit'],['RESTRICTED','Restricted driver license (age 15 path)'],['LESS_RESTRICTED','Less-restricted privileges'],['FULL','Non-restricted driver license']]};
  let memorySubmission = null;

  function setMessage(text, isError = false) { message.textContent = text || ''; message.classList.toggle('error', isError); }
  function value(data, name) { return String(data.get(name) || '').trim(); }
  function stateFromZip(zip){if(!/^\d{5}$/.test(zip))return null;const n=Number(zip);if(n>=48001&&n<=49971)return'MI';if(n>=66002&&n<=67954)return'KS';return null}
  function syncLicenseStages(){if(!homeZip||!licenseStage)return;const zip=homeZip.value.trim(),state=stateFromZip(zip),prior=licenseStage.value;homeZip.setCustomValidity(zip.length===5&&!state?'Drive Venture currently supports Michigan and Kansas ZIP codes.':'');const choices=STAGES[state||'MI'];licenseStage.innerHTML='<option value="">Choose one</option>'+choices.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');if(choices.some(([v])=>v===prior))licenseStage.value=prior}
  function clearFieldErrors() { form.querySelectorAll('.field-error').forEach((node) => node.remove()); form.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid')); [guardianMobile, driverMobile,homeZip].forEach((field) => field && field.setCustomValidity('')); }
  function addFieldError(field, text) { if (!field || !text) return; field.setAttribute('aria-invalid', 'true'); const helper = document.createElement('span'); helper.className = 'field-error'; helper.textContent = text; field.insertAdjacentElement('afterend', helper); }
  function syncConditionalRequirements() {
    const requested = Boolean(avatarRequested && avatarRequested.checked);
    if (avatarWrap) avatarWrap.hidden = !requested;
    if (avatarPhoto) { avatarPhoto.required = requested; if (!requested) avatarPhoto.value = ''; }
    if (guardianMobile) guardianMobile.setCustomValidity(guardianSmsOptIn && guardianSmsOptIn.checked && !guardianMobile.value.trim() ? 'Enter a grown-up mobile number or turn off Text Parker opt-in.' : '');
    if (driverMobile) driverMobile.setCustomValidity(driverSmsOptIn && driverSmsOptIn.checked && !driverMobile.value.trim() ? 'Enter a driver mobile number or turn off Text Parker opt-in.' : '');
    syncLicenseStages();
  }
  function validationText(field) { if (field.validity.valueMissing) return 'This field is required.'; if (field.validity.typeMismatch) return 'Enter a valid value.'; if (field.validity.patternMismatch) return 'Enter a valid 5-digit ZIP code.'; if (field.validity.customError) return field.validationMessage; return field.validationMessage || 'Please correct this field.'; }
  function validateForm() { clearFieldErrors(); syncConditionalRequirements(); const invalid = Array.from(form.querySelectorAll('input, select')).filter((field) => !field.checkValidity()); if (!invalid.length) return true; invalid.forEach((field) => addFieldError(field, validationText(field))); setMessage('Please correct the highlighted fields below.', true); invalid[0].focus(); invalid[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); return false; }
  async function fileToPayload(file) { if (!file) return null; const maxBytes = 4 * 1024 * 1024; if (file.size > maxBytes) throw new Error('Driver photo must be 4 MB or smaller.'); const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']); if (file.type && !allowed.has(file.type)) throw new Error('Driver photo must be JPEG, PNG, WebP, HEIC, or HEIF.'); const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => reject(new Error('Unable to read the selected driver photo.')); reader.readAsDataURL(file); }); const comma = dataUrl.indexOf(','); if (comma < 0) throw new Error('Unable to encode the selected driver photo.'); return { filename: file.name || 'driver-photo', content_type: file.type || 'application/octet-stream', base64: dataUrl.slice(comma + 1) }; }
  async function sha256Hex(text) { const bytes = new TextEncoder().encode(text); const digest = await crypto.subtle.digest('SHA-256', bytes); return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join(''); }
  async function submissionFingerprint(data, photoFile) { const stable = { guardian: { name: value(data, 'guardianName'), email: value(data, 'guardianEmail'), mobile: value(data, 'guardianMobile'), sms: data.get('guardianSmsOptIn') === 'on' }, driver: { name: value(data, 'driverName'), birth: value(data, 'driverBirthDate'), email: value(data, 'driverEmail'), mobile: value(data, 'driverMobile'), sms: data.get('driverSmsOptIn') === 'on', zip: value(data, 'homeZip'), state:stateFromZip(value(data,'homeZip')), stage: value(data, 'licenseStage'), stageDate: value(data, 'licenseStageStartDate'), favorite: value(data, 'favoriteColor'), avatar: data.get('customAvatarRequested') === 'on' }, vehicle: { name: value(data, 'vehicleName'), class: value(data, 'vehicleClass'), color: value(data, 'vehicleColor') }, photo: photoFile ? { name: photoFile.name, size: photoFile.size, type: photoFile.type, modified: photoFile.lastModified } : null }; return sha256Hex(JSON.stringify(stable)); }
  function getStableSubmissionId(fingerprint) { if (memorySubmission && memorySubmission.fingerprint === fingerprint) return memorySubmission.id; try { const stored = JSON.parse(sessionStorage.getItem(submissionStorageKey) || 'null'); if (stored && stored.id && stored.fingerprint === fingerprint) { memorySubmission = stored; return stored.id; } } catch (_) {} memorySubmission = { id: `web-${crypto.randomUUID()}`, fingerprint }; try { sessionStorage.setItem(submissionStorageKey, JSON.stringify(memorySubmission)); } catch (_) {} return memorySubmission.id; }
  function clearSubmissionId() { memorySubmission = null; try { sessionStorage.removeItem(submissionStorageKey); } catch (_) {} }
  [avatarRequested, guardianSmsOptIn, driverSmsOptIn, guardianMobile, driverMobile,homeZip].forEach((field) => { if (!field) return; field.addEventListener('change', () => { clearFieldErrors(); syncConditionalRequirements(); }); field.addEventListener('input', () => { clearFieldErrors(); syncConditionalRequirements(); }); });
  syncConditionalRequirements();
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); setMessage(''); if (!validateForm()) return; if (button.disabled) return; const endpoint = String(window.DV_ONBOARDING_ENDPOINT || '').trim(); if (!endpoint) { setMessage('Online onboarding is being connected. Please try again shortly.', true); return; }
    const data = new FormData(form); button.disabled = true; button.textContent = 'Submitting…';
    try {
      const state=stateFromZip(value(data,'homeZip'));if(!state)throw new Error('Drive Venture currently supports Michigan and Kansas ZIP codes.');
      const photoFile = avatarPhoto && avatarPhoto.files ? avatarPhoto.files[0] : null; const fingerprint = await submissionFingerprint(data, photoFile); const photo = avatarRequested && avatarRequested.checked ? await fileToPayload(photoFile) : null; const guardianName = value(data, 'guardianName'); const driverName = value(data, 'driverName');
      const payload = { source_response_id: getStableSubmissionId(fingerprint), submission_fingerprint: fingerprint, website: value(data, 'website'), submission_context: window.DVSubmissionContext?.collect('ONBOARDING') ?? { schema_version: 1, form_source: 'ONBOARDING' }, guardian: { given_name: guardianName, family_name: '', display_name: guardianName, email: value(data, 'guardianEmail'), mobile: value(data, 'guardianMobile'), sms_opt_in: data.get('guardianSmsOptIn') === 'on' }, driver: { given_name: driverName, family_name: '', display_name: driverName, birth_date: value(data, 'driverBirthDate'), email: value(data, 'driverEmail'), mobile: value(data, 'driverMobile'), sms_opt_in: data.get('driverSmsOptIn') === 'on', home_zip: value(data, 'homeZip'), home_state: state, license_stage: value(data, 'licenseStage'), level1_license_date: value(data, 'licenseStageStartDate'), favorite_color: value(data, 'favoriteColor'), custom_avatar_requested: data.get('customAvatarRequested') === 'on' }, avatar_photo: photo, vehicle: { name: value(data, 'vehicleName'), class: value(data, 'vehicleClass'), color: value(data, 'vehicleColor') } };
      const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); const result = await response.json().catch(() => ({})); if (!response.ok || result.ok !== true) { if (response.status === 409 && result.code === 'SUBMISSION_ID_REUSED') clearSubmissionId(); throw new Error(result.error || 'We could not submit onboarding right now.'); }
      clearSubmissionId(); form.hidden = true; success.hidden = false; success.focus();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'We could not submit onboarding right now.', true); } finally { button.disabled = false; button.textContent = 'Join the pilot'; }
  });
})();
