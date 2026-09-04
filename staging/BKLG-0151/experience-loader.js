(() => {
  const route = document.documentElement.dataset.sourceRoute;
  const label = document.documentElement.dataset.experienceLabel || 'staging experience';
  if (!route || !/^\/log\/(?:DV00|DV02)\/$/.test(route)) {
    document.body.textContent = 'Invalid BKLG-0151 staging experience.';
    return;
  }
  fetch(route, { cache: 'no-store', credentials: 'same-origin' })
    .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.text(); })
    .then(html => {
      html = html
        .replace(/<script src="\/assets\/js\/environment-config\.js"><\/script>/, '<script src="/staging/BKLG-0151/environment-config.js"><\/script>')
        .replace(/<script src="\/log\/config\.js"><\/script>/, '<script src="/staging/BKLG-0151/config.js"><\/script><script src="/staging/BKLG-0151/staging-auth.js?v=20260903-0151-auth1"><\/script>')
        .replace(/<script src="\/assets\/js\/log-drive-rpc\.js[^>]*><\/script>/, '<script src="/staging/BKLG-0151/assets/js/log-drive-rpc.js?v=20260904-0151-uat4"><\/script>');
      html = html.replace('</head>', `<meta name="dv-staging-experience" content="${label}"><\/head>`);
      document.open(); document.write(html); document.close();
    })
    .catch(error => { document.body.textContent = `Could not load ${label}: ${error.message}`; });
})();
