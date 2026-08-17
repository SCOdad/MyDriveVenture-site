(() => {
  const form = document.getElementById('dv-waitlist-form');
  if (!form) return;

  const message = document.getElementById('waitlist-message');
  const button = document.getElementById('waitlist-submit');
  const success = document.getElementById('waitlist-success');

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
    if (!form.reportValidity() || button.disabled) return;

    const endpoint = String(window.DV_WAITLIST_ENDPOINT || '').trim();
    if (!endpoint) {
      setMessage('The waitlist is being connected. Please try again shortly.', true);
      return;
    }

    const data = new FormData(form);
    const payload = {
      website: value(data, 'website'),
      name: value(data, 'name'),
      email: value(data, 'email'),
      home_state: value(data, 'homeState'),
      driver_age_range: value(data, 'driverAgeRange'),
      updates_opt_in: data.get('updatesOptIn') === 'on',
      submission_context: window.DVSubmissionContext?.collect('WAITLIST') ?? { schema_version: 1, form_source: 'WAITLIST' }
    };

    button.disabled = true;
    button.textContent = 'Joining…';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) {
        throw new Error(result.error || 'We could not save your interest right now.');
      }

      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not save your interest right now.', true);
    } finally {
      button.disabled = false;
      button.textContent = 'Join the waitlist';
    }
  });
})();
