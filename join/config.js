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

  const success = document.getElementById('onboarding-success');
  if (!success) return;

  // BKLG-0085: successful registration should feel like a clear state change,
  // not a small status card appended to a completed form. Reuse the canonical
  // Parker thumbs-up asset already shipped on the public site.
  success.innerHTML = `
    <div class="registration-success-layout">
      <figure class="registration-success-art">
        <img src="/assets/images/dv-char-parker-guide.webp" width="560" height="730" alt="Parker gives a welcoming thumbs up.">
      </figure>
      <div class="registration-success-copy">
        <p class="eyebrow">You're in!</p>
        <h2 id="registration-success-heading">Welcome to Drive Venture.</h2>
        <p class="registration-success-lede">Your driver account is ready. One last step: open Drive Venture and request a secure sign-in link.</p>
        <a id="registration-success-cta" class="button primary registration-success-cta" href="/log/">Open Drive Venture</a>
        <p class="registration-success-email">We'll use <strong id="registration-success-email"></strong> for the driver's passwordless sign-in.</p>
        <div class="registration-success-next">
          <strong>If you leave this page</strong>
          <p>You're still registered. Come back anytime at <a href="https://log.mydriveventure.com/">log.mydriveventure.com</a>. We'll also send a confirmation email with the same durable way back.</p>
        </div>
        <p class="registration-success-guardian">Grown-ups can also sign in separately with their own registered email.</p>
      </div>
    </div>`;

  const style = document.createElement('style');
  style.textContent = `
    body.onboarding-complete .join-intro,
    body.onboarding-complete .onboarding-shell > .notice,
    body.onboarding-complete #dv-onboarding-form { display:none!important; }
    body.onboarding-complete .onboarding-shell { max-width:72rem; padding-top:2rem; }
    .success-card.registration-success { margin:1rem auto 0; padding:clamp(1.2rem,3vw,2.25rem); border-top-width:6px; }
    .registration-success-layout { display:grid; grid-template-columns:minmax(11rem,18rem) minmax(0,1fr); gap:clamp(1.25rem,4vw,3rem); align-items:center; }
    .registration-success-art { margin:0; display:flex; justify-content:center; align-self:end; }
    .registration-success-art img { display:block; width:min(100%,17rem); height:auto; filter:drop-shadow(.45rem .55rem 0 rgba(0,0,0,.34)); }
    .registration-success-copy h2 { margin:.25rem 0 .9rem; font-size:clamp(2rem,5vw,3.6rem); }
    .registration-success-lede { color:var(--warm-white); font-size:clamp(1.05rem,2vw,1.25rem); line-height:1.55; max-width:46rem; }
    .registration-success-cta { display:inline-flex; margin:.55rem 0 .75rem; }
    .registration-success-email { color:#dce3e8; margin:.35rem 0 1rem; }
    .registration-success-next { margin-top:1.15rem; padding:1rem 1.1rem; border-left:.45rem solid var(--dv-yellow); background:#17212a; }
    .registration-success-next strong { color:var(--dv-yellow); font-family:var(--heading-font); letter-spacing:.04em; text-transform:uppercase; font-size:.8rem; }
    .registration-success-next p { margin:.35rem 0 0; color:#e8edf0; }
    .registration-success-next a { color:var(--dv-yellow); font-weight:700; }
    .registration-success-guardian { margin-top:1rem; color:var(--silver); }
    @media(max-width:679px){
      .registration-success-layout { grid-template-columns:1fr; }
      .registration-success-art { order:2; }
      .registration-success-art img { width:min(58vw,14rem); }
      .registration-success-cta { width:100%; justify-content:center; box-sizing:border-box; }
    }`;
  document.head.appendChild(style);

  function refreshSuccessState() {
    if (success.hidden) return;
    const driverName = String(form.elements.driverName?.value || '').trim();
    const email = field.value.trim();
    document.body.classList.add('onboarding-complete');
    success.classList.add('registration-success');
    success.setAttribute('aria-labelledby', 'registration-success-heading');
    const heading = document.getElementById('registration-success-heading');
    if (heading) heading.textContent = driverName ? `Welcome to Drive Venture, ${driverName}.` : 'Welcome to Drive Venture.';
    const emailNode = document.getElementById('registration-success-email');
    if (emailNode) emailNode.textContent = email;
    const cta = document.getElementById('registration-success-cta');
    if (cta) cta.href = email ? `/log/?email=${encodeURIComponent(email)}` : '/log/';
  }

  const observer = new MutationObserver(refreshSuccessState);
  observer.observe(success, { attributes: true, attributeFilter: ['hidden'] });
  refreshSuccessState();
})();
