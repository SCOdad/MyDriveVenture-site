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
      tip.dataset.tip = 'Required so the driver can receive a secure sign-in link and open their Drive Venture account. The driver is the primary app user.';
      tip.setAttribute('aria-label', 'Why driver email is required');
    }
  }

  const success = document.getElementById('onboarding-success');
  if (!success) return;

  // BKLG-0085/BKLG-0086: make registration completion unmistakable, then
  // guide the user toward the single welcome email that verifies and signs in.
  // The canonical VisualAssets asset for this moment is DV-CHAR-PARKER-KEYS.
  success.innerHTML = `
    <div class="registration-success-layout">
      <figure class="registration-success-art">
        <img src="/assets/images/DV.CHAR-PARKER-KEYS.png" width="768" height="768" alt="Parker smiles and holds up the car keys." onerror="this.onerror=null;this.src='/assets/images/dv-scene-parker-key-handoff.webp';">
      </figure>
      <div class="registration-success-copy">
        <p class="eyebrow">You're in!</p>
        <h2 id="registration-success-heading">Welcome to Drive Venture.</h2>
        <p class="registration-success-lede">Registration is complete. Check your email for Parker's welcome message. Its <strong>Open Drive Venture</strong> button verifies your email and signs you in in one step.</p>
        <div class="registration-success-email-callout">
          <strong>Check <span id="registration-success-email"></span></strong>
          <p>You should not need to request a second sign-in email.</p>
        </div>
        <a id="registration-success-cta" class="button registration-success-cta" href="/log/">Didn't get it? Open sign-in</a>
        <div class="registration-success-next">
          <strong>If you come back later</strong>
          <p>The welcome email remains your easy way back. If its secure link has expired, use <a id="registration-success-return" href="https://log.mydriveventure.com/">log.mydriveventure.com</a> to request a fresh link with the driver's email already filled in.</p>
        </div>
        <p class="registration-success-guardian">Grown-ups with a different registered email receive their own access message.</p>
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
    .registration-success-art { margin:0; display:flex; justify-content:center; align-self:center; }
    .registration-success-art img { display:block; width:min(100%,18rem); height:auto; filter:drop-shadow(.45rem .55rem 0 rgba(0,0,0,.34)); }
    .registration-success-copy h2 { margin:.25rem 0 .9rem; font-size:clamp(2rem,5vw,3.6rem); }
    .registration-success-lede { color:var(--warm-white); font-size:clamp(1.05rem,2vw,1.25rem); line-height:1.55; max-width:46rem; }
    .registration-success-email-callout { margin:1.1rem 0; padding:1rem 1.1rem; border:2px solid var(--dv-yellow); background:#17212a; }
    .registration-success-email-callout strong { display:block; color:var(--dv-yellow); font-family:var(--heading-font); }
    .registration-success-email-callout p { margin:.35rem 0 0; color:#e8edf0; }
    .registration-success-cta { display:inline-flex; margin:.35rem 0 .75rem; }
    .registration-success-next { margin-top:1.15rem; padding:1rem 1.1rem; border-left:.45rem solid var(--dv-yellow); background:#17212a; }
    .registration-success-next strong { color:var(--dv-yellow); font-family:var(--heading-font); letter-spacing:.04em; text-transform:uppercase; font-size:.8rem; }
    .registration-success-next p { margin:.35rem 0 0; color:#e8edf0; }
    .registration-success-next a { color:var(--dv-yellow); font-weight:700; }
    .registration-success-guardian { margin-top:1rem; color:var(--silver); }
    @media(max-width:679px){
      .registration-success-layout { grid-template-columns:1fr; }
      .registration-success-art { order:2; }
      .registration-success-art img { width:min(72vw,18rem); }
      .registration-success-cta { width:100%; justify-content:center; box-sizing:border-box; }
    }`;
  document.head.appendChild(style);

  function refreshSuccessState() {
    if (success.hidden) return;
    const driverName = String(form.elements.driverName?.value || '').trim();
    const email = field.value.trim();
    const loginUrl = email ? `/log/?email=${encodeURIComponent(email)}` : '/log/';
    const durableUrl = email ? `https://log.mydriveventure.com/?email=${encodeURIComponent(email)}` : 'https://log.mydriveventure.com/';
    document.body.classList.add('onboarding-complete');
    success.classList.add('registration-success');
    success.setAttribute('aria-labelledby', 'registration-success-heading');
    const heading = document.getElementById('registration-success-heading');
    if (heading) heading.textContent = driverName ? `Welcome to Drive Venture, ${driverName}.` : 'Welcome to Drive Venture.';
    const emailNode = document.getElementById('registration-success-email');
    if (emailNode) emailNode.textContent = email;
    const cta = document.getElementById('registration-success-cta');
    if (cta) cta.href = loginUrl;
    const returnLink = document.getElementById('registration-success-return');
    if (returnLink) returnLink.href = durableUrl;
  }

  const observer = new MutationObserver(refreshSuccessState);
  observer.observe(success, { attributes: true, attributeFilter: ['hidden'] });
  refreshSuccessState();
})();
