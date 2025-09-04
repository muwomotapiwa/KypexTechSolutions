// Agent-Kypex (chat-first, TTS optional, no mic)
// Note: Client-side API key is for testing. Use a proxy in production.
(function(){
  if (window.KypexAgent) return; window.KypexAgent = { version:'0.4' };

  var GEMINI_KEY = 'AIzaSyAG3pmTW3OHyJQaWmUu55z3O1QanHB4Fug';
  var GEMINI_MODEL = 'gemini-1.5-flash';
  var API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + encodeURIComponent(GEMINI_KEY);

  var CONFIG = { email: 'hello@kypextech.co.za', whatsapp: '+27605023284' };

  // ---------- Curated Knowledge Base (marketing-focused) ----------
  // Keep concise so we can also send to Gemini each turn.
  var KB = [
    { id:'ai', name:'AI Solutioning', path:'ai-solutioning.html',
      summary:'Production-grade AI: GenAI and RAG assistants, NLP/chatbots, computer vision, predictive models, MLOps, and Responsible AI.',
      bullets:['GenAI and Retrieval Augmented Generation','NLP chatbots and assistants','Computer vision (OCR, detection, QA)','Forecasting and recommendations','MLOps (CI/CD, monitoring, drift)','Responsible AI and safety by default'] },
    { id:'web', name:'Website Development', path:'website-development.html',
      summary:'Responsive, fast, and SEO-ready sites tailored to your brand with clean UX and modern tooling.',
      bullets:['Responsive design','Custom components and CMS','Performance and SEO best practices','E-commerce and payments','Analytics and hosting guidance'] },
    { id:'mobile', name:'Mobile App Development', path:'mobile-app-development.html',
      summary:'Feature-rich iOS/Android apps with great UX and secure integrations.',
      bullets:['Cross-platform builds','Push notifications and auth','API integrations','Store submission support'] },
    { id:'cyber', name:'Cybersecurity', path:'cybersecurity.html',
      summary:'Security posture hardening and continuous protection across data, endpoints, cloud, and networks.',
      bullets:['Network and endpoint security','Data protection and encryption','Cloud security and compliance','Threat monitoring and pen testing'] },
    { id:'cloud', name:'Cloud Services', path:'cloud-services.html',
      summary:'Migrations, optimization, and day-2 operations with security and cost guardrails.',
      bullets:['Migration planning and execution','Cost optimization and autoscaling','Cloud security and backups','Storage, CRM, and hybrid cloud'] },
    { id:'cloud-mig', name:'Cloud Migration', path:'cloud-migration.html', summary:'Plan and execute low-risk moves to AWS/Azure/GCP.' },
    { id:'cloud-opt', name:'Cloud Optimization', path:'cloud-optimization.html', summary:'Reduce spend and improve performance with smart tuning.' },
    { id:'cloud-sec', name:'Cloud Security', path:'cloud-security.html', summary:'Guardrails for identity, data, network, and compliance.' },
    { id:'cloud-store', name:'Cloud Storage', path:'cloud-storage.html', summary:'Right-sized, durable storage with lifecycle policies.' },
    { id:'cloud-crm', name:'Cloud CRM Solutions', path:'cloud-crm.html', summary:'Implement, integrate, and automate CRMs like Salesforce, HubSpot, or Zoho.' },
    { id:'hybrid', name:'Hybrid Cloud', path:'hybrid-cloud.html', summary:'Blend on-prem and cloud with secure connectivity.' },
    { id:'consult', name:'IT Consulting', path:'it-consulting.html',
      summary:'Strategy, roadmaps, and pragmatic guidance for modern IT.' },
    { id:'data', name:'Data Analytics', path:'data-analytics.html',
      summary:'Dashboards, BI, ETL, and predictive insights to drive decisions.' },
    { id:'assessment', name:'Free Security Assessment', path:'assessment.html', summary:'Identify gaps and prioritize security improvements.' },
    { id:'free-consult', name:'Free Consultation', path:'consultation.html', summary:'Meet to scope needs and propose the next steps.' }
  ];

  var KEYWORDS = [
    {rx:/(ai|artificial intelligence|genai|rag|chatbot|assistant)/i, id:'ai'},
    {rx:/(web\s*site|web[- ]?dev|website development)/i, id:'web'},
    {rx:/(mobile|app\b)/i, id:'mobile'},
    {rx:/(cyber|security|infosec)/i, id:'cyber'},
    {rx:/(cloud(?!\s*security)|cloud services)/i, id:'cloud'},
    {rx:/migration/i, id:'cloud-mig'},
    {rx:/optim(ization|ise)/i, id:'cloud-opt'},
    {rx:/cloud security/i, id:'cloud-sec'},
    {rx:/storage/i, id:'cloud-store'},
    {rx:/crm/i, id:'cloud-crm'},
    {rx:/hybrid/i, id:'hybrid'},
    {rx:/consult(ing|ation)/i, id:'consult'},
    {rx:/analytics|data/i, id:'data'},
    {rx:/assessment/i, id:'assessment'}
  ];

  function findServiceMatch(text){
    var t = String(text||'').toLowerCase();
    for (var i=0;i<KEYWORDS.length;i++) if (KEYWORDS[i].rx.test(t)) return KEYWORDS[i].id;
    // generic service intent
    if (/services|what do you do|offer/i.test(text||'')) return 'ai'; // lead with AI, our flagship
    return null;
  }

  function kbAnswer(text){
    var id = findServiceMatch(text);
    if (!id) return null;
    var item = KB.find(function(x){ return x.id===id; });
    if (!item) return null;
    var line = item.name + ': ' + item.summary;
    var bullets = (item.bullets||[]).slice(0,4).join('; ');
    var cta = 'Would you like me to open ' + item.name + ' or book a consultation?';
    return line + (bullets? ' — ' + bullets + '. ' : ' ') + cta;
  }

  // ---------- UI ----------
  function initUI(){
    if (document.getElementById('agent-widget')) return;
    var root = document.createElement('div');
    root.id = 'agent-widget';
    root.innerHTML = [
      '<button class="agent-fab" id="agentFab" aria-label="Open AI assistant">AI</button>',
      '<section class="agent-panel" id="agentPanel" aria-live="polite">',
      '  <header>',
      '    <strong>AI Guide</strong>',
      '    <div>',
      '      <button id="agentMute" title="Toggle voice">Mute</button>',
      '      <button id="agentClose" title="Close">X</button>',
      '    </div>',
      '  </header>',
      '  <div class="agent-log" id="agentLog" role="log"></div>',
      '  <form class="agent-input" id="agentForm" autocomplete="off">',
      '    <input id="agentText" type="text" placeholder="Type your question or ask to fill forms" aria-label="Message" />',
      '    <button type="submit" class="agent-send" title="Send">Send</button>',
      '  </form>',
      '</section>'
    ].join('\n');
    document.body.appendChild(root);
    bindUI();
  }

  var panel, logEl, inputEl, muteBtn;
  var history = []; // for LLM context
  var muted = false;

  function bindUI(){
    panel = document.getElementById('agentPanel');
    logEl = document.getElementById('agentLog');
    inputEl = document.getElementById('agentText');
    muteBtn = document.getElementById('agentMute');
    document.getElementById('agentFab').addEventListener('click', togglePanel);
    document.getElementById('agentClose').addEventListener('click', function(){ try{ sessionStorage.setItem('agent_closed','1'); }catch(_){} closePanel(); });
    document.getElementById('agentForm').addEventListener('submit', onSubmit);
    muteBtn.addEventListener('click', toggleMute);

    try{ muted = sessionStorage.getItem('agent_muted') === '1'; }catch(_){ }
    updateMuteUI();
  }

  function openPanel(){
    var root = document.getElementById('agent-widget');
    root.classList.add('open');
    // Introduce once per session only
    var introDone = false;
    try { introDone = sessionStorage.getItem('agent_intro_done') === '1'; } catch(_){}
    if (!introDone && !logEl.dataset.greeted){
      var greet = "Hi, I'm Agent-Kypex. Ask me anything about our services, quotes, or forms. I can also navigate and fill forms for you.";
      addAgentMsg(greet, true);
      speakHints();
      logEl.dataset.greeted = '1';
      try { sessionStorage.setItem('agent_intro_done','1'); } catch(_){}
    }
    setTimeout(function(){ if (inputEl) inputEl.focus(); }, 40);
  }
  function closePanel(){ try{ if (window.speechSynthesis) window.speechSynthesis.cancel(); }catch(_){} document.getElementById('agent-widget').classList.remove('open'); }
  function togglePanel(){ var root = document.getElementById('agent-widget'); if (root.classList.contains('open')) { closePanel(); } else { openPanel(); } }

  // ---------- Chat helpers ----------
  function addUserMsg(text){
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch(_){}
    var row = document.createElement('div');
    row.className = 'msg user'; row.textContent = text;
    logEl.appendChild(row); logEl.scrollTop = logEl.scrollHeight;
    persistHistory('user', text);
  }
  function addAgentMsg(text, noStore){
    var row = document.createElement('div');
    row.className = 'msg agent'; row.textContent = text;
    logEl.appendChild(row); logEl.scrollTop = logEl.scrollHeight;
    if (!noStore) persistHistory('agent', text);
    if (!muted) speak(text);
  }

  // ---------- TTS (no mic) ----------
  function sanitizeForTTS(text){
    try {
      var s = String(text||'');
      // Remove common formatting markers and distracting punctuation
      s = s.replace(/[\*`_~]|[“”]/g, ''); // markdown symbols + smart quotes
      s = s.replace(/\s+\*\*\s+/g, ' ');
      s = s.replace(/["';{}\[\]<>|\\]/g, '');
      s = s.replace(/\s+/g, ' ').trim();
      return s;
    } catch(_) { return text; }
  }
  function speak(text){
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel(); // interrupt ongoing speech
      var clean = sanitizeForTTS(text);
      var u = new SpeechSynthesisUtterance(clean);
      u.rate=1.02; u.pitch=1.0; u.volume=1.0;
      var vs = window.speechSynthesis.getVoices();
      var v = vs.find(function(x){ return /en-(ZA|US|GB)/i.test(x.lang); }) || vs[0];
      if (v) u.voice = v; window.speechSynthesis.speak(u);
    } catch(_){}
  }
  function toggleMute(){ muted = !muted; try{ sessionStorage.setItem('agent_muted', muted?'1':'0'); }catch(_){} updateMuteUI(); }
  function updateMuteUI(){ if (muteBtn) muteBtn.textContent = muted ? 'Unmute' : 'Mute'; }

  // ---------- Actions ----------
  var ROUTES = {
    ai:'ai-solutioning.html', website:'website-development.html', mobile:'mobile-app-development.html',
    cybersecurity:'cybersecurity.html', cloud:'cloud-services.html', consulting:'it-consulting.html',
    analytics:'data-analytics.html', portfolio:'portfolio.html', about:'about.html', contact:'contact.html',
    assessment:'assessment.html', consultation:'consultation.html', start:'project-start.html', home:'index.html'
  };
  function route(key){ addAgentMsg('Opening ' + key + '...'); setTimeout(function(){ window.location.href = ROUTES[key]; }, 120); return true; }
  function openWhatsApp(message){ var num=CONFIG.whatsapp.replace(/\D+/g,''); var url='https://wa.me/'+num+'?text='+encodeURIComponent(message||'Hi KypexTech!'); window.open(url,'_blank','noopener'); }
  function openMail(subject, body){ var url='mailto:'+encodeURIComponent(CONFIG.email)+'?subject='+encodeURIComponent(subject||'Enquiry from website')+'&body='+encodeURIComponent(body||''); window.location.href=url; }

  function setField(selectors, value){ for (var i=0;i<selectors.length;i++){ var el=document.querySelector(selectors[i]); if (el){ el.focus(); el.value=value; try{ el.dispatchEvent(new Event('input',{bubbles:true})); }catch(_){} el.blur(); return true; } } return false; }
  function setSelect(selectors, value){ value=String(value||'').toLowerCase(); for (var i=0;i<selectors.length;i++){ var sel=document.querySelector(selectors[i]); if (sel && sel.tagName==='SELECT'){ for (var j=0;j<sel.options.length;j++){ var opt=sel.options[j]; if (String(opt.value).toLowerCase()===value || String(opt.text).toLowerCase()===value){ sel.value=opt.value; sel.dispatchEvent(new Event('change',{bubbles:true})); return true; } } } } return false; }

  function openWebsiteQuote(){ try { var geo=(sessionStorage.getItem('geo_name')||'').toLowerCase(); var map={ 'south africa':'rsawebsitequote.html', 'zimbabwe':'zwwebsitequote.html', 'zambia':'zawebsitequote.html', 'botswana':'bwwebsitequote.html' }; window.location.href = map[geo] || 'website-development.html'; return true; } catch(_) { window.location.href='website-development.html'; return true; } }
  function routeToBestForm(text){ var t=(text||'').toLowerCase(); if (/(speak|talk) to (someone|a (person|human|rep)|team|agent)/.test(t)) return route('contact'); if (/contact (us|team)|reach (out|someone)|call you/.test(t)) return route('contact'); if (/(book|schedule|set up) (a )?(consult|meeting|call)/.test(t)) return route('consultation'); if (/assessment|security check|security audit/.test(t)) return route('assessment'); if (/(start|kick ?off|begin).*(project)/.test(t)) return route('start'); if (/(website|site).*(quote|pricing|estimate)|quote.*(website|site)/.test(t)) return openWebsiteQuote(); return false; }

  function handleLocalIntents(text){
    var t=(text||'').toLowerCase();
    if (routeToBestForm(t)) return true;
    // nav
    if (/\bai\b|artificial intelligence|genai|assistant/.test(t)) return route('ai');
    if (/web( |-)dev|website/.test(t)) return route('website');
    if (/mobile|app\b/.test(t)) return route('mobile');
    if (/cyber|security/.test(t)) return route('cybersecurity');
    if (/cloud/.test(t)) return route('cloud');
    if (/consult(ing|ation)/.test(t)) return route(/consultation/.test(t)?'consultation':'consulting');
    if (/data|analytics/.test(t)) return route('analytics');
    if (/portfolio|projects/.test(t)) return route('portfolio');
    if (/about/.test(t)) return route('about');
    if (/contact|reach/.test(t)) return route('contact');
    if (/assessment/.test(t)) return route('assessment');
    if (/start|project start/.test(t)) return route('start');
    if (/home/.test(t)) return route('home');
    // comms
    if (/whats\s*app|whatsapp/.test(t)) { addAgentMsg('Opening WhatsApp...'); openWhatsApp('Hi KypexTech!'); return true; }
    if (/email|mail/.test(t)) { addAgentMsg('Opening an email draft...'); openMail('Enquiry from website'); return true; }
    if (/call\b|phone/.test(t)) { addAgentMsg('Starting a call...'); window.location.href = 'tel:' + CONFIG.whatsapp; return true; }
    // form fill
    if (/^my name is\s+(.+)/i.test(text)) { setField(['input[name="name"]','input[name="contactName"]'], RegExp.$1.trim()); addAgentMsg('Added your name.'); return true; }
    if (/^my email is\s+(.+)/i.test(text)) { setField(['input[type="email"]','input[name="email"]'], RegExp.$1.trim()); addAgentMsg('Added your email.'); return true; }
    if (/^my (phone|number) is\s+(.+)/i.test(text)) { setField(['input[type="tel"]','input[name="phone"]'], RegExp.$2.trim()); addAgentMsg('Added your phone.'); return true; }
    if (/^my (company|business|organisation|organization) is\s+(.+)/i.test(text)) { setField(['input[name="company"]','input[name="business"]','input[name="organisation"]','input[name="organization"]'], RegExp.$2.trim()); addAgentMsg('Added your company.'); return true; }
    if (/^my (budget|price) is\s+(.+)/i.test(text)) { var v = RegExp.$2.trim(); setField(['input[name="budget"]'], v) || setSelect(['select[name="budget"]'], v); addAgentMsg('Added your budget.'); return true; }
    if (/^i am in\s+(.+)/i.test(text)) { var c = RegExp.$1.trim(); setField(['input[name="country"]'], c) || setSelect(['select[name="country"]','#country'], c.toLowerCase()); addAgentMsg('Noted your country.'); return true; }
    if (/^preferred date\s+(.+)/i.test(text)) { setField(['input[name="preferred_date"]','input[type="date"]'], RegExp.$1.trim()); addAgentMsg('Added the date.'); return true; }
    if (/^preferred time\s+(.+)/i.test(text)) { setField(['input[name="preferred_time"]','input[type="time"]'], RegExp.$1.trim()); addAgentMsg('Added the time.'); return true; }
    if (/^timezone\s+(.+)/i.test(text)) { setField(['input[name="timezone"]'], RegExp.$1.trim()); addAgentMsg('Added your timezone.'); return true; }
    if (/^(my )?(message|note) is\s+(.+)/i.test(text)) { setField(['textarea[name="message"]','textarea'], RegExp.$3.trim()); addAgentMsg('Added your message.'); return true; }
    if (/^submit( form)?$/i.test(text)) { var f=document.querySelector('form'); if (f){ if (f.requestSubmit) f.requestSubmit(); else f.submit(); addAgentMsg('Submitting the form...'); } else { addAgentMsg('I could not find a form here.'); } return true; }
    return false;
  }

  // ---------- Chat logic ----------
  function onSubmit(e){ e.preventDefault(); var text=(inputEl.value||'').trim(); if(!text) return; inputEl.value=''; if (commandMuteIfAny(text)) return; addUserMsg(text); processUserText(text); }
  function processUserText(text){
    if (handleLocalIntents(text)) return;
    var direct = kbAnswer(text);
    if (direct) { addAgentMsg(direct); return; }
    askGemini(text).then(function(r){ addAgentMsg(r); track('gemini_answer'); }).catch(function(){ addAgentMsg('Network issue.'); });
  }
  function commandMuteIfAny(text){ var t=(text||'').toLowerCase().trim(); if (t==='mute'){ muted=true; try{sessionStorage.setItem('agent_muted','1');}catch(_){} updateMuteUI(); addAgentMsg('Muted. I will stop speaking.'); return true;} if (t==='unmute'){ muted=false; try{sessionStorage.setItem('agent_muted','0');}catch(_){} updateMuteUI(); addAgentMsg('Unmuted. I will speak again.'); return true;} return false; }

  // ---------- Gemini ----------
  function capturePageContext(max){ try{ var parts=[]; parts.push('Title: ' + (document.title||'')); var m=document.querySelector('meta[name="description"]'); if(m&&m.content) parts.push('Meta: ' + m.content); var hs=Array.from(document.querySelectorAll('h1, h2, h3')).map(function(h){return h.textContent.trim();}).filter(Boolean); if(hs.length) parts.push('Headings: ' + hs.join(' | ')); var ctx=parts.join('\n'); return ctx.slice(0,max||1000);}catch(_){return '';} }
  async function askGemini(prompt){
    var system = 'You are Agent-Kypex, the friendly website assistant for KypexTech. You know the product and service catalog below and speak as a helpful marketing guide. Never say you lack real-time access or cannot know; use the provided knowledge and page context. Answer in 1-3 short sentences with a helpful next step (open a page, book consultation, or suggest a form). If a question is off-topic, politely steer back to how you can help.';
    var pageCtx = capturePageContext(800);
    var catalog = KB.map(function(it){ return it.name+': '+it.summary; }).join('\n');
    var contents = [];
    if (history.length===0) contents.push({role:'user', parts:[{text: system}]});
    for (var i=0;i<history.length;i++) contents.push(history[i]);
    contents.push({role:'user', parts:[{text: 'Catalog:\n'+catalog}]});
    contents.push({role:'user', parts:[{text: 'Page context:\n'+pageCtx}]});
    contents.push({role:'user', parts:[{text: prompt}]});
    var body = { contents: contents };
    var res = await fetch(API_URL,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('gemini http');
    var data = await res.json();
    var text = (((data.candidates||[])[0]||{}).content||{}).parts && (((data.candidates||[])[0]||{}).content.parts.map(function(p){return p.text;}).join('\n')) || 'We can help with that. Would you like me to open the relevant page or book a consultation?';
    history.push({role:'user', parts:[{text: prompt}]});
    history.push({role:'model', parts:[{text: text}]});
    while (history.length>12) history.shift();
    return text;
  }

  // ---------- Persistence ----------
  function persistHistory(role, text){ try{ var store=JSON.parse(sessionStorage.getItem('agent_history')||'[]'); store.push({role:role, text:text}); if(store.length>50) store=store.slice(store.length-50); sessionStorage.setItem('agent_history', JSON.stringify(store)); }catch(_){ } }
  function restoreHistory(){ try{ var store=JSON.parse(sessionStorage.getItem('agent_history')||'[]'); for(var i=0;i<store.length;i++){ var m=store[i]; var row=document.createElement('div'); row.className='msg ' + (m.role==='user'?'user':'agent'); row.textContent=m.text; logEl.appendChild(row);} logEl.scrollTop=logEl.scrollHeight; }catch(_){ } }

  // ---------- Hints + GA ----------
  function speakHints(){ try{ var p=(location.pathname||'').toLowerCase(); if(p.indexOf('website-development.html')>=0){ addAgentMsg('Tip: Type your country and "website quote", or type "submit form" when done.'); return; } if(p.indexOf('consultation.html')>=0){ addAgentMsg('You can type preferred date, preferred time, timezone, then "submit form".'); return; } if(p.indexOf('contact.html')>=0){ addAgentMsg('You can type name, email, message, then "submit form".'); return; } if(p.indexOf('ai-solutioning.html')>=0){ addAgentMsg('Ask about assistants, RAG, vision, or type "book a consultation".'); return; } if(p.indexOf('index.html')>=0||p=='/'){ addAgentMsg('Try: "website quote", "book consultation", or "open AI solutions".'); return; } }catch(_){}}
  function track(action){ try{ if(window.gtag) window.gtag('event','agent_action',{action:action,page:location.pathname}); }catch(_){ }}

  // ---------- Boot ----------
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', onReady); else onReady();
  function onReady(){
    initUI();
    // Do not auto-open; user toggles with the AI button
    restoreHistory();
  }
})();
