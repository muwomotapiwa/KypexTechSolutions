// Capture submitter's name + form info before Web3Forms redirect
(function () {
  function getValue(form, selectors) {
    for (const s of selectors) {
      const el = form.querySelector(s);
      if (el && typeof el.value === 'string' && el.value.trim()) return el.value.trim();
    }
    return '';
  }

  function handleSubmit(e) {
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

    if (name) localStorage.setItem('lastSubmitName', name);
    if (formLabel) localStorage.setItem('lastSubmitForm', formLabel);
    if (page) localStorage.setItem('lastSubmitPage', page);
  }

  document.addEventListener('DOMContentLoaded', function () {
    const forms = document.querySelectorAll('form[action="https://api.web3forms.com/submit"]');
    forms.forEach(f => f.addEventListener('submit', handleSubmit));
  });
})();
