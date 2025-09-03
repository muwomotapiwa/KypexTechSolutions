// Package definitions with page ranges and prices in ZAR
const packages = {
  100: { min: 1, max: 3, name: "Starter Package", price: 100 },
  220: { min: 4, max: 6, name: "Standard Package", price: 220 },
  330: { min: 7, max: 10, name: "Pro Business Package", price: 330 },
  540: { min: 11, max: 20, name: "E-Commerce Package", price: 540 }
};

// Backend-only exchange rate Rand to USD (1 ZAR = 0.056 USD)
let exchangeRate = 0.96;

function updatePrices() {
  document.getElementById("starterPrice").innerText = (packages[100].price * exchangeRate).toFixed(2);
  document.getElementById("standardPrice").innerText = (packages[220].price * exchangeRate).toFixed(2);
  document.getElementById("proBusinessPrice").innerText = (packages[330].price * exchangeRate).toFixed(2);
  document.getElementById("ecommercePrice").innerText = (packages[540].price * exchangeRate).toFixed(2);

  document.getElementById("addOnExtraPages").innerText = (20 * exchangeRate).toFixed(2);
  document.getElementById("addOnSEO").innerText = (20 * exchangeRate).toFixed(2);
  document.getElementById("addOnPaynow").innerText = (30 * exchangeRate).toFixed(2);
  document.getElementById("addOnWhatsApp").innerText = (15 * exchangeRate).toFixed(2);
  document.getElementById("addOnMaps").innerText = (15 * exchangeRate).toFixed(2);
  document.getElementById("addOnApp").innerText = (120 * exchangeRate).toFixed(2);
}

document.addEventListener('DOMContentLoaded', function () {
  updatePageRangeIndicator(100); // Default to Starter package range
  updatePrices(); // Update prices based on exchange rate
});

function updatePages() {
  const pagesInput = document.getElementById("pages");
  const pages = parseInt(pagesInput.value);
  document.getElementById("pagesCount").innerText = pages;

  checkPackageMatch(pages);
  calculateTotal();
}

function updatePageRangeIndicator(packageValue) {
  const package = packages[packageValue];
  if (!package) return;

  document.getElementById("minPages").textContent = package.min;
  document.getElementById("maxPages").textContent = package.max;

  const pagesInput = document.getElementById("pages");
  pagesInput.min = package.min;
  pagesInput.max = package.max;
  pagesInput.value = package.min;
  document.getElementById("pagesCount").innerText = package.min;
}

function checkPackageMatch(selectedPages) {
  const packageSelect = document.getElementById("package");
  const currentPackage = parseInt(packageSelect.value);

  let recommendedPackage = null;
  for (const [value, range] of Object.entries(packages)) {
    if (selectedPages >= range.min && selectedPages <= range.max) {
      recommendedPackage = { value: parseInt(value), ...range };
      break;
    }
  }

  if (!recommendedPackage && selectedPages > packages[540].max) {
    recommendedPackage = { value: 540, ...packages[540] };
  }

  if (recommendedPackage && currentPackage !== recommendedPackage.value) {
    const confirmChange = confirm(
      `You've selected ${selectedPages} pages.\n` +
      `This matches our ${recommendedPackage.name} (${recommendedPackage.min}-${recommendedPackage.max} pages).\n\n` +
      `Would you like to change to the ${recommendedPackage.name}?`
    );

    if (confirmChange) {
      packageSelect.value = recommendedPackage.value;
      onPackageChange();
    }
  }
}

function onPackageChange() {
  const packageSelect = document.getElementById("package");
  const packageValue = packageSelect.value;
  updatePageRangeIndicator(packageValue);
  showPackageInfo(packageValue);
  calculateTotal();
}

function showPackageInfo(packageValue) {
  document.querySelectorAll('.package-info').forEach(el => el.classList.remove('active'));
  if (packageValue !== "0") {
    document.getElementById(`packageInfo${packageValue}`).classList.add('active');
  }
}

function toggleAllPackageInfo() {
  const allHidden = Array.from(document.querySelectorAll('.package-info'))
    .every(el => !el.classList.contains('active'));

  document.querySelectorAll('.package-info').forEach(el => {
    el.classList.toggle('active', allHidden);
  });

  const toggleBtn = document.querySelector('.package-toggle');
  toggleBtn.textContent = allHidden ? '▲ Hide Packages' : '▼ Show All Packages';
}

function calculateTotal() {
  let total = 0;
  const packageSelect = document.getElementById("package");
  const packageValue = packageSelect.value;

  if (packageValue !== "0") {
    total = packages[packageValue].price * exchangeRate;
  }

  document.getElementById("selectedPackage").innerText = packageSelect.selectedOptions[0].text;

  const pages = parseInt(document.getElementById("pages").value);
  document.getElementById("selectedPages").innerText = pages;

  if (packageValue !== "0" && pages > packages[packageValue].max) {
    total += (pages - packages[packageValue].max) * (10 * exchangeRate);
  }

  let addOns = [];
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (cb.checked) {
      const value = parseInt(cb.value) * exchangeRate;
      total += value;
      addOns.push(`${cb.parentElement.textContent.trim()} ($${value.toFixed(2)})`);
    }
  });

  document.getElementById("selectedAddOns").innerText = addOns.length ? addOns.join(", ") : "None";
  document.getElementById("total").innerText = `$${total.toFixed(2)}`;
}

function sendWhatsApp() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const whatsappNumber = document.getElementById("whatsapp").value;
  const package = document.getElementById("selectedPackage").innerText;
  const pages = document.getElementById("selectedPages").innerText;
  const addOns = document.getElementById("selectedAddOns").innerText;
  const total = document.getElementById("total").innerText;

  if (!name || !email || !whatsappNumber) {
    alert("Please fill in all your details before sending");
    return;
  }

  let msg = `*NEW WEBSITE QUOTE REQUEST* 🔥\n\n`;
  msg += `👤 *Client Name:* ${name}\n`;
  msg += `📧 *Email:* ${email}\n`;
  msg += `📱 *WhatsApp:* ${whatsappNumber}\n\n`;
  msg += `📦 *Selected Package:*\n${package}\n\n`;
  msg += `📄 *Number of Pages:* ${pages}\n\n`;
  msg += `➕ *Selected Add-Ons:*\n${addOns}\n\n`;
  msg += `💰 *Total Quote Amount:* ${total}\n\n`;
  msg += `💬 *Client Message:*\n"I'd like to proceed with this quote. Please contact me to discuss next steps."`;

  const encoded = encodeURIComponent(msg);
  confetti();
  window.open(`https://wa.me/27715731602?text=${encoded}`, '_blank');
}

function downloadPDF() {
  alert("PDF download feature coming soon!");
}

function submitEmail() {
  alert("Quote submitted successfully via email.");
}
// === Quote actions overrides (unified behavior across pages) ===
(function(){
  function currency(){
    const t = (document.getElementById('total')?.innerText || '').trim();
    return t.replace(/[0-9.,\s]/g, '') || t.charAt(0) || '';
  }
  function country(){
    const m = document.title.match(/\(([^)]+)\)/); return m ? m[1] : 'Unknown';
  }
  function data(){
    return {
      name: (document.getElementById('name')?.value || '').trim(),
      email: (document.getElementById('email')?.value || '').trim(),
      whatsapp: (document.getElementById('whatsapp')?.value || '').trim(),
      pkg: (document.getElementById('selectedPackage')?.innerText || 'None').trim(),
      pages: (document.getElementById('selectedPages')?.innerText || '0').trim(),
      addOns: (document.getElementById('selectedAddOns')?.innerText || 'None').trim(),
      total: (document.getElementById('total')?.innerText || '').trim(),
      currency: currency(), country: country(),
      page: (window.location.pathname.split('/').pop() || ''), ts: new Date().toISOString()
    };
  }
  function valid(q){
    if(!q.name || !q.email || !q.whatsapp){ alert('Please fill Your Name, Your Email, and Your WhatsApp Number.'); return false; }
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(q.email)){ alert('Please enter a valid email address.'); return false; }
    return true;
  }
  function normalizeWhatsapp(n){
    const map = { 'South Africa':'27','Zimbabwe':'263','Zambia':'260','Botswana':'267' };
    const cc = map[country()] || '';
    let d = String(n||'').replace(/\D/g,'');
    if(!d) return d; if(d.startsWith('00')) d=d.slice(2); if(d.startsWith('0')) d=d.replace(/^0+/, '');
    if(cc && !d.startsWith(cc)) d = cc + d; return d;
  }
  function msg(q){
    return ['*WEBSITE QUOTE SUMMARY*','',`Client Name: ${q.name}`,`Email: ${q.email}`,`WhatsApp: ${q.whatsapp}`,'',
            `Selected Package: ${q.pkg}`,`Number of Pages: ${q.pages}`,`Selected Add-Ons: ${q.addOns}`,`Total Quote Amount: ${q.total}`,'',
            `Country: ${q.country}`,`Page: ${q.page}`,`Timestamp: ${q.ts}`].join('\n');
  }
  async function emailOwner(q){
    try{ const fd = new FormData();
      fd.append('access_key','af31cdca-fdb5-4fd7-81bd-762838f8e47f');
      fd.append('subject', `Website Quote Request - ${q.country}`);
      fd.append('form','Quote'); fd.append('page', q.page);
      fd.append('name', q.name); fd.append('email', q.email);
      fd.append('message', msg(q));
      await fetch('https://api.web3forms.com/submit',{method:'POST', body: fd});
    } catch(_){}
  }
  // Override: WhatsApp to client's number, email owner in background
  window.sendWhatsApp = function(){
    const q = data(); if(!valid(q)) return; emailOwner(q);
    try{ if(typeof confetti==='function') confetti(); }catch(_){ }
    const to = normalizeWhatsapp(q.whatsapp); const m = msg(q);
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(m)}`, '_blank');
  };
  // Override: Download as print-to-PDF
  window.downloadPDF = function(){
    const q = data(); if(!valid(q)) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>KypexTech Quote - ${q.name}</title>
    <style>body{font-family:Segoe UI,Arial,sans-serif;margin:30px;color:#111}.brand{font-weight:800;color:#ff015b;font-size:20px}
    h1{font-size:18px;margin:10px 0 20px}table{border-collapse:collapse;width:100%;margin-top:10px}
    td,th{border:1px solid #ccc;padding:8px;text-align:left}.total{font-weight:700}.muted{color:#666;font-size:12px;margin-top:10px}</style>
    </head><body onload="window.print()"><div class="brand">KypexTech</div>
    <h1>Website Quote Summary (${q.country})</h1>
    <table><tr><th>Client Name</th><td>${q.name}</td></tr>
    <tr><th>Email</th><td>${q.email}</td></tr>
    <tr><th>WhatsApp</th><td>${q.whatsapp}</td></tr>
    <tr><th>Package</th><td>${q.pkg}</td></tr>
    <tr><th>Pages</th><td>${q.pages}</td></tr>
    <tr><th>Add-Ons</th><td>${q.addOns}</td></tr>
    <tr class="total"><th>Total</th><td>${q.total}</td></tr></table>
    <div class="muted">Page: ${q.page}<br>Generated: ${q.ts}</div></body></html>`;
    const w = window.open('', '_blank', 'noopener,noreferrer'); if(!w){ alert('Please allow popups to download the quote.'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  };
  // Override: Email owner (via Web3Forms) and open mailto for client copy
  window.submitEmail = async function(){
    const q = data(); if(!valid(q)) return; try{ if(typeof confetti==='function') confetti(); }catch(_){ }
    await emailOwner(q);
    const subject = `Your Website Quote - KypexTech (${q.country})`;
    const body = msg(q) + '\n\nThank you for using KypexTech.';
    window.location.href = `mailto:${encodeURIComponent(q.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
})();
