// Capture submitter's name + form info before Web3Forms redirect
(function () {
  function getValue(form, selectors) {
    for (const s of selectors) {
      const el = form.querySelector(s);
      if (el && typeof el.value === 'string' && el.value.trim()) return el.value.trim();
    }
    return '';
  }

  function submitViaIframe(form) {
    try {
      const iframe = document.createElement('iframe');
      const name = 'hidden_iframe_' + Math.random().toString(36).slice(2);
      iframe.name = name;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      const prevTarget = form.getAttribute('target');
      form.setAttribute('target', name);
      form.submit();
      if (prevTarget === null) form.removeAttribute('target'); else form.setAttribute('target', prevTarget);
      setTimeout(() => { try { document.body.removeChild(iframe); } catch (_) {} }, 5000);
    } catch (_) {}
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

    // Submit via fetch to guarantee redirect; avoid navigating to the API JSON page
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
      const q = new URLSearchParams();
      if (formLabel) q.set('form', formLabel);
      if (page) q.set('page', page);
      if (name) q.set('name', name);
      if (!(resp.ok && data && data.success !== false)) {
        q.set('status', 'review'); // show generic success but note may need manual review
      }
      const url = absoluteThanks + (q.toString() ? ('?' + q.toString()) : '');
      window.location.assign(url);
    } catch (err) {
      // Network/CORS error. Submit in a hidden iframe to avoid navigating away, then redirect.
      try { submitViaIframe(form); } catch (_) {}
      const q = new URLSearchParams();
      if (formLabel) q.set('form', formLabel);
      if (page) q.set('page', page);
      if (name) q.set('name', name);
      q.set('status', 'queued');
      const url = absoluteThanks + (q.toString() ? ('?' + q.toString()) : '');
      window.location.assign(url);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const forms = document.querySelectorAll('form[action="https://api.web3forms.com/submit"]');
    forms.forEach(f => f.addEventListener('submit', handleSubmit));
  });
})();
