// Capture submitter's name + form info before Web3Forms redirect
(function () {
  function getValue(form, selectors) {
    for (const s of selectors) {
      const el = form.querySelector(s);
      if (el && typeof el.value === 'string' && el.value.trim()) return el.value.trim();
    }
    return '';
  }

  let sharedIframeName = '';
  let sharedIframeEl = null;

  function ensureSharedIframe() {
    if (sharedIframeName) return sharedIframeName;
    const iframe = document.createElement('iframe');
    sharedIframeName = 'web3forms_background_iframe';
    iframe.name = sharedIframeName;
    iframe.style.display = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);
    sharedIframeEl = iframe;
    return sharedIframeName;
  }

  function resolveRedirect(formLabel) {
    const isNewsletter = /newsletter/i.test(formLabel || '');
    const path = isNewsletter ? 'newsletter-thank-you.html' : 'thank-you.html';
    return new URL(path, window.location.href).href;
  }

  function handleSubmit(e) {
    const form = e.target;

    // Extract metadata first
    const name = getValue(form, ['input[name="name"]', 'input[name="contactName"]']);
    const formLabel = getValue(form, ['input[name="form"]', 'input[name="subject"]']);
    const page = getValue(form, ['input[name="page"]']);
    const preferredDate = getValue(form, ['input[name="preferred_date"]']);
    const preferredTime = getValue(form, ['input[name="preferred_time"]']);
    const timezone = getValue(form, ['input[name="timezone"]']);

    // Redirect destination depends on the form
    const absoluteThanks = resolveRedirect(formLabel);
    let redirectEl = form.querySelector('input[name="redirect"]');
    if (!redirectEl) {
      redirectEl = document.createElement('input');
      redirectEl.type = 'hidden';
      redirectEl.name = 'redirect';
      form.appendChild(redirectEl);
    }
    redirectEl.value = absoluteThanks;

    // Store minimal info (session only)
    try {
      if (name) sessionStorage.setItem('lastSubmitName', name);
      if (formLabel) sessionStorage.setItem('lastSubmitForm', formLabel);
      if (page) sessionStorage.setItem('lastSubmitPage', page);
      if (preferredDate) sessionStorage.setItem('preferredDate', preferredDate);
      if (preferredTime) sessionStorage.setItem('preferredTime', preferredTime);
      if (timezone) sessionStorage.setItem('preferredTimezone', timezone);
    } catch (e) { /* ignore storage errors */ }

    // Submit in hidden iframe; redirect top window immediately
    e.preventDefault();
    const iframeName = ensureSharedIframe();
    form.setAttribute('target', iframeName);

    const q = new URLSearchParams();
    if (formLabel) q.set('form', formLabel);
    if (page) q.set('page', page);
    if (name) q.set('name', name);
    const url = absoluteThanks + (q.toString() ? ('?' + q.toString()) : '');

    let navigated = false;
    function go(){ if (navigated) return; navigated = true; window.location.assign(url); }
    if (sharedIframeEl) {
      sharedIframeEl.addEventListener('load', go, { once: true });
    }
    // Fallback in case load doesn't fire due to cross-origin quirks
    setTimeout(go, 1200);

    form.submit();
  }

  function isWeb3Form(form) {
    try {
      const action = (form && form.action) ? String(form.action) : '';
      return action.indexOf('https://api.web3forms.com/submit') === 0;
    } catch (_) { return false; }
  }

  // Capture submit on the document for any current/future Web3Forms
  document.addEventListener('submit', function (e) {
    const form = e.target;
    if (!isWeb3Form(form)) return;
    ensureSharedIframe();
    handleSubmit(e);
  }, true);
})();

// Also ensure AI assistant loads on pages that don't include js/script.js
(function loadAgentFromForms(){
  try {
    if (document.getElementById('kypex-agent-js')) return;
    var s = document.createElement('script');
    s.src = 'js/agent.js?v=1';
    s.id = 'kypex-agent-js';
    s.defer = true;
    document.head.appendChild(s);
  } catch (_) { }
})();
