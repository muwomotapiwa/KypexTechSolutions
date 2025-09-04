// Inject Google Analytics tag if missing (assessment page does not load js/script.js)
(function ensureGA(){
  try {
    var MEASUREMENT_ID = 'G-J6CSWZW97R';
    var hasTag = !!document.querySelector('script[src*="googletagmanager.com/gtag/js?id="]');
    if (!hasTag) {
      var g = document.createElement('script');
      g.async = true;
      g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
      document.head.appendChild(g);
    }
    if (!window.dataLayer) {
      window.dataLayer = window.dataLayer || [];
      function gtag(){ dataLayer.push(arguments); }
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', MEASUREMENT_ID);
    }
  } catch(_) {}
})();
