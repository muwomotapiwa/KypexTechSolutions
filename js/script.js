const menuIcon = document.getElementById('menuIcon');
const mobileNav = document.getElementById('mobileNav');

// Toggle menu on click
menuIcon.addEventListener('click', () => {
    mobileNav.classList.toggle('active');
    menuIcon.classList.toggle('active');
});

// Close menu when a link is clicked
const menuLinks = document.querySelectorAll('.mobile-nav a');
menuLinks.forEach(link => {
    link.addEventListener('click', () => {
        mobileNav.classList.remove('active');
        menuIcon.classList.remove('active');
    });
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!menuIcon.contains(e.target) && !mobileNav.contains(e.target)) {
        mobileNav.classList.remove('active');
        menuIcon.classList.remove('active');
    }
});

// Prefetch visitor country before navigating to website-development page
(function prefetchGeoOnNav(){
  try {
    document.addEventListener('click', function (e) {
      const a = e.target && e.target.closest && e.target.closest('a[href$="website-development.html"]');
      if (!a) return;
      if (sessionStorage.getItem('geo_cc')) return; // already cached

      e.preventDefault();
      const href = a.href || 'website-development.html';
      const map = { ZA:'South Africa', ZW:'Zimbabwe', ZM:'Zambia', BW:'Botswana' };

      const fetchGeo = fetch('https://ipwho.is/?fields=success,country_code,country')
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d && d.success !== false) {
            const cc = String(d.country_code || '').toUpperCase();
            sessionStorage.setItem('geo_cc', cc);
            sessionStorage.setItem('geo_name', map[cc] || 'Other');
          }
        })
        .catch(() => {});

      const timeout = new Promise(res => setTimeout(res, 500));
      Promise.race([fetchGeo, timeout]).finally(() => {
        try {
          const u = new URL(href, window.location.href);
          const cc = (sessionStorage.getItem('geo_cc') || '').toUpperCase();
          const cn = sessionStorage.getItem('geo_name') || '';
          if (cc || cn) {
            if (cc) u.searchParams.set('cc', cc);
            if (cn) u.searchParams.set('cn', cn);
          }
          window.location.href = u.toString();
        } catch (_) {
          window.location.href = href;
        }
      });
    }, { capture: true });
  } catch (_) { /* ignore */ }
})();
