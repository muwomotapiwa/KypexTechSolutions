// Unified quote actions: WhatsApp share to client, PDF, and email owner + client copy
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
  // Expose unified handlers
  window.sendWhatsApp = function(){
    const q = data(); if(!valid(q)) return; emailOwner(q);
    try{ if(typeof confetti==='function') confetti(); }catch(_){ }
    const to = normalizeWhatsapp(q.whatsapp); const m = msg(q);
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(m)}`, '_blank');
  };
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
  window.submitEmail = async function(){
    const q = data(); if(!valid(q)) return; try{ if(typeof confetti==='function') confetti(); }catch(_){ }
    await emailOwner(q);
    const subject = `Your Website Quote - KypexTech (${q.country})`;
    const body = msg(q) + '\n\nThank you for using KypexTech.';
    window.location.href = `mailto:${encodeURIComponent(q.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
})();

