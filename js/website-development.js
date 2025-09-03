const menuIcon = document.getElementById('menuIcon');
const mobileNav = document.getElementById('mobileNav');

// Toggle mobile menu visibility
if (menuIcon && mobileNav) {
  menuIcon.addEventListener('click', () => {
      mobileNav.classList.toggle('active');
      menuIcon.classList.toggle('active');
  });
}

function handleCountrySelect() {
    const selected = document.getElementById("country").value;
    const buttonsDiv = document.getElementById("quoteButtons");

    // Hide all buttons first
    buttonsDiv.style.display = "none";
    ['zimBtn', 'rsaBtn', 'zamBtn', 'botsBtn', 'otherBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.style.display = "none";
    });

    // Show the relevant button
    if (selected === "Zimbabwe") {
        buttonsDiv.style.display = "block";
        document.getElementById("zimBtn").style.display = "inline-block";
    } else if (selected === "South Africa") {
        buttonsDiv.style.display = "block";
        document.getElementById("rsaBtn").style.display = "inline-block";
    } else if (selected === "Zambia") {
        buttonsDiv.style.display = "block";
        document.getElementById("zamBtn").style.display = "inline-block";
    } else if (selected === "Botswana") {
        buttonsDiv.style.display = "block";
        document.getElementById("botsBtn").style.display = "inline-block";
    } else if (selected === "Other") {
        buttonsDiv.style.display = "block";
        document.getElementById("otherBtn").style.display = "inline-block";
    }
}

// Auto-detect country via ipwho.is and PRESELECT only (keep full list)
(function autoSelectCountry(){
    const sel = document.getElementById('country');
    if (!sel || typeof fetch !== 'function') return;
    const codeToName = { ZA: 'South Africa', ZW: 'Zimbabwe', ZM: 'Zambia', BW: 'Botswana' };
    // URL param override (cc, cn)
    try {
      const url = new URL(window.location.href);
      const ccParam = (url.searchParams.get('cc') || '').toUpperCase();
      const cnParam = url.searchParams.get('cn') || '';
      const fromParam = codeToName[ccParam] || cnParam;
      if (fromParam) {
        setDropdownTo(fromParam);
        return; // do not wait for fetch if param provided
      }
    } catch (_) { /* ignore */ }
    function setDropdownTo(target){
      const flags = {
        'Zimbabwe': '🇿🇼 Zimbabwe',
        'South Africa': '🇿🇦 South Africa',
        'Zambia': '🇿🇲 Zambia',
        'Botswana': '🇧🇼 Botswana',
        'Other': '🌐 Other'
      };
      function apply(){
        if (!sel) return;
        while (sel.firstChild) sel.removeChild(sel.firstChild);
        const opt = document.createElement('option');
        opt.value = target;
        opt.textContent = flags[target] || target;
        opt.selected = true;
        sel.appendChild(opt);
        if (typeof window.handleCountrySelect === 'function') window.handleCountrySelect();
        else sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // Apply now and once more shortly to defeat any late scripts/styles
      apply();
      setTimeout(apply, 120);
      setTimeout(apply, 400);
    }

    // First, try cached value from a previous page
    try {
      const ccCached = (sessionStorage.getItem('geo_cc') || '').toUpperCase();
      const mappedCached = codeToName[ccCached] || (sessionStorage.getItem('geo_name') || '');
      if (mappedCached) {
        setDropdownTo(mappedCached);
      }
    } catch (_) { /* ignore */ }

    fetch('https://ipwho.is/?fields=success,country_code,country')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data || data.success === false) return;
        const cc = String(data.country_code || '').trim().toUpperCase();
        const mapped = codeToName[cc] || 'Other';
        try { sessionStorage.setItem('geo_cc', cc); sessionStorage.setItem('geo_name', mapped); } catch (_) {}
        setDropdownTo(mapped);
      })
      .catch(() => { /* ignore */ });
})();
