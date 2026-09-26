// Drive Venture GA4 page-view loader. Loaded only on approved public production routes.
(() => {
  const host = String(location.hostname || "").toLowerCase();
  const path = (location.pathname || "/").replace(/index\.html$/, "/");
  const productionHost = host === "mydriveventure.com" || host === "www.mydriveventure.com";
  const publicPages = new Set(["/","/faq/","/feedback/","/help/","/join/","/privacy/","/research/","/research/teen-drowsy-driving/","/terms/","/text-parker/","/waitlist/"]);

  if (!productionHost || !publicPages.has(path) || window.__DV_GA4_VRV02KK3CC_REQUESTED) return;
  window.__DV_GA4_VRV02KK3CC_REQUESTED = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", "G-VRV02KK3CC");

  const script = document.createElement("script");
  script.src = "https://www.googletagmanager.com/gtag/js?id=G-VRV02KK3CC";
  script.async = true;
  document.head.appendChild(script);
})();
