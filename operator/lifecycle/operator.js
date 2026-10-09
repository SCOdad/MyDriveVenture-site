(() => {
  const form = document.getElementById('lifecycle-form');
  const status = document.getElementById('lifecycle-status');
  const result = document.getElementById('lifecycle-result');
  const config = window.DV_APP_CONFIG;
  const endpoint = window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-lifecycle');

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const id = document.getElementById('lifecycle-id').value.trim();
    const kind = document.getElementById('lifecycle-kind').value;
    status.textContent = 'Loading preview…';
    result.textContent = '';
    try {
      const client = window.supabase.createClient(config.supabaseUrl, config.publishableKey);
      const auth = await client.auth.getSession();
      const token = auth.data.session?.access_token;
      if (!token) throw new Error('Sign in to your operator account first.');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
          'apikey': config.publishableKey
        },
        body: JSON.stringify({action: 'preview_' + kind, id})
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || 'Preview unavailable');
      result.textContent = JSON.stringify(body.preview, null, 2);
      status.textContent = 'Read-only preview completed. No records changed.';
    } catch (error) {
      status.textContent = error.message || 'Preview unavailable';
    }
  });
})();
