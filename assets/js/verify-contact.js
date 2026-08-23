(() => {
  const message = document.getElementById('verify-message');
  const cfg = window.DV_APP_CONFIG || {};
  const token = new URL(window.location.href).searchParams.get('token');
  const setMessage = (text) => { if (message) message.textContent = text; };

  if (!cfg.supabaseUrl || !cfg.publishableKey) {
    setMessage('Drive Venture verification is temporarily unavailable.');
    return;
  }
  if (!token) {
    setMessage('This verification link is incomplete.');
    return;
  }

  const clean = new URL(window.location.href);
  clean.searchParams.delete('token');
  window.history.replaceState({}, '', `${clean.pathname}${clean.search}${clean.hash}`);

  fetch(`${cfg.supabaseUrl}/functions/v1/contact-endpoint-api?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: { apikey: cfg.publishableKey },
    cache: 'no-store',
  })
    .then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) throw new Error(body.error || 'Verification failed');
      const kind = body.endpoint_type === 'MOBILE' ? 'mobile number' : 'email address';
      setMessage(`Your ${kind} is verified and has been updated.`);
    })
    .catch((error) => setMessage(error?.message || 'Verification failed. Please request a new link.'));
})();
