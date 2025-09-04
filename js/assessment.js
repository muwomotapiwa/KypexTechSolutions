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

// iOS: prevent auto-zoom on input focus (assessment page)
(function preventIOSZoomOnFocus(){
  try {
    var ua = navigator.userAgent || '';
    var isIOS = /iP(hone|ad|od)/.test(ua);
    if (!isIOS) return;
    if (window.__iosNoZoomInstalled) return; // guard
    window.__iosNoZoomInstalled = true;

    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0';
      document.head.appendChild(meta);
    }
    var defaultContent = meta.getAttribute('content') || 'width=device-width, initial-scale=1.0';
    var zoomOff = defaultContent;
    if (!/maximum-scale/i.test(zoomOff)) zoomOff += ', maximum-scale=1';
    if (!/user-scalable/i.test(zoomOff)) zoomOff += ', user-scalable=no';

    function setZoom(disable){ meta.setAttribute('content', disable ? zoomOff : defaultContent); }

    document.addEventListener('focusin', function(e){
      var t = e.target && e.target.tagName;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t)) setZoom(true);
    });
    document.addEventListener('focusout', function(e){
      var t = e.target && e.target.tagName;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t)) setTimeout(function(){ setZoom(false); }, 250);
    });
    window.addEventListener('orientationchange', function(){ setZoom(false); });
    window.addEventListener('pageshow', function(){ setZoom(false); });
  } catch(_) {}
})();
