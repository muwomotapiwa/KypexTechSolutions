// Capture submitter's name + form info before Web3Forms redirect
(function () {
  function getValue(form, selectors) {
    for (const s of selectors) {
      const el = form.querySelector(s);
      if (el && typeof el.value === 'string' && el.value.trim()) return el.value.trim();
    }
    return '';
  }

  async function handleSubmit(e) {
    const form = e.target;
    // Ensure redirect is an absolute URL so Web3Forms doesn't send to its default success page
    const absoluteThanks = new URL('thank-you.html', window.location.href).href;
    let redirectEl = form.querySelector('input[name="redirect"]');
    if (!redirectEl) {
      redirectEl = document.createElement('input');
      redirectEl.type = 'hidden';
      redirectEl.name = 'redirect';
      form.appendChild(redirectEl);
    }
    redirectEl.value = absoluteThanks;
    // Store name, subject/form label, and page for the thank-you page
    const name = getValue(form, ['input[name="name"]', 'input[name="contactName"]']);
    const formLabel = getValue(form, ['input[name="form"]', 'input[name="subject"]']);
    const page = getValue(form, ['input[name="page"]']);
    // Consultation scheduling fields (if present)
    const preferredDate = getValue(form, ['input[name="preferred_date"]']);
    const preferredTime = getValue(form, ['input[name="preferred_time"]']);
    const timezone = getValue(form, ['input[name="timezone"]']);

    // Ensure redirect is an absolute URL so Web3Forms doesn't send to its default success page
    const absoluteThanks = new URL('thank-you.html', window.location.href).href;
    let redirectEl = form.querySelector('input[name="redirect"]');
    if (!redirectEl) {
      redirectEl = document.createElement('input');
      redirectEl.type = 'hidden';
      redirectEl.name = 'redirect';
      form.appendChild(redirectEl);
    }
    redirectEl.value = absoluteThanks;

    // Use sessionStorage instead of localStorage to minimize persistence
    try {
      if (name) sessionStorage.setItem('lastSubmitName', name);
      if (formLabel) sessionStorage.setItem('lastSubmitForm', formLabel);
      if (page) sessionStorage.setItem('lastSubmitPage', page);
      if (preferredDate) sessionStorage.setItem('preferredDate', preferredDate);
      if (preferredTime) sessionStorage.setItem('preferredTime', preferredTime);
      if (timezone) sessionStorage.setItem('preferredTimezone', timezone);
    } catch (e) { /* ignore storage errors */ }

    // Submit via fetch to guarantee redirect, fallback to native submit on failure
    try {
      e.preventDefault();
      const fd = new FormData(form);
      // Append derived fields if any were added above
      if (!fd.get('redirect')) fd.set('redirect', absoluteThanks);
      const resp = await fetch(form.action || 'https://api.web3forms.com/submit', {
        method: 'POST',
        body: fd,
        headers: { 'Accept': 'application/json' }
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && (data.success !== false)) {
        const q = new URLSearchParams();
        const formName = formLabel || '';
        const pageName = page || '';
        if (formName) q.set('form', formName);
        if (pageName) q.set('page', pageName);
        if (name) q.set('name', name);
        // Redirect client-side immediately
        const url = absoluteThanks + (q.toString() ? ('?' + q.toString()) : '');
        window.location.assign(url);
      } else {
        form.submit();
      }
    } catch (err) {
      try { form.submit(); } catch (_) {}
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const forms = document.querySelectorAll('form[action="https://api.web3forms.com/submit"]');
    forms.forEach(f => f.addEventListener('submit', handleSubmit));
  });
})();
