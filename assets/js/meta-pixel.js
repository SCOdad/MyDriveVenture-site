(() => {
  const PIXEL_ID = '1799932711354979';
  const productionHosts = new Set(['mydriveventure.com', 'www.mydriveventure.com']);
  const blockedPrefixes = [
    '/auth/',
    '/backlog/',
    '/certification-link/',
    '/family/',
    '/log/',
    '/operator/',
    '/profile/',
    '/staging/',
  ];
  const allowedPrefixes = [
    '/',
    '/faq/',
    '/FAQ/',
    '/feedback/',
    '/help/',
    '/join/',
    '/privacy/',
    '/research/',
    '/sms-consent/',
    '/terms/',
    '/text-parker/',
    '/waitlist/',
  ];

  const host = String(window.location.hostname || '').toLowerCase();
  if (!productionHosts.has(host)) return;

  const path = (window.location.pathname || '/').replace(/\/index\.html$/, '/');
  if (blockedPrefixes.some(prefix => path === prefix || path.startsWith(prefix))) return;
  if (!allowedPrefixes.some(prefix => prefix === '/' ? path === '/' : path === prefix || path.startsWith(prefix))) return;
  if (window.__DV_META_PIXEL_V1_LOADED) return;
  window.__DV_META_PIXEL_V1_LOADED = true;

  /* Meta Pixel V1: PageView-only browser tracking for approved public pages.
     No advanced matching, custom user properties, form-field capture, or Conversions API. */
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s);
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');
})();
