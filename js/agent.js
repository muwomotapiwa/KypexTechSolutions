// Agent-Kypex (chat-first, TTS optional, no mic)
// Note: Client-side API key is for testing. Use a proxy in production.
(function(){
  if (window.KypexAgent) return; window.KypexAgent = { version:'0.4' };

  var GEMINI_KEY = 'AIzaSyAG3pmTW3OHyJQaWmUu55z3O1QanHB4Fug';
  var GEMINI_MODEL = 'gemini-1.5-flash';
  var API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + encodeURIComponent(GEMINI_KEY);

  var CONFIG = { email: 'hello@kypextech.co.za', whatsapp: '+27605023284' };
  // Optional OpenAI TTS config for consistent voice across devices
  // Provide key via: <meta name="openai-tts-key" content="sk-..."> or localStorage.openai_tts_key
  var OPENAI_TTS = {
    key: null,
    model: 'gpt-4o-mini-tts',
    voice: 'aoede', // enforce Aoede voice
    format: 'mp3',
    endpoint: 'https://api.openai.com/v1/audio/speech'
  };

  // ---------- Device detection (voice desktop-only) ----------
  function isDesktop(){
    try{
      var ua = (navigator.userAgent||'');
      var isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
      var isIpadLike = /Macintosh/i.test(ua) && (navigator.maxTouchPoints||0) > 1; // iPadOS masquerading as Mac
      var finePointer = (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) || false;
      return !isMobileUA && !isIpadLike && finePointer;
    }catch(_){ return true; }
  }

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

  var TIP_MESSAGES = [
    "Type 'Tell me more about this page' to get a quick summary without leaving.",
    "Ask 'Open cloud security page' or any service name to jump there instantly.",
    "Say 'Book AI consultation' and I will take you straight to the booking form.",
    "Need a project quote? Type 'Start project form' to open the Project Start page.",
    "Curious about our work? Try 'Show me the portfolio page'."
  ];

  // ---------- QnA (page-specific answers) ----------
  var QNA = [];
  var QNA_READY = false;
  function addQNA(patterns, answer, route){
    try{
      QNA.push({ patterns: (patterns||[]), answer: String(answer||''), route: route||null });
    }catch(_){ }
  }
  function initQNA(){
    if (QNA_READY) return; QNA_READY = true;
    var D = {
      // Helper routes
      ai:'ai', analytics:'analytics', cloud:'cloud', consulting:'consultation', assessment:'assessment', contact:'contact',
      portfolio:'portfolio', website:'website', start:'start', crm:'cloud', security:'cybersecurity', mobile:'mobile'
    };

    // ---------- Home page (Marketing / Sales) ----------
    addQNA([
      /(what|which) (kind|type)s? of (it )?solutions (do|does) you (speciali[sz]e|offer)/i,
      /(how|in what ways?).*help my business grow/i
    ], "We specialize in AI solutioning, website and mobile app development, cybersecurity, cloud services, IT consulting, and data analytics. Each service is designed to remove roadblocks, enhance efficiency, and give your business the digital edge it needs to grow confidently. (P.S. You can also subscribe to our newsletter in the footer to get monthly updates.)", null);
    addQNA([
      /(which|what) services? should i (explore|look at|check out) (first|initially)/i,
      /new to kypextech.*(services|start)/i
    ], "Most new clients begin with our AI Solutioning or Website Development, because they create immediate visibility and smarter operations. But if you are unsure, booking a free consultation is the best starting point. You can also subscribe to our newsletter for ongoing tips and updates.", null);
    addQNA([
      /learn more about your company (background|story|history)/i,
      /where can i find (the )?about (page|section)/i
    ], "You can learn more on the About Us page, accessible from the Home page navigation. You will also find links to our Portfolio, Services, and Contact sections. And do not miss the newsletter subscription option in the footer.", null);
    addQNA([
      /what (exactly )?is included in (your )?ai solutioning/i,
      /tell me about (the )?ai solutioning (offering|package)/i
    ], "We deliver Generative AI, chatbots, predictive models, computer vision, and full MLOps support. Our goal is production-grade AI that makes a real impact. You can always subscribe in the footer for updates on our newest AI breakthroughs.", null);
    addQNA([
      /how do you ensure (the )?ai systems.*(production|reliable)/i,
      /(make sure|ensure).*(ai systems?).*production-ready/i
    ], "We follow strict engineering practices: testing, CI/CD pipelines, and responsible AI standards. That way, the systems you deploy are scalable, compliant, and dependable. Want more AI insights? Subscribe to our newsletter in the footer.", null);
    addQNA([
      /who leads (your )?ai projects?/i,
      /(ai team|ai projects?).*(expertise|background)/i
    ], "Our AI team is led by a Software Engineering MSc candidate specializing in Artificial Intelligence, supported by experienced developers and consultants. Together, they bring both academic depth and business practicality. You can keep up with their latest work by subscribing at the footer.", null);
    addQNA([
      /(how|where) do i book (an )?ai consultation/i,
      /(prepare|prep).*ai consultation/i
    ], "Simply click Book AI Consultation on the Home page. To prepare, bring your current challenges, datasets (if any), and growth goals. And if you would like ongoing preparation tips, subscribe via the footer newsletter.", null);
    addQNA([
      /do you (custom|bespoke).*(websites|sites)/i,
      /(templates?|template based).*websites?/i
    ], "We create custom websites designed to reflect your unique brand and goals. Templates can inspire, but your site is always built to stand out. For inspiration and case studies, subscribe via the newsletter link in the footer.", null);
    addQNA([
      /develop (both )?ios and android apps?/i,
      /(advanced features|feature rich).*(mobile apps|applications)/i
    ], "Yes -- we design and build high-performance apps for both iOS and Android, with features like e-commerce, chat, payments, and AI integrations. For ongoing app development insights, subscribe in the footer.", null);
    addQNA([
      /what (cybersecurity|cloud) (projects|migrations?).*(handled|delivered)/i,
      /(experience|past work).*(cybersecurity|cloud migrations?)/i
    ], "We have implemented penetration testing, endpoint protection, and compliance programs, as well as migrations to AWS and Azure with secure, scalable setups. For future updates on security best practices, subscribe via the footer newsletter.", null);
    addQNA([
      /where can i see (examples|case studies)/i,
      /(show|view).*portfolio/i
    ], "Our Portfolio page highlights projects and success stories. You will find it in the Home page navigation, and you can stay updated on new case studies through the footer newsletter subscription.", null);
    addQNA([
      /(best|good).*way to contact you/i,
      /(project discussion|reach out).*contact/i
    ], "Visit our Contact page, where you will find a quick form and email details. We usually reply within one business day. And if you want to keep the conversation warm, subscribe via the newsletter link in the footer.", null);
    addQNA([
      /what is included in the free (security )?assessment/i,
      /free (security )?(assessment|consultation).*(include|cover)/i
    ], "The free security assessment reviews your IT environment for risks, while the consultation provides tailored advice on next steps. You can subscribe to our newsletter in the footer to keep learning about new offers and resources.", null);
    addQNA([
      /what (kind|type) of updates.*newsletter/i,
      /subscribe.*newsletter.*receive/i
    ], "You will get monthly updates on new service launches, AI insights, cybersecurity tips, and exclusive resources -- always practical, never spammy.", null);
    addQNA([
      /are you part of (a )?larger group/i,
      /muwomogroup/i
    ], "Yes, KypexTech is a proud subsidiary of MuwomoGroup. This backing gives us scale and resources while we stay agile and client-focused. You can subscribe at the footer to receive group and company news.", null);

    // ---------- AI Solutioning (General) ----------
    addQNA([
      /what is ("?production[- ]grade"? )?ai\??/i,
      /production[- ]grade ai/i
    ], 'Production‑grade AI means systems built to run safely and reliably in your business, not just prototypes. We engineer for security and privacy (PII controls, encryption, least‑privilege), reliability (retries, fallbacks, rate limits, SLAs), and observability (logs, metrics, traces, evaluation dashboards). We version data/models/prompts, ship through CI/CD with approval gates and rollbacks, and align outcomes to your KPIs so value is measurable from day one.', D.ai);
    addQNA([
      /how is your ai expertise different/i,
      /why (choose|pick) kypextech for ai/i
    ], 'We deliver end‑to‑end with safety‑by‑default. That means pragmatic model choices to control cost and latency, strong guardrails (content filters, prompt‑injection resistance, PII handling), and MLOps from day one (versioning, evals, rollback). We are vendor‑neutral across clouds and providers, avoid lock‑in, and tie work directly to business KPIs so impact is clear.', D.ai);
    addQNA([
      /free consultation for ai/i,
      /do you offer a free consultation for ai/i
    ], "Yes, the AI consultation is free. In 20-30 minutes we clarify goals, assess data readiness, and outline quick wins. Want me to open the Consultation page?", 'consultation');
    addQNA([
      /typical timeline for an ai project/i,
      /how long .* ai project/i
    ], "It depends on the scope. A pilot or proof of concept can launch in a few weeks, while a full deployment may take a few months. We confirm a realistic timeline right after Discovery.", D.ai);
    addQNA([
      /how do you ensure .*responsible.*safe/i,
      /responsible ai|safe ai/i
    ], 'We implement privacy by default (minimize/obfuscate PII, encrypt data, least‑privilege access), safety checks (content moderation, allow/deny lists, jailbreak mitigation), fairness evaluations, and human‑in‑the‑loop for sensitive steps. Governance includes audit logs, versioning, approvals, and incident playbooks.', D.ai);

    // ---------- AI Solutioning Page (Marketing) ----------
    addQNA([
      /what does ai solutioning mean/i,
      /ai solutioning (?:is|mean).*/i
    ], "AI Solutioning is our flagship service. It means taking the latest AI research and engineering it into production-ready systems that solve real problems - from smarter chatbots to predictive models that help you make better decisions.", null);
    addQNA([
      /(what|which) (business )?(problems|challenges|use cases).*(ai|artificial intelligence)/i,
      /(cut costs|improve customer|automate workflows).*ai/i
    ], "We help teams cut costs, speed up workflows, improve customer experiences, detect risks, and unlock insights from their data. From automating repetitive tasks to building custom virtual assistants, we turn your challenges into growth opportunities.", null);
    addQNA([
      /(ensure|make sure).*(ai).*(measurable|real) value/i,
      /(how|what) (do|does) you measure ai success/i
    ], "Every engagement is tied to clear KPIs. We validate the impact during design, measure results after deployment, and keep tuning so the value stays visible and sustained.", null);
    addQNA([
      /(who leads|who heads).*(ai (practice|work))/i,
      /(ai team|ai projects?).*(background|experience)/i
    ], "Our AI practice is led by a Software Engineering MSc candidate specializing in AI, backed by consultants with hands-on industry expertise. You get cutting-edge research plus practical delivery.", null);
    addQNA([
      /(focus(ed)?|specialise|specialize).*(industries).*(ai)/i,
      /(which|what) industries.*ai practice/i
    ], "We work across industries - retail, finance, healthcare, logistics, education, and more. Our methods adapt to your sector so the AI fits your reality.", null);
    addQNA([
      /(how|what).*(idea).*(discovery).*(deployment)/i,
      /take an idea from discovery to deployment/i
    ], "We follow a structured five-step path: Discovery, Design, Build, Deploy, Operate. Each stage matures the idea into a safe, scalable, measurable AI solution.", null);
    addQNA([
      /define (kpis?|success metrics)/i,
      /(help|set) (kpis?|metrics) before (coding|building)/i
    ], "Yes. During Design we agree on the KPIs that prove success before any code is written.", null);
    addQNA([
      /(handle|take care of).*(deployment|monitoring)/i,
      /do you just build the model/i
    ], "We go beyond the model. Our team handles deployment, secure APIs, infrastructure, and monitoring so your AI keeps performing.", null);
    addQNA([
      /(what does )?operate (phase)? look like/i,
      /once the ai is live.*operate/i
    ], "Operate means continuous monitoring, performance tracking, drift detection, and feedback loops. We keep improving the system after launch.", null);
    addQNA([
      /(work|collaborate).*(in[- ]house|internal).*(data team)/i
    ], "Absolutely. We regularly co-create with internal teams, share knowledge, and align on standards so your in-house capability grows.", null);
    addQNA([
      /(which|what) ai capabilities do you offer/i,
      /full spectrum of ai capabilities/i
    ], "We cover the full spectrum: GenAI and RAG assistants, NLP, chatbots, computer vision, predictive modeling, MLOps, and Responsible AI.", null);
    addQNA([
      /(build|create).*(custom )?(chatbots|virtual assistants)/i
    ], "Yes. We design chatbots and advanced virtual assistants tailored to your workflows and tone of voice.", null);
    addQNA([
      /(connect|ground).*(ai (assistant|bot)).*(knowledge base|documents|faq)/i,
      /rag pipeline/i
    ], "Yes. With retrieval-augmented generation we ground assistants in your documents, FAQs, or databases so answers stay accurate and cite sources.", null);
    addQNA([
      /(multilingual|multiple languages|low-resource languages)/i
    ], "We support multilingual AI and can tailor pipelines for low-resource languages when needed.", null);
    addQNA([
      /(summaris(e|ze)|extract).*(documents|data)/i
    ], "Yes. Our NLP systems handle summarisation, classification, and structured data extraction from large document sets.", null);
    addQNA([
      /(computer vision|ocr|defect detection|quality inspection)/i
    ], "Yes. We deliver computer vision solutions from OCR to defect detection, tuned for accuracy and speed.", null);
    addQNA([
      /(recommendation engines?|forecast(ing)? models?)/i
    ], "Yes. We build recommendation engines for personalisation and forecasting models for demand, sales, or risk.", null);
    addQNA([
      /(manage|handle).*(model )?drift/i
    ], "We monitor performance continuously, detect drift early, and retrain so the model stays accurate as conditions change.", null);
    addQNA([
      /(provide|set up).*(mlops|ci\/cd for ml)/i
    ], "Yes. We implement model registries, feature stores, CI/CD, and rollback strategies so your ML stack is production-ready.", null);
    addQNA([
      /(ensure|guarantee).*(responsible ai|privacy|bias)/i
    ], "Responsible AI is core to our work. We run bias tests, privacy audits, red-team exercises, and use human-in-the-loop safeguards for sensitive steps.", null);
    addQNA([
      /(which|what) (ai )?(platforms|frameworks|stacks) (do you|does kypextech) work with/i
    ], "We work across AWS, Azure, Google Cloud and frameworks like PyTorch, TensorFlow, and LangChain - we match the tooling to your needs.", null);
    addQNA([
      /(deploy).*(preferred|our) (cloud|on-prem)/i
    ], "Yes. We deploy to your preferred cloud, hybrid setups, or on-prem environments while meeting compliance and security policies.", null);
    addQNA([
      /(rag|retrieval[- ]augmented).*(citations|sources)/i
    ], "Yes. Our GenAI assistants can ground answers in your knowledge base and include source citations for transparency.", null);
    addQNA([
      /(human in the loop|humans? review).*(ai)/i
    ], "We design human-in-the-loop workflows whenever a decision needs oversight before it goes live.", null);
    addQNA([
      /(secure).*(api|infrastructure).*(deploy)/i
    ], "We secure deployments with API gateways, encryption, access controls, and infrastructure-as-code for consistent, auditable setups.", null);
    addQNA([
      /(prepare|bring).*(before|prior to).*(ai consultation)/i
    ], "Bring your business challenges, goals, and any data points you have. I can open the Consultation page when you are ready.", 'consultation');
    addQNA([
      /(is|are).*(ai consultation).*(free|cost)/i
    ], "Yes, the AI consultation is free - it helps you explore the right path before any commitment. Want me to open the Consultation page?", 'consultation');
    addQNA([
      /(how do i|where do i).*(book|schedule).*(ai consultation)/i
    ], "Use the Book AI Consultation button on this page and I can take you there now.", 'consultation');
    addQNA([
      /(start|kick off).*(ai project).*(without|skip).*(consultation)/i
    ], "If you are ready to start immediately we can jump straight in - I will open the Contact page so we can scope the work.", 'contact');
    addQNA([
      /(provide|send).*(roadmap|proposal).*(after).*(consultation|call)/i
    ], "Yes. After we speak we prepare a tailored roadmap or proposal for your goals.", 'consultation');
    addQNA([
      /(share|upload).*(datasets?|requirements).*(team)/i
    ], "The easiest way is via the Contact page or during the consultation - we will give you secure handover instructions.", 'contact');
    addQNA([
      /(fixed[- ]fee|fixed price).*(pilot|proof of concept)/i
    ], "Yes. Many clients begin with a fixed-fee pilot so they can validate results quickly with low risk.", null);
    addQNA([
      /(how do you).*(scope|price).*(ai engagements?)/i
    ], "We are flexible: hourly for short tasks, retainers for ongoing work, or subscription-style models for continuous AI value.", null);
    addQNA([
      /(ongoing support|sla).*(after).*(ai)/i
    ], "Yes. We offer ongoing support with SLAs so your AI remains business-critical.", 'consultation');
    addQNA([
      /(case studies|success stories).*(ai)/i
    ], "Our Portfolio page highlights AI success stories and the outcomes delivered. I can open it for you.", 'portfolio');
    addQNA([
      /(examples|evidence).*(ai impact|results)/i
    ], "We have doubled response speeds, improved forecasts, and automated complex workflows. Let us walk you through the details in a consultation.", 'consultation');
    addQNA([
      /(newsletter).*(ai updates|case studies)/i
    ], "Yes. Our monthly newsletter shares AI insights, case studies, and upcoming innovations.", null);
    addQNA([
      /(how often).*(ai tips|ai news)/i
    ], "We send AI-focused tips monthly - concise, practical, and never spammy.", null);
    addQNA([
      /(walk|guide|take).*(through|over).*(ai capabilities)/i
    ], "The AI page highlights six pillars: GenAI and RAG, Natural Language, Computer Vision, Predictive Modeling, MLOps, and Responsible AI. Let me know which one you want to explore first.", null);
    addQNA([
      /(take me|bring me|open).*(contact page)/i
    ], "Sure - I will open the Contact page so you can reach the team.", 'contact');
    addQNA([
      /(need|want).*(cybersecurity).*(instead|rather)/i
    ], "No problem. I can take you to our Cybersecurity page right away.", 'cybersecurity');
    addQNA([
      /(see|view).*(all services)/i
    ], "Use the Services link in the navigation to browse everything from websites to cloud and analytics. I can jump you back to the Home page if you like.", 'home');
    // ---------- AI Capabilities ----------
    addQNA([/genai.*rag/i, /details.*rag/i], 'We build knowledge‑aware assistants using RAG. Content is cleaned and chunked, embedded with metadata, and retrieved via hybrid search (keyword + vector). Responses cite sources, respect access controls, and follow templates so outputs are consistent and safe.', D.ai);
    addQNA([/natural language.*(problems|services)/i, /nlp/i], 'Our NLP work covers classification/routing, entity/field extraction, summarization, sentiment/quality analysis, and conversational flows. Use cases include ticket triage, policy summarization, inbox automation, and knowledge assistants.', D.ai);
    addQNA([/computer vision/i, /vision.*help businesses/i], 'We implement OCR and document AI (invoices, IDs, forms), detection/QA (find defects or items), and compliance workflows (redaction/masking, visual audit trails). Deployments may run at the edge for speed/privacy or in cloud for scale.', D.ai);
    addQNA([/predictive models/i, /(forecast|propensity|churn|anomaly)/i], 'We build time‑series forecasts (demand, revenue, staffing), propensity/churn models, anomaly/risk detection, and optimization (pricing, inventory, routing). We measure uplift vs baselines and integrate into your processes.', D.ai);
    addQNA([/what does mlops involve/i, /why is mlops important/i], 'MLOps ensures reliable delivery: versioned data/code/models/prompts; CI/CD and evaluation gates; registries and feature stores; monitoring for latency, cost, accuracy, and drift; plus governance and rollbacks. It keeps models useful and safe at scale.', D.ai);
    addQNA([/responsible ai.*(bias|privacy)/i], 'We limit collection, anonymize when possible, and enforce granular permissions. Bias testing and targeted de‑bias strategies are applied where needed. For higher‑impact actions we keep a human‑approval path and transparent model/prompt cards.', D.ai);

    // ---------- AI Process ----------
    addQNA([/what happens during the discovery phase/i], "We focus on understanding your business problem, mapping the use-case value, and checking data readiness so we start with a clear roadmap instead of assumptions.", D.ai);
    addQNA([/safety[- ]by[- ]default.*design/i], 'Safety‑by‑default means the design prevents harm: least‑privilege access, PII redaction, content and tool‑use guardrails, sane defaults, rate limits, and adversarial testing plans covering abuse and edge cases.', D.ai);
    addQNA([/define success criteria|kpis for a project/i], 'We co‑define success using measurable KPIs such as resolution rate, accuracy/precision/recall, time saved, cost per interaction, and satisfaction. Targets are tracked via dashboards and controlled rollouts.', D.ai);
    addQNA([/deployment process look like/i], 'We promote through staging with validation, then canary/blue‑green. Feature flags let us ramp safely; we keep rollbacks ready. Documentation and admin/user training accompany releases.', D.ai);
    addQNA([/monitoring.*continuous improvement/i], 'We monitor cost, latency, and quality, route low‑confidence cases for review, and schedule re‑training or prompt updates. A cadence of reviews keeps the system effective and economical.', D.ai);

    // ---------- AI About KypexTech ----------
    addQNA([/kypextech's experience with ai/i, /experience.*ai/i], 'We design, build, and operate assistants, RAG systems, predictive models, and document/vision workflows. Our focus is measurable business impact, security, and reliability — with patterns we’ve refined across engagements.', D.portfolio);
    addQNA([/see a portfolio of.*ai projects/i, /ai.*case studies/i], 'Yes. We can share relevant AI case studies and demos. Would you like me to open the portfolio page now?', 'portfolio');
    addQNA([/what is the muwomogroup/i, /relationship to it/i], 'KypexTech is a subsidiary of MuwomoGroup, focused on engineering and delivery. The parent group provides strategic backing so we can move fast while staying accountable.', null);
    addQNA([/who are the people behind kypextech/i, /ai team/i], 'We are led by a Software Engineering MSc candidate specializing in AI, supported by engineers across backend, data/ML, cloud, and UX. We assemble the right team per project and can arrange intros.', 'consultation');
    addQNA([/book a consultation.*project started/i], 'You can book a free consultation to scope your AI project and next steps. Shall I open the consultation page?', 'consultation');

    // ---------- Data Analytics ----------
    addQNA([/industries.*data analytics/i], 'We serve technology, professional services, retail/e‑commerce, financial services, and industrial. Our approach is domain‑aware and KPI‑driven, so we adapt to your context.', D.analytics);
    addQNA([/how do your dashboards help/i, /dashboards.*decision/i], 'Dashboards provide role‑based views with consistent KPI definitions, filters, and alerts. They turn data into timely actions — from exec views to operational metrics.', D.analytics);
    addQNA([/predictive analytics.*forecast (sales|demand)/i], 'Yes. Time‑series and ML models incorporate seasonality, promotions, and external factors. We present forecasts with confidence bands and back‑testing so you trust decisions.', D.analytics);
    addQNA([/big data.*(hadoop|spark)/i], 'We support Spark/Databricks and warehouses like BigQuery, Redshift, or Snowflake. We right‑size the stack so you pay for value, not overhead.', D.analytics);
    addQNA([/integrate data from multiple sources/i], 'We build ELT/ETL using APIs, connectors, files, and CDC. Common sources include CRM, ERP, web analytics, billing, and support systems — unified with clear data contracts.', D.analytics);
    addQNA([/real[- ]time analytics/i], 'Yes. Streaming pipelines with materialized views and event‑driven alerts support fast decisions where latency matters.', D.analytics);
    addQNA([/tools.*data visualization/i], 'We work with Power BI, Tableau, Looker Studio, Superset, or custom dashboards — picking the tool that fits your team and budget.', D.analytics);
    addQNA([/ensure data quality/i, /cleaning/i], 'We apply profiling, schema and constraint checks, deduplication, validation tests (e.g., dbt), and anomaly detection with lineage so quality issues are caught early.', D.analytics);
    addQNA([/custom reports.*kpi/i], 'Yes. We build custom, parameterized reports; schedule delivery to email/Slack with appropriate permissions.', D.analytics);
    addQNA([/training.*dashboards/i], 'We provide enablement sessions, quick guides, and a data dictionary so teams self‑serve with confidence.', D.analytics);
    addQNA([/secure sensitive.*data/i], 'Security includes SSO/RBAC, least‑privilege access, encryption, private networking, masking/tokenization where needed, and audit logs.', D.analytics);
    addQNA([/automate recurring reports/i], 'Yes. We automate recurring and event‑triggered reports with versioned definitions to ensure consistency over time.', D.analytics);
    addQNA([/how fast.*insights.*implemented/i], 'Quick‑win dashboards can ship in 1–2 weeks; broader models and process integration typically take 2–6+ weeks depending on scope.', D.analytics);
    addQNA([/benchmark.*competitors/i], 'We benchmark against prior periods and available industry ranges where appropriate, without using competitor secrets.', D.analytics);
    addQNA([/roi.*analytics/i], 'Expect measurable gains in efficiency (often 5–30%), better conversion/retention, and improved decision speed. We tie ROI to your KPIs and track it over time.', D.analytics);

    // ---------- Hybrid Cloud ----------
    addQNA([/difference between hybrid and multi[- ]cloud/i], 'Hybrid combines on‑prem with one cloud; multi‑cloud uses multiple public clouds. We implement either when there’s a clear benefit in resilience, compliance, or vendor fit.', D.cloud);
    addQNA([/connect my datacenter securely/i], 'We use IPSec VPN, Direct Connect/ExpressRoute, private endpoints, and zero‑trust access patterns to connect on‑prem to cloud securely.', D.cloud);
    addQNA([/which cloud providers do you work with/i], 'We are vendor‑neutral across AWS, Azure, and Google Cloud — we recommend the best fit for your stack, region, and cost profile.', D.cloud);
    addQNA([/support identity management across environments/i], 'Yes. We unify identity with SSO/MFA (Entra ID/Okta/ADFS) and apply consistent RBAC and least‑privilege across on‑prem and cloud.', D.cloud);
    addQNA([/decide workload placement/i], 'Placement is policy‑driven: latency, data gravity, compliance, and cost. Some services remain on‑prem; others move to cloud where they run best.', D.cloud);
    addQNA([/centralized monitoring.*both environments/i], 'We centralize logs, metrics, and traces with SIEM/SOAR integrations and SLO dashboards spanning on‑prem and cloud.', D.cloud);
    addQNA([/backups? and disaster recovery.*hybrid/i], 'We design tiered backups and cross‑site replication with tested failover runbooks and clear RTO/RPO targets.', D.cloud);
    addQNA([/guarantee low latency/i], 'We minimize latency via private links, edge caching, and smart placement. We set performance budgets and monitor continuously.', D.cloud);
    addQNA([/licensing and cost optimization/i], 'We evaluate license portability, leverage committed‑use or Savings Plans, apply tagging/chargeback, and right‑size workloads.', D.cloud);
    addQNA([/secure (vpn|direct connect|expressroute)/i], 'We use strong crypto suites, rotate keys, restrict routes with ACLs, and continuously check posture and drift.', D.cloud);
    addQNA([/what happens if (one side|cloud|on[- ]prem) goes down/i], 'We plan graceful degradation and failover to alternate sites/clouds, with runbooks and clear rollback criteria.', D.cloud);
    addQNA([/conditional access policies/i], 'Yes. We configure context‑aware policies for device posture, network location, and user risk.', D.cloud);
    addQNA([/runbooks for failover/i], 'We document procedures for failover/failback, incident comms, and service validation after recovery.', D.cloud);
    addQNA([/scalable.*hybrid cloud/i], 'Hybrid can scale horizontally by bursting to cloud while respecting on‑prem constraints. We design for elasticity where it matters.', D.cloud);
    addQNA([/industries benefit.*hybrid/i], 'Industries with data residency/latency needs — finance, industrial, public sector — often benefit most, but hybrid suits any firm with substantial on‑prem systems.', D.cloud);

    // ---------- IT Consulting ----------
    addQNA([/industries.*it consulting experience/i], 'We consult across technology, professional services, e‑commerce, and industrial, adapting methods to your domain.', D.consulting);
    addQNA([/align it strategy with business goals/i], 'We map strategy to KPIs and value streams, then build a roadmap with milestones, owners, and measurable outcomes.', D.consulting);
    addQNA([/infrastructure assessments onsite/i], 'Yes when needed; most discovery works well remotely with secure access and structured interviews.', D.consulting);
    addQNA([/recommend specific technologies or vendors/i], 'We provide vendor‑neutral recommendations with total‑cost, capability fit, and implementation risk comparisons.', D.consulting);
    addQNA([/ensure cloud adoption fits/i], 'We prepare landing zones and guardrails, phase migrations, train teams, and manage change so cloud adoption sticks.', D.consulting);
    addQNA([/cybersecurity audits.*consulting/i], 'We can include a security posture review as part of consulting or deliver it as a standalone assessment.', D.consulting);
    addQNA([/digital transformation roadmaps/i], 'Yes. We redesign processes, automate, modernize data platforms, and improve experiences with measurable milestones.', D.consulting);
    addQNA([/large enterprises|smes\??.*consult/i], 'Both — we right‑size governance and tools to your scale, budget, and risk tolerance.', D.consulting);
    addQNA([/process for developing an it strategy/i], 'Discovery → Baseline → Options & trade‑offs → Roadmap (timelines, owners, KPIs, risks) with regular reviews.', D.consulting);
    addQNA([/benchmark it performance/i], 'We benchmark cost, uptime, deployment frequency, and security posture to peers where data is available.', D.consulting);
    addQNA([/ensure compliance with industry standards/i], 'We apply policy templates, evidence automation, gap remediation, and auditor‑friendly documentation.', D.consulting);
    addQNA([/it cost optimization/i], 'We right‑size infra, audit licenses, consolidate vendors, and set usage guardrails with alerts and approvals.', D.consulting);
    addQNA([/train internal it teams/i], 'Yes. Workshops, runbooks, and co‑delivery so your team owns the solution sustainably.', D.consulting);
    addQNA([/how often.*it strategy.*reviewed/i], 'Quarterly at minimum; monthly for high‑change environments.', D.consulting);
    addQNA([/free consultation.*it consulting/i], 'Yes — we’ll clarify goals, constraints, and next steps in a brief call. Would you like to book now?', 'consultation');

    // ---------- Mobile App Development ----------
    addQNA([/build both native and cross[- ]platform/i], 'Yes. We build native (Swift/Kotlin) when deep device features or top‑tier performance are required, and React Native/Flutter for speed and shared code.', D.mobile);
    addQNA([/decide between ios and android first/i], 'We choose based on your audience and go‑to‑market. Often we target both with shared code unless there’s a clear priority.', D.mobile);
    addQNA([/integrate third[- ]party apis/i], 'Yes. Payments, maps, auth, chat, analytics, and business systems are routinely integrated with secure patterns.', D.mobile);
    addQNA([/ensure great ui\/ux/i, /ui.*ux.*design/i], 'Research, wireframes, prototypes, and design systems guide the build. We test usability and accessibility to ensure a smooth experience.', D.mobile);
    addQNA([/app store submission support/i], 'Yes. We handle signing, privacy labels, screenshots, and policy compliance for App Store and Play.', D.mobile);
    addQNA([/scale to millions of users/i], 'We architect stateless services with queues, caching, and observability; plan capacity and support phased rollouts.', D.mobile);
    addQNA([/app security and compliance/i], 'Secure auth, encrypted storage, certificate pinning, data minimization, and adherence to your compliance needs.', D.mobile);
    addQNA([/payment gateways in apps/i], 'We integrate region‑appropriate gateways and in‑app purchases where applicable, with proper compliance.', D.mobile);
    addQNA([/test apps for performance and bugs/i], 'Automated tests, device farms, performance profiling, and beta programs (TestFlight/Play tracks) de‑risk releases.', D.mobile);
    addQNA([/integrate push notifications/i], 'Yes. APNs/FCM with segmentation, preferences, and privacy‑aware messaging.', D.mobile);
    addQNA([/analytics inside apps/i], 'We add feature usage analytics, funnels, and crash reporting with privacy‑respecting telemetry.', D.mobile);
    addQNA([/how often.*apps be updated/i], 'Post‑launch, we schedule regular updates for fixes, performance, and features; phased rollouts reduce risk.', D.mobile);
    addQNA([/b2c and b2b apps/i], 'We build both B2C and B2B, including private enterprise distribution.', D.mobile);
    addQNA([/maintenance and upgrades/i], 'We provide maintenance via SLAs or retainers with monitoring and minor enhancements.', D.mobile);
    addQNA([/how long.*build an app/i], 'Simple apps take ~6–10 weeks; complex features, integrations, or compliance add time. We confirm after discovery.', D.mobile);

    // ---------- Newsletter Thank You ----------
    addQNA([/what kind of updates.*monthly/i], 'Expect practical IT/AI insights, case studies, and new features/services relevant to decision‑makers.', null);
    addQNA([/unsubscribe easily/i], 'Yes — every email includes a one‑click unsubscribe, and you can resubscribe anytime.', null);
    addQNA([/how often.*send emails/i], 'Typically monthly; we avoid inbox fatigue and only send high‑value updates.', null);
    addQNA([/share my email with third parties/i], 'No — we don’t sell or share your email. See our privacy policy for details.', null);
    addQNA([/include case studies/i], 'Yes — including outcomes and lessons learned when we have permission to share.', null);
    addQNA([/forward newsletters to teammates/i], 'Absolutely — feel free to share internally. Personal links may be individualized.', null);
    addQNA([/promotions or just insights/i], 'Mostly insights; occasional offers are clearly labeled.', null);
    addQNA([/customer success stories/i], 'Yes — we highlight success stories tied to measurable KPIs.', null);
    addQNA([/ensure no spam/i], 'We use consent‑based lists, clear preferences, and careful sending hygiene to avoid spam.', null);
    addQNA([/notify me about new services/i], 'Yes — we announce new services and major improvements via the newsletter.', null);
    addQNA([/early access to features/i], 'Select subscribers may receive early access or beta invites.', null);
    addQNA([/update my preferences/i], 'You can update preferences from the email footer or by contacting us.', null);
    addQNA([/multiple languages/i], 'Primary language is English; regionalization is possible on request.', null);
    addQNA([/industry trend reports/i], 'We share curated, practical trend summaries that inform decisions—no fluff.', null);
    addQNA([/accidentally unsubscribe/i], 'You can resubscribe anytime on our site, or reach out and we’ll help.', null);

    // ---------- Portfolio ----------
    addQNA([/minable scientific.*only project/i], 'Minable Scientific is a featured example, not the only work. We are curating more case studies — we can share a private deck with additional examples now.', 'portfolio');
    addQNA([/minable scientific.*how long/i], 'Projects of that scope typically complete in 3–6 weeks depending on content readiness and integrations. We confirm exact timelines after a short scoping call.', 'portfolio');
    addQNA([/minable scientific.*challenges/i], 'Common focus areas included clear content structure, fast load across devices, clean navigation, strong CTAs, SEO fundamentals, and accessibility — while aiming for high Lighthouse scores and a smooth handover.', 'portfolio');
    addQNA([/40% increase in user engagement/i], 'Engagement means more meaningful actions per visitor — higher CTA clicks (contact/consult), deeper scroll, more pages per session, and longer dwell times. We track these via analytics events and compare before/after launch periods.', 'portfolio');
    addQNA([/minable scientific.*technologies|frameworks.*react|vue/i], 'For lightweight marketing sites we often avoid heavy frameworks to keep speed high. When needs grow (dashboards or rich interactivity), we reach for the right tool — React/Vue/Svelte, Next.js/Astro — plus integrations like Maps, payments, or CMS.', 'portfolio');
    addQNA([/what industries are featured.*portfolio/i], 'Technology, services, e‑commerce, and industrial — with more being added. We can curate examples for your industry.', 'portfolio');
    addQNA([/view more detailed case studies/i], 'Yes. If not listed publicly, we can provide NDA‑safe summaries and demos on request.', 'portfolio');
    addQNA([/measure project success/i], 'We measure KPI deltas (conversion, speed, cost), qualitative feedback, and reliability. We report pre/post where baselines exist.', 'portfolio');
    addQNA([/technologies do you use most often/i], 'Modern web stacks, cloud services, and data/ML tooling — selected to fit your requirements and budget.', 'portfolio');
    addQNA([/before-and-after comparisons/i], 'Where we have baselines, we show before/after metrics and dashboards to demonstrate impact.', 'portfolio');
    addQNA([/contact past clients for references/i], 'Yes — with client permission, we’ll connect you for references.', 'portfolio');
    addQNA([/how recent are the featured projects/i], 'We prioritize recent and relevant work; timestamps are added where possible.', 'portfolio');
    addQNA([/roi metrics for projects/i], 'We include ROI when measurable and shareable; otherwise we describe qualitative impact.', 'portfolio');
    addQNA([/filter portfolio by industry or service/i], 'If filtering isn’t on the page yet, we can curate a tailored list for you.', 'portfolio');
    addQNA([/most complex project so far/i], 'Typically multi‑system integrations that span apps, data/AI, and security constraints. We can walk you through examples.', 'portfolio');
    addQNA([/showcase both small and enterprise/i], 'Yes — we include both when we have permission to publish.', 'portfolio');
    addQNA([/include failures or lessons learned/i], 'We share lessons learned and improvements where appropriate to help you plan realistically.', 'portfolio');
    addQNA([/how many projects.*annually/i], 'Volume depends on scope; we focus on fewer, higher‑impact engagements to ensure quality.', 'portfolio');
    addQNA([/replicate similar results.*my business/i], 'We reuse proven patterns and tailor them to your users, systems, and constraints to replicate success responsibly.', 'portfolio');
    addQNA([/how often.*portfolio updated/i], 'We update as new case studies clear approvals. Ask for a current deck anytime.', 'portfolio');

    // ---------- Project Start ----------
    addQNA([/what should i include in the project description/i], 'Share goals, target users, core features, success KPIs, constraints, and must‑haves vs nice‑to‑haves. Links to any assets help.', 'start');
    addQNA([/start without a finalized budget/i], 'Yes. A budget range is fine; we’ll propose phased options to match.', 'start');
    addQNA([/how flexible is the budget range/i], 'We can structure scope and phases to fit your range and timeline while protecting quality.', 'start');
    addQNA([/payment plans.*above.*(20k|20000)/i], 'For larger projects we typically use milestone‑based payments and can structure plans accordingly.', 'start');
    addQNA([/submit multiple project ideas/i], 'Yes — submit multiple ideas and we’ll help prioritize an initial scope.', 'start');
    addQNA([/how long after submitting.*contact/i], 'We usually respond within 1–2 business days to confirm details and next steps.', 'start');
    addQNA([/who reviews the project brief/i], 'A lead in the relevant area (web/mobile/AI/cloud/security) plus a project manager reviews your brief.', 'start');
    addQNA([/edit my submission after sending/i], 'If the form can’t update, just email the changes — we’ll incorporate them before scoping.', 'start');
    addQNA([/sign nda(s)? before reviewing/i], 'Yes — we can sign a mutual NDA before deeper detail sharing.', 'start');
    addQNA([/industries do you specialize in for projects/i], 'We work across many industries; tell us your domain and we’ll share relevant examples.', 'start');
    addQNA([/accept international projects/i], 'Yes — we collaborate globally with remote‑friendly delivery.', 'start');
    addQNA([/prioritize high vs low priority submissions/i], 'We weigh impact/effort, urgency, and strategic fit; urgent issues can be escalated.', 'start');
    addQNA([/attach supporting documents/i], 'Yes — specs, mockups, or datasets accelerate accurate estimation.', 'start');
    addQNA([/average project delivery timeline/i], 'Simple sites: 2–6 weeks. Apps/AI/cloud efforts: 6–16+ weeks depending on complexity.', 'start');
    addQNA([/proposal after reviewing my form/i], 'Yes — you’ll receive a written proposal with scope, timeline, and pricing.', 'start');

    // ---------- Website Development ----------
    addQNA([/build websites from scratch or use templates/i], 'Both. We deliver custom builds when uniqueness matters and use tailored templates to accelerate delivery where appropriate.', D.website);
    addQNA([/mobile[- ]friendly and responsive/i], 'Yes — responsive layouts, accessible components, and performance budgets are baked in.', D.website);
    addQNA([/integrate e-?commerce/i], 'We can add carts/checkout and region‑appropriate payment gateways.', D.website);
    addQNA([/seo optimization.*out of the box/i], 'We include technical SEO (metadata, sitemaps, semantics, performance) and offer advanced SEO packages as add‑ons.', D.website);
    addQNA([/custom design unique to my brand/i], 'Yes — we create a design system and components aligned to your brand.', D.website);
    addQNA([/integrate social media feeds/i], 'Yes — we embed feeds with attention to performance and privacy.', D.website);
    addQNA([/how secure are your websites/i], 'HTTPS, hardened headers, input validation, content security policy, and regular dependency updates are standard.', D.website);
    addQNA([/provide hosting or should i arrange/i], 'We offer managed hosting or can hand over to your provider with guidance.', D.website);
    addQNA([/set up google analytics/i], 'Yes — we can add GA4 and event tracking for meaningful actions.', D.website);
    addQNA([/how long .* develop a website/i], 'Marketing sites often take 2–6 weeks; larger custom builds take longer. We confirm after discovery.', D.website);
    addQNA([/maintenance after launch/i], 'We offer SLAs for updates, backups, and monitoring.', D.website);
    addQNA([/integrate multilingual support/i], 'Yes — we structure content and hreflang properly for multi‑language sites.', D.website);
    addQNA([/handle content creation/i], 'We can assist with copywriting and content workflows or collaborate with your team.', D.website);
    addQNA([/websites for ngos|small businesses/i], 'Yes — we have packages suited to NGOs and small businesses.', D.website);
    addQNA([/country[- ]specific quote|sa vs zimbabwe|south africa|zimbabwe|zambia|botswana/i], 'Yes — we support region‑specific quotes and payment options. I can open the best quote page for your region.', D.website);

    // ---------- Website Quote Calculator ----------
    addQNA([/choose the right package/i], 'Start from your goals and must‑have features; the calculator shows options and live totals so you can compare trade‑offs easily.', D.website);
    addQNA([/what'?s included in the starter package/i], 'Core pages, responsive build, and essentials — you can add features as needed.', D.website);
    addQNA([/how many pages.*each package/i], 'Each tier allocates a page count; the calculator updates your current total as you add items.', D.website);
    addQNA([/difference between standard and pro/i], 'Pro adds advanced integrations/features and more pages; see the calculator for specifics.', D.website);
    addQNA([/upgrade my package later/i], 'Yes — you can upgrade later; we’ll confirm the delta cost and timeline.', D.website);
    addQNA([/how much does each add-on cost/i], 'Add‑on costs are listed in the calculator; your emailed quote will confirm totals.', D.website);
    addQNA([/need seo optimization as an add-on/i], 'Advanced SEO is optional — it covers structured data, content support, and authority building beyond technical basics.', D.website);
    addQNA([/integrate (paynow|payment gateways)/i], 'Yes — we support Paynow and other region‑appropriate gateways.', D.website);
    addQNA([/whatsapp chat integration/i], 'Adds a floating/inline chat button so visitors can message your business directly.', D.website);
    addQNA([/add google maps to my site/i], 'We can embed Google Maps with markers and directions.', D.website);
    addQNA([/android app.*webview/i], 'We can package the site as an Android WebView app and help with store submission if needed.', D.website);
    addQNA([/hosting handled after the free period/i], 'We can provide managed hosting plans after the free period or hand over cleanly to your provider.', D.website);
    addQNA([/download my quote as a pdf/i], 'If a download option isn’t visible, we can email you a PDF on request.', D.website);
    addQNA([/send my quote directly via whatsapp/i], 'Use the WhatsApp share if available, or we can send a summary to your number.', D.website);
    addQNA([/what happens after i submit my quote by email/i], 'You receive a confirmation copy; we review and respond within one business day to refine scope and next steps.', D.website);

    // ---------- Salesforce (ecosystem coverage) ----------
    addQNA([/salesforce/i, /(apex|lwc|lightning|cpq|sales cloud|service cloud|experience cloud|marketing cloud|einstein|salesforce flow)/i], 'We cover the full Salesforce ecosystem: Sales/Service/Experience Clouds, Marketing Cloud, CPQ, custom Apex/LWC, data migrations, and robust integrations. We handle implementation, optimization, governance, and ongoing admin/dev support.', D.crm);

    // ---------- About (Company & Mission) ----------
    addQNA([/what is kypextech\??/i], 'KypexTech is a modern IT solutions studio delivering websites and apps, AI assistants and analytics, secure cloud architectures, and cybersecurity — focused on practical, measurable business outcomes.', 'about');
    addQNA([/what does your company do\??/i], 'We design, build, and support digital products and platforms; implement production‑grade AI; secure and migrate cloud; and advise on IT strategy — with delivery tied to your KPIs.', 'about');
    addQNA([/how do you help businesses grow\??/i], 'We improve lead capture and conversion with fast, clear experiences; automate workflows and integrate systems to save time; strengthen trust with security; and unlock insight through analytics.', 'about');
    addQNA([/who is muwomogroup/i, /larger company/i], 'KypexTech is a subsidiary of MuwomoGroup. The group provides strategic backing; we focus on engineering and delivery for clients.', 'about');
    addQNA([/how can i find you on social media/i, /social media/i], 'We’ll share official social links in the footer. In the meantime, contact hello@kypextech.co.za or WhatsApp +27 60 502 3284 and we’ll send direct profiles.', 'contact');
    addQNA([/how experienced is your team/i], 'Our team has hands‑on delivery across modern web/app stacks, AI/ML workflows, cloud architectures, and security — with a track record in performance, reliability, and maintainability.', 'about');
    addQNA([/what makes your company unique|why should i choose you/i], 'Outcome‑first delivery, safety‑by‑default engineering, and right‑sized solutions. We align to KPIs, avoid lock‑in, and move fast without sacrificing quality.', 'about');
    addQNA([/trust you with sensitive business data/i], 'Yes — we apply least‑privilege access, encrypt data in transit/at rest, manage secrets properly, and keep clear audit trails with time‑bounded access.', 'about');
    addQNA([/what does your name .*kypextech.* stand for/i], 'It reflects a focus on modern, high‑impact technology execution — practical engineering that compounds value for clients.', 'about');
    addQNA([/operate globally|specific regions/i], 'We deliver globally with a strong base in Southern Africa. Remote collaboration and cloud tooling keep projects smooth across time zones.', 'about');
    addQNA([/partnerships or certifications/i], 'We work across major cloud providers and industry tooling; team members hold relevant cloud/security certifications and complete ongoing training. We can share specifics on request.', 'about');
    addQNA([/values.*innovation.*transparency/i], 'We publish clear scopes, timelines, and costs; share progress via demos and async updates; and measure outcomes against KPIs with post‑launch retros.', 'about');
    addQNA([/startups.*large enterprises/i], 'Yes — we adapt scope and cadence to fit. Startups engage for rapid MVPs; larger firms value governance and staged releases.', 'about');
    addQNA([/meet|speak.*leadership team/i], 'Absolutely — book a consultation and we’ll include the relevant leaders for your topic.', 'consultation');
    addQNA([/ongoing support after delivering/i], 'Yes — we offer retainers, SLAs for support, and iterative roadmaps for continuous improvement.', 'about');
    addQNA([/long[- ]term vision/i], 'Deliver practical, trustworthy technology that compounds value: engineering excellence, AI enablement, and strong cloud/security foundations.', 'about');
    addQNA([/choose .* over a bigger.* vendor/i], 'You get senior attention, faster iteration, and fit‑for‑purpose solutions without unnecessary overhead — with full transparency and accountability.', 'about');

    // ---------- Services (General) ----------
    addQNA([/what specific it solutions do you provide/i], 'Our core services: Website development, Mobile app development, Cybersecurity, Cloud services, IT consulting, Data analytics, and AI Solutioning. I can open the services you care about most.', 'cloud');
    addQNA([/what kind of ai services do you offer/i], 'We deliver assistants/chatbots, RAG knowledge systems, NLP (classification, summarization, extraction), predictive models, computer vision/OCR, and MLOps for reliable operations.', 'ai');
    addQNA([/difference between your website and mobile app development/i], 'Websites run in browsers and are fast, SEO‑ready, and easy to update. Mobile apps ship to iOS/Android, access native capabilities (push, offline, sensors), and fit deeper device use. We help you choose based on goals and audience.', 'website');
    addQNA([/can you help me with cybersecurity/i], 'Yes — we harden identity, endpoints, networks, cloud configs, and data protections. Start with a free assessment and we’ll prioritize quick wins.', 'assessment');
    addQNA([/what are your cloud services.*handle cloud migration/i], 'We cover security guardrails, optimization, migration, hybrid connectivity, storage, and CRM solutions — vendor‑neutral across AWS/Azure/GCP.', 'cloud');
    addQNA([/what does it consulting involve/i], 'Strategy and roadmaps aligned to your KPIs; architecture, vendor selection, cost optimization, risk reduction, and hands‑on execution support.', 'consultation');
    addQNA([/how can data analytics help my business/i], 'Dashboards and models that reveal opportunities, reduce waste, and accelerate decisions — tied to KPIs like conversion, cycle time, and retention.', 'analytics');
    addQNA([/what specific technologies or platforms.*website or mobile/i], 'Modern HTML/CSS/JS for the web, optional frameworks (React/Vue/Svelte, Next/Astro), and mobile via React Native/Flutter or native Swift/Kotlin. Integrations include payments, WhatsApp, Maps, auth, and CRM.', 'website');
    addQNA([/what is (genai|rag|nlp|mlops|computer vision)/i], 'GenAI: models that generate text/images/code. RAG: LLM answers grounded in your content with citations. NLP: understand/transform text (classify, summarize, extract). MLOps: reliable delivery lifecycle for ML. Computer Vision: understand images/video (OCR, detection, QA).', 'ai');

    // ---------- Process & Engagement (General) ----------
    addQNA([/how do i get started with a project/i], 'Book a free consultation or start from the Project Start form. We’ll clarify goals, timeline, and budget, then propose next steps.', 'consultation');
    addQNA([/is your consultation truly free/i], 'Yes — no obligation. We use it to align on goals and outline options.', 'consultation');
    addQNA([/how do i book a consultation/i], 'Use the Free Consultation page to pick a time, or email/WhatsApp us and we’ll schedule.', 'consultation');
    addQNA([/what does a security assessment entail.*free/i], 'A structured review of identity, endpoints, network, data, and cloud configurations with a prioritized plan. The initial assessment is free.', 'assessment');
    addQNA([/process for working with clients/i], 'Discovery and scoping → Proposal and timeline → Kickoff and design → Build and integrations → Testing and hardening → Launch and handover → Support and iteration.', 'consultation');
    addQNA([/typical project timelines/i], 'Websites 2–6 weeks; mobile apps 6–16+ weeks; AI pilots/POCs 2–8 weeks; cloud migrations 2–12 weeks. We’ll confirm after discovery.', null);
    addQNA([/how much do your services cost|pricing models/i], 'We offer fixed‑price packages, custom fixed bids, time‑and‑materials for open‑ended work, and retainers. Region pages and the quote calculator help estimate websites.', 'website');
    addQNA([/how can i see examples of your previous work/i], 'Open the portfolio page for featured work; we can share additional case studies privately if needed.', 'portfolio');

    // ---------- General & Administrative ----------
    addQNA([/how can i contact your business/i], 'Email hello@kypextech.co.za, WhatsApp +27 60 502 3284, or use the contact form. We typically respond within one business day.', 'contact');
    addQNA([/what information do you need from me to get started/i], 'Objectives and KPIs, audience and user journeys, scope/features, content readiness, required integrations, platform/cloud preferences, security/compliance needs, timeline, budget range, and stakeholders.', 'contact');
    addQNA([/what happens after i submit (a )?(contact|newsletter) form/i], 'You’ll see a confirmation/redirect, we’ll receive your submission, and we reply within one business day to confirm details and next steps.', 'contact');
    addQNA([/what kind of content.*newsletter.*how often/i], 'Practical IT/AI tips, case studies, and service updates — typically monthly. No spam; you can change preferences anytime.', null);

    // ---------- Free Security Assessment ----------
    addQNA([/assessment.*really free/i, /hidden costs.*assessment/i], 'Yes — the initial assessment is free with no hidden costs. Remediation work is optional and scoped separately.', 'assessment');
    addQNA([/how long.*get results.*assessment/i], 'Most small/medium environments take 3–5 business days from kickoff to report. We confirm timelines upfront.', 'assessment');
    addQNA([/affect my current systems|cause downtime/i], 'No — the assessment is non‑disruptive. Any active tests are coordinated and scheduled to avoid impact.', 'assessment');
    addQNA([/types of vulnerabilities.*find/i], 'Common issues include weak IAM (over‑privileged roles), unpatched endpoints, exposed services, misconfigured cloud resources, and lax data protections. We prioritize findings by business risk.', 'assessment');
    addQNA([/qualifications.*assessors/i, /certifications.*assessors/i], 'Security‑trained engineers with practical cloud/IAM experience and relevant certifications conduct the assessment. Profiles available on request.', 'assessment');
    addQNA([/tailored.*small businesses|enterprises/i], 'Yes — we tailor scope and depth to your size, risk profile, and compliance needs.', 'assessment');
    addQNA([/how detailed.*final report/i], 'You receive prioritized findings with evidence, impact, and actionable remediation steps — quick wins and a roadmap.', 'assessment');
    addQNA([/recommend specific security tools/i], 'We provide vendor‑neutral advice and can recommend tools where they add value, with pros/cons and costs.', 'assessment');
    addQNA([/cover compliance.*gdpr|popia/i], 'Yes — we map findings to GDPR/POPIA obligations and propose controls to align.', 'assessment');
    addQNA([/implement recommendations/i], 'Many quick wins can be actioned immediately. We can assist with fixes and verify improvements.', 'assessment');
    addQNA([/support to fix issues/i], 'Yes — we can implement remediations, train your team, or work alongside your providers.', 'assessment');
    addQNA([/safe for sensitive data/i], 'We minimize data access, prefer read‑only permissions, and retain only what’s necessary for the report.', 'assessment');
    addQNA([/compare.*industry standards/i], 'We align to best practices (e.g., CIS, NIST concepts) and provide benchmarking where useful.', 'assessment');
    addQNA([/what happens after the assessment/i], 'We review the report with you, prioritize actions, and define a remediation plan with owners and timelines.', 'assessment');

    // ---------- Cloud CRM Solutions ----------
    addQNA([/which crm platforms.*(salesforce|hubspot|zoho)/i], 'We work across Salesforce, HubSpot, and Zoho — selecting by fit, budget, and timeline. We remain vendor‑neutral.', D.cloud);
    addQNA([/migrate data from (spreadsheets|older systems)/i], 'Yes — we cleanse, deduplicate, map fields, run test migrations, reconcile counts, and cut over with backups and validation.', D.cloud);
    addQNA([/ensure no data is lost/i], 'Backups, staged test runs, validation reports, stakeholder sign‑off, and rollback plans protect your data.', D.cloud);
    addQNA([/integrate (whatsapp|email) tools/i], 'Yes — WhatsApp, email, calendars, and chat tools integrated with consent and compliance in mind.', D.cloud);
    addQNA([/workflow automation/i], 'We configure lead routing, scoring, approvals, reminders, and SLA timers tailored to your processes.', D.cloud);
    addQNA([/dashboards.*sales kpis|forecasts/i], 'Yes — role‑based dashboards for pipeline, velocity, conversion, and forecast accuracy.', D.cloud);
    addQNA([/train my sales team/i], 'We provide training, quick‑reference guides, and admin handover so teams adopt smoothly.', D.cloud);
    addQNA([/ongoing support after implementation/i], 'Yes — admin retainers, enhancement sprints, and periodic health checks.', D.cloud);
    addQNA([/(secure|security).*crm data/i], 'SSO/MFA, role‑based permissions, field‑level security, encryption, audit logs, and retention policies.', D.cloud);
    addQNA([/how long.*crm implementation/i], 'Typically 2–8 weeks depending on integrations, data cleanup, and customization.', D.cloud);
    addQNA([/implementation vs integration/i], 'Implementation sets up CRM core; integration connects other systems (billing, support, website) for reliable data flow.', D.cloud);
    addQNA([/customize the crm for my industry/i], 'Yes — custom objects, fields, automations, and layouts matched to your workflows.', D.cloud);
    addQNA([/handle duplicate or dirty data/i], 'Data profiling, dedupe rules, survivorship logic, and stakeholder‑approved merges keep records clean.', D.cloud);
    addQNA([/integrate with billing|accounting systems/i], 'Yes — we integrate with billing and accounting tools for quotes, invoicing, and revenue recognition.', D.cloud);
    addQNA([/roi.*new crm/i], 'Typical ROI includes higher conversion, better forecast accuracy, faster onboarding, and improved retention — tracked via KPIs.', D.cloud);

    // ---------- Cloud Migration ----------
    addQNA([/which cloud providers.*(aws|azure|gcp)/i], 'We are vendor‑neutral and deliver on AWS, Azure, and GCP. We recommend based on fit for your stack, region, services, and cost model.', D.cloud);
    addQNA([/minimize downtime during migration/i], 'We use staged cutovers, blue‑green/canary releases, database replication, DNS TTL tuning, and maintenance windows with rollback plans.', D.cloud);
    addQNA([/migration strategies.*(rehost|replatform|refactor)/i], 'We choose per workload: rehost for quick wins, replatform for performance/cost gains, refactor for long‑term agility — guided by business value.', D.cloud);
    addQNA([/identify which apps are ready/i], 'A readiness assessment covers dependencies, latency, data gravity, and compliance. We model TCO and prepare a migration wave plan.', D.cloud);
    addQNA([/data.*secure during transfer/i], 'Encrypted transport, private links where available, least‑privilege access, and proper secrets management protect data in motion.', D.cloud);
    addQNA([/what's included in your migration plan/i], 'Architecture, sequencing, sizing, security controls, testing, runbooks, and success metrics with clear owners.', D.cloud);
    addQNA([/readiness assessment first/i], 'Yes — it reduces risk and clarifies costs/timelines before execution.', D.cloud);
    addQNA([/rollback if migration fails/i], 'We keep pre‑cutover backups/snapshots and automated rollback runbooks with clear stop/fix criteria.', D.cloud);
    addQNA([/how long does migration typically take/i], 'From 2–12 weeks depending on complexity, data volumes, and risk appetite.', D.cloud);
    addQNA([/post[- ]migration support/i], 'Yes — hardening, cost optimization, monitoring, and knowledge transfer are included options.', D.cloud);
    addQNA([/how much does a migration.*cost/i], 'Costs vary with scope; after discovery we provide a transparent estimate with options for phased delivery.', D.cloud);
    addQNA([/migrate hybrid setups/i], 'Yes — we design secure connectivity, identity integration, and shared monitoring across on‑prem and cloud.', D.cloud);
    addQNA([/training.*after migration/i], 'We deliver admin and ops runbooks with hands‑on sessions and escalation paths.', D.cloud);
    addQNA([/apps run faster in the cloud/i], 'Often, with the right sizing, caching, and network design. We validate performance pre/post cutover.', D.cloud);
    addQNA([/ensure regulatory compliance during migration/i], 'We plan data residency, encryption, access controls, logging/audit, and change approvals aligned to obligations.', D.cloud);

    // ---------- Cloud Optimization ----------
    addQNA([/identify wasted cloud spend/i], 'We detect idle resources, unattached volumes, mis‑tiered storage, over‑provisioned databases, and inefficient data transfer patterns.', D.cloud);
    addQNA([/savings.*achieved through optimization/i], 'Results vary, but 10–35% cost reductions are common with governance and right‑sizing.', D.cloud);
    addQNA([/support multi[- ]cloud.*optimization/i], 'Yes — we unify tagging/chargeback, cost views, and policy guardrails across providers.', D.cloud);
    addQNA([/optimize hybrid environments too/i], 'Yes — we tune connectivity, data placement, and workload routing between on‑prem and cloud.', D.cloud);
    addQNA([/tune performance without sacrificing reliability/i], 'We apply autoscaling, caching/CDN, latency‑aware routing, and SLO‑driven tuning with error budgets.', D.cloud);
    addQNA([/ensure my apps keep running while optimizing/i], 'We stage changes, use canaries/flags, and monitor closely so availability remains within SLOs.', D.cloud);
    addQNA([/cost alerts and guardrails/i], 'Yes — budgets, anomaly alerts, required tags, policies, and approval workflows keep spend under control.', D.cloud);
    addQNA([/autoscaling strategies/i], 'Horizontal/vertical scaling, predictive and scheduled scaling, and queue‑based decoupling as appropriate.', D.cloud);
    addQNA([/optimize storage tiers/i], 'Lifecycle policies move data across hot/warm/cold tiers automatically to balance cost and retrieval speed.', D.cloud);
    addQNA([/monitor optimization results/i], 'Dashboards for cost/perf KPIs with weekly/monthly reviews and a continuous improvement backlog.', D.cloud);
    addQNA([/reports showing savings/i], 'Yes — baseline vs current with breakdowns by service, tag, and project.', D.cloud);
    addQNA([/optimize both compute and storage/i], 'Yes — and also databases, networking, observability pipelines, and serverless functions.', D.cloud);
    addQNA([/integrate with my .* monitoring dashboards/i], 'Yes — we plug into your existing tools and standardize metrics and tags.', D.cloud);
    addQNA([/provider discounts.*reserved instances|savings plans/i], 'We model commitments such as RIs/Savings Plans and vendor programs to fit your usage profile.', D.cloud);
    addQNA([/fastest results/i], 'Rightsizing, shutting down idle workloads, storage tiering, and CDN/caching provide fast wins.', D.cloud);
    addQNA([/how often.*optimization.*repeated/i], 'Quarterly at minimum; monthly for fast‑growing or cost‑sensitive environments.', D.cloud);

    // ---------- Cloud Security ----------
    addQNA([/ensure compliance.*(gdpr|popia|iso)/i], 'We map controls to requirements (data minimization, consent, encryption, logging), align policies/runbooks, and prepare audit‑ready evidence.', D.security);
    addQNA([/24\/7|continuous monitoring/i], 'We offer continuous monitoring and, where needed, partner SOC coverage with defined alerting and incident procedures.', D.security);
    addQNA([/manage iam.*large teams/i], 'Central identity with SSO/MFA, least‑privilege RBAC, just‑in‑time access, and regular access reviews.', D.security);
    addQNA([/tools.*vulnerability scanning/i], 'We use industry‑standard scanners and CSPM tooling; depth and cadence match your risk profile.', D.security);
    addQNA([/integrate.*security solutions.*existing it environment/i], 'Yes — we integrate with your platforms and workflows, minimizing disruption.', D.security);

    // ---------- Cloud Services Overview ----------
    addQNA([/which service should i start with/i], 'Begin with a short discovery. Most clients start with Security guardrails, then Optimization or Migration, with CRM or Storage as needed.', D.cloud);
    addQNA([/migration before security|security before migration/i], 'Establish baseline security first, then migrate or optimize with guardrails in place.', D.cloud);
    addQNA([/decide between (aws|azure|google)/i], 'We assess your stack, residency, team skills, and service fit, then provide a vendor‑neutral recommendation with cost/perf trade‑offs.', D.cloud);
    addQNA([/mix and match services/i], 'Yes — services are modular. We can deliver Security + CRM, and add Optimization later.', D.cloud);
    addQNA([/recommend hybrid cloud.*(smes|enterprises)/i], 'Hybrid is useful for SMEs and enterprises when data or systems remain on‑prem; we design secure connectivity and ops.', D.cloud);
    addQNA([/what makes your cloud services different/i], 'KPI‑driven, security‑first, and right‑sized. We focus on impact, not complexity for its own sake.', D.cloud);
    addQNA([/end-to-end cloud strategy/i], 'Yes — architecture, ops, cost, security, and enablement roadmaps with milestones and owners.', D.cloud);
    addQNA([/ensure scalability/i], 'Autoscaling, stateless patterns, queues, CDNs, and observability with capacity alerts ensure scale.', D.cloud);
    addQNA([/industries benefit most/i], 'Any team needing faster delivery, better reliability, or lower cost — from startups to established enterprises.', D.cloud);
    addQNA([/integrate cloud services with my crm/i], 'Yes — we connect cloud apps/resources to your CRM, marketing, and billing tools securely.', D.cloud);
    addQNA([/ongoing maintenance/i], 'Yes — SLAs, patching, guardrail checks, and periodic reviews keep you steady.', D.cloud);
    addQNA([/cost of starting.*cloud services/i], 'We provide a transparent estimate after discovery with phased entry options.', D.cloud);
    addQNA([/free consultations.*cloud/i], 'Yes — shall I open the consultation page?', 'consultation');
    addQNA([/migrate my existing apps and data/i], 'Yes — see our Cloud Migration approach for details.', D.cloud);
    addQNA([/performance monitoring across all services/i], 'Yes — unified dashboards and alerts across infra, apps, and data.', D.cloud);

    // ---------- Cloud Storage ----------
    addQNA([/difference between object, block, and file storage/i], 'Object is highly scalable for unstructured data; block is low‑latency for databases/VMs; file offers shared POSIX/SMB access. We often combine tiers by workload.', D.cloud);
    addQNA([/which option is best for my business/i], 'It depends on workload and access patterns; we’ll choose a mix that balances cost, performance, and durability.', D.cloud);
    addQNA([/encryption at rest and in transit/i], 'Yes — provider encryption defaults and TLS; customer‑managed keys where needed.', D.cloud);
    addQNA([/back up across multiple regions/i], 'Yes — cross‑region backups/replication with RPO/RTO targets defined per data class.', D.cloud);
    addQNA([/lifecycle policies save money/i], 'Lifecycle moves older data to cheaper tiers automatically — balancing cost with retrieval speed.', D.cloud);
    addQNA([/compliance.*worm/i], 'We can configure object‑lock/WORM‑like controls where supported for immutable retention.', D.cloud);
    addQNA([/backup and disaster recovery strategy/i], 'Tiered backups, periodic restores, DR drills, and clear failover steps — documented and tested.', D.cloud);
    addQNA([/scale storage up or down/i], 'Cloud storage scales elastically; we apply quotas/alerts to prevent surprises.', D.cloud);
    addQNA([/prevent unauthorized access/i], 'IAM roles/policies, private networking, bucket policies, and key rotation with least‑privilege access.', D.cloud);
    addQNA([/high[- ]performance workloads/i], 'Yes — provisioned IOPS for block/file, caching/CDNs, and parallelism patterns.', D.cloud);
    addQNA([/integrate storage with my existing apps/i], 'Yes — SDKs/APIs and gateways with secure credential handling and retries.', D.cloud);
    addQNA([/if my data grows quickly/i], 'We monitor growth, adjust tiers, and plan budgets/limits with anomaly alerts.', D.cloud);
    addQNA([/monitoring and reporting tools/i], 'Yes — dashboards for usage, costs, and access patterns plus anomaly detection.', D.cloud);
    addQNA([/how durable is the storage solution/i], 'Providers offer very high durability targets (e.g., 11 nines for object) and availability SLAs; we align to your needs.', D.cloud);
    addQNA([/data retention policies/i], 'Tagged data classes drive retention/lifecycle rules with documented exceptions.', D.cloud);

    // ---------- Consultation ----------
    addQNA([/consultation.*really free/i], 'Yes — free and no obligation. The session clarifies goals and options.', 'consultation');
    addQNA([/how long does the session last/i], 'Usually 20–30 minutes; we can schedule longer deep‑dives as needed.', 'consultation');
    addQNA([/schedule outside of business hours/i], 'Yes — subject to availability. We provide flexible slots across time zones.', 'consultation');
    addQNA([/what should i prepare/i], 'Objectives, success metrics, constraints, stakeholders, and any relevant links/docs help us help you faster.', 'consultation');
    addQNA([/receive a written proposal/i], 'Yes — for scoped work we send a proposal with deliverables, timeline, pricing, and assumptions.', 'consultation');
    addQNA([/ongoing support after the initial consultation/i], 'Yes — we offer Q&A, refined proposals, proofs‑of‑concept, and retainers.', 'consultation');
    addQNA([/virtual consultation/i], 'Yes — we can meet via your preferred video platform.', 'consultation');
    addQNA([/industries.*consult/i], 'Technology, services, e‑commerce, and industrial — and we adapt to other domains.', 'consultation');
    addQNA([/how soon after booking.*meet/i], 'Typically within 1–3 business days.', 'consultation');
    addQNA([/group consultations/i], 'Yes — invite stakeholders so decisions are faster and better informed.', 'consultation');
    addQNA([/reschedule/i], 'Of course — we’ll find a better time.', 'consultation');
    addQNA([/speak directly with a subject[- ]matter expert/i], 'Yes — we include the right lead for your topic (AI, cloud, security, web/app).', 'consultation');
    addQNA([/obligation to buy/i], 'No obligation — the goal is clarity and a useful plan.', 'consultation');
    addQNA([/define an action plan during the session/i], 'Yes — you’ll leave with recommended next steps and a proposed path.', 'consultation');

    // ---------- Cybersecurity ----------
    addQNA([/industries.*cybersecurity experience/i], 'We secure SMEs and mid‑market organizations across tech, services, and regulated segments. Controls are tailored to your environment and risk.', D.security);
    addQNA([/how often.*penetration testing/i], 'At least annually and after major changes or incidents; more often for high‑risk systems.', D.security);
    addQNA([/endpoint protection.*remote workers/i], 'Yes — device hardening/EDR, SSO/MFA, conditional access, encrypted VPN or zero‑trust access, and training.', D.security);
    addQNA([/integrate.*threat monitoring.*siem/i], 'Yes — we integrate detections and logs into your SIEM with useful dashboards and alerts.', D.security);
    addQNA([/balance usability and strong security/i], 'We use role‑based access, conditional policies, friction‑reducing controls (SSO, passwordless/MFA), and phased rollouts to keep teams productive and safe.', D.security);
    addQNA([/protect against ransomware/i], 'We enforce least‑privilege access, MFA everywhere, rapid patching, network segmentation, immutable/cross‑region backups, and user awareness — plus tested recovery drills.', D.security);
    addQNA([/penetration testing services/i], 'We coordinate pentests with trusted partners or your vendor and prepare/remediate findings with you.', D.security);
    addQNA([/monitor threats 24\/?7/i], 'We provide continuous monitoring options and can integrate with a 24/7 SOC as required.', D.security);
    addQNA([/compliance frameworks.*(gdpr|iso|popia)/i], 'We align policies, controls, and evidence with GDPR/POPIA/ISO27001 and help you prepare for audits.', D.security);
    addQNA([/secure my cloud and on[- ]prem systems together/i], 'Yes — unified identity, centralized logging, and network segmentation across cloud and on‑prem keep posture consistent.', D.security);
    addQNA([/tools or platforms.*monitoring/i], 'We integrate cloud‑native and third‑party SIEM/EDR tools; detections and dashboards are tuned to reduce noise.', D.security);
    addQNA([/endpoint protection for mobile devices/i], 'Yes — MDM/MAM for mobile endpoints with policy enforcement, encryption, and remote wipe if needed.', D.security);
    addQNA([/what'?s included in a vulnerability report/i], 'Severity and exploitability, evidence, business impact, and prioritized remediation with SLAs.', D.security);
    addQNA([/training for employees.*cybersecurity/i], 'Yes — role‑specific training and phishing simulations help reduce human‑factor risk.', D.security);
    addQNA([/incident response/i], 'We define incident runbooks, triage and containment steps, recovery procedures, and post‑incident improvements.', D.security);
    addQNA([/integrate security.*devops pipeline/i], 'We add SAST/DAST, secrets scanning, dependency checks, and IaC policies with gated releases.', D.security);
    addQNA([/difference between your cybersecurity and cloud security/i], 'Cybersecurity covers your broader posture (identity, endpoints, network, process). Cloud security focuses on cloud provider configurations, workloads, and data controls.', D.security);
  }

  function answerQnA(text){
    try{
      if (!text) return null; var s=String(text).trim(); if (!s) return null;
      if (!QNA_READY) initQNA();
      for (var i=0;i<QNA.length;i++){
        var item = QNA[i];
        for (var j=0;j<item.patterns.length;j++){
          var rx = item.patterns[j];
          try{ if (rx.test(s)){ if (item.route){ lastSuggestion = {type:'page', route:item.route}; return item.answer + ' Would you like me to open the relevant page? Say "yes" to proceed.'; } return item.answer; } }catch(_){ }
        }
      }
      return null;
    }catch(_){ return null; }
  }

  function isHomePage(){
    try{
      var path = (location.pathname||'').toLowerCase();
      if (!path || path==='/' || path==='\\') return true;
      return path.indexOf('index.html')>=0;
    }catch(_){ return false; }
  }
  function isLikelyQuestion(text){
    try{
      var t = String(text||'').trim();
      if (!t) return false;
      if (/\?$/.test(t)) return true;
      return /^(who|what|where|when|why|how|does|do|can|is|are|should|which)\b/i.test(t);
    }catch(_){ return false; }
  }

  var PAGE_ALIASES = {
    home:['home page','homepage','home'],
    ai:['ai page','ai solutioning page','ai solutioning','ai solutions page'],
    website:['website development page','web development page','web dev page','website page'],
    mobile:['mobile app page','mobile apps page','mobile development page'],
    cybersecurity:['cybersecurity page','security page','cyber page'],
    cloud:['cloud services page','cloud page'],
    cloudMigration:['cloud migration page','cloud-migration page','migration page'],
    cloudSecurity:['cloud security page','cloud-security page','cloud sec page'],
    cloudOptimization:['cloud optimization page','cloud-optimization page','optimization page'],
    hybridCloud:['hybrid cloud page','hybrid-cloud page'],
    cloudStorage:['cloud storage page','cloud-storage page','storage page'],
    cloudCrm:['cloud crm page','cloud-crm page','crm page'],
    data:['data analytics page','analytics page'],
    consultation:['consultation page','free consultation page','consult page'],
    assessment:['assessment page','security assessment page','free assessment page'],
    contact:['contact page','contact us page'],
    start:['project start page','project-start page','start page'],
    portfolio:['portfolio page'],
    about:['about page','about us page']
  };
  var PAGE_SUMMARIES = {
    home:"We are on the Home page. It highlights our promise, the AI flagship, and the core services grid. Ask me to explore services, open the AI page, or book a consultation. The newsletter signup lives in the footer.",
    ai:"We are on the AI Solutioning page. It covers flagship capabilities such as GenAI and RAG, Natural Language, Computer Vision, Predictive Modeling, MLOps, and Responsible AI, plus the idea-to-impact process. I can book a consultation or walk you through any capability.",
    website:"We are on the Website Development page. It outlines custom builds, responsive design, and the quote calculator with add-ons like SEO, payments, and WhatsApp. I can open the quote tool or detail the packages.",
    mobile:"We are on the Mobile App Development page. It explains cross-platform builds, integrations, push notifications, and security. I can help you start an app project or review feature options.",
    cybersecurity:"We are on the Cybersecurity page. It covers penetration testing, endpoint protection, compliance programs, and managed detection. Ask if you want the free assessment or a specific security service.",
    cloud:"We are on the Cloud Services page. It links to migration, security, optimization, hybrid, storage, and CRM options. I can open Project Start or book a free consultation for you.",
    cloudMigration:"We are on the Cloud Migration page. It outlines discovery, planning, secure migration, validation, and handover. Say the word if you want to start a project or schedule a consultation.",
    cloudSecurity:"We are on the Cloud Security page. It covers IAM, network controls, data protection, threat detection, and compliance. I can jump to Project Start or book the consultation whenever you are ready.",
    cloudOptimization:"We are on the Cloud Optimization page. It highlights rightsizing, autoscaling, cost guardrails, performance tuning, and observability. Just ask if you would like Project Start or a consultation link.",
    hybridCloud:"We are on the Hybrid Cloud page. It explains networking, identity, workload placement, management, and continuity strategies. I can take you to Project Start or set up a consultation at any time.",
    cloudStorage:"We are on the Cloud Storage page. It covers object, block, and file storage, backup and recovery, lifecycle policies, and durability. Let me know if you want to kick off a project or book a consultation.",
    cloudCrm:"We are on the Cloud CRM page. It describes CRM implementation, integrations, automation, and migrations for tools like Salesforce, HubSpot, and Zoho. I can open Project Start or book a consultation for you.",
    data:"We are on the Data Analytics page. It highlights dashboards, ETL, forecasting, and data governance. I can show case studies or connect you to the consultation form.",
    consultation:"We are on the Consultation page. This is where you can book a free session by sharing your preferred date, time, and timezone. Let me know if you want help completing the form.",
    assessment:"We are on the Free Security Assessment page. It explains what the review includes and lets you request it. I can help with the form or open related security services.",
    contact:"We are on the Contact page with the quick enquiry form, contact details, and FAQs. I can capture your name, email, message, and submit when ready.",
    start:"We are on the Project Start page. It helps scope new work with project details, budget, and timing. I can assist with the form or suggest next steps.",
    portfolio:"We are on the Portfolio page showcasing selected projects, tech stacks, and outcomes. Ask for a walkthrough or to open a specific case study.",
    about:"We are on the About page. It shares KypexTech's profile, mission, values, and differentiators. Let me know if you want to jump to services or contact the team."
  };
  function getCurrentPageKey(){
    try{
      var path = (location.pathname||'').toLowerCase();
      if (!path || path==='/' ) return 'home';
      var file = path.split('/').pop() || '';
      if (!file || file==='index' || file==='/') file = 'index.html';
      var q = file.indexOf('?');
      if (q>=0) file = file.slice(0,q);
      switch(file){
        case 'index.html':
        case '': return 'home';
        case 'ai-solutioning.html': return 'ai';
        case 'website-development.html': return 'website';
        case 'mobile-app-development.html': return 'mobile';
        case 'cybersecurity.html': return 'cybersecurity';
        case 'cloud-services.html': return 'cloud';
        case 'cloud-migration.html': return 'cloudMigration';
        case 'cloud-security.html': return 'cloudSecurity';
        case 'cloud-optimization.html': return 'cloudOptimization';
        case 'hybrid-cloud.html': return 'hybridCloud';
        case 'cloud-storage.html': return 'cloudStorage';
        case 'cloud-crm.html': return 'cloudCrm';
        case 'data-analytics.html': return 'data';
        case 'consultation.html': return 'consultation';
        case 'assessment.html': return 'assessment';
        case 'contact.html': return 'contact';
        case 'project-start.html': return 'start';
        case 'portfolio.html': return 'portfolio';
        case 'about.html': return 'about';
        default:
          if (file.indexOf('quote')>=0) return 'website';
          return 'home';
      }
    }catch(_){ return 'home'; }
  }
  function describeCurrentPage(){
    var key = getCurrentPageKey();
    return PAGE_SUMMARIES[key] || 'We are exploring KypexTech together. Tell me what you want to open next.';
  }
  function isCurrentPageQuery(text){
    try{
      var t = String(text||'').toLowerCase();
      if (!t) return false;
      if (t.indexOf('page')===-1) return false;
      if (/\b(this|current)\s+page\b/.test(t)) return true;
      var key = getCurrentPageKey();
      var aliases = PAGE_ALIASES[key] || [];
      for (var i=0;i<aliases.length;i++){
        if (t.indexOf(aliases[i])>=0 && /(tell|what|describe|explain|info|information|overview|more|about|guide|walk)/.test(t)) return true;
      }
      return false;
    }catch(_){ return false; }
  }

  // ---------- Fuzzy QnA matching ----------
  function tokenize(str){
    try{
      var stop = new Set(['a','an','the','and','or','but','to','for','of','on','in','with','my','is','are','do','does','can','how','what','when','where','why','which','who','will','be','we','you','your']);
      return String(str||'').toLowerCase()
        .replace(/[^a-z0-9\s]/g,' ')
        .split(/\s+/).filter(function(t){ return t && !stop.has(t); });
    }catch(_){ return []; }
  }
  function jaccard(a,b){
    try{
      var A = new Set(a), B = new Set(b);
      var inter=0; A.forEach(function(x){ if (B.has(x)) inter++; });
      var uni = A.size + B.size - inter; return uni? inter/uni : 0;
    }catch(_){ return 0; }
  }
  function patternTokens(rx){
    try{
      var s = (rx && rx.source) ? rx.source : String(rx||'');
      s = s.replace(/\\s\+/g,' ').replace(/\W+/g,' ').replace(/\s+/g,' ');
      return tokenize(s);
    }catch(_){ return []; }
  }
  function fuzzyAnswerQnA(text){
    try{
      if (!text) return null; if (!QNA_READY) initQNA();
      var t = tokenize(text);
      var best = null; var bestScore = 0;
      for (var i=0;i<QNA.length;i++){
        var item = QNA[i]; var maxScore = 0;
        for (var j=0;j<item.patterns.length;j++){
          var toks = patternTokens(item.patterns[j]);
          var sc = jaccard(t, toks);
          if (sc>maxScore) maxScore = sc;
        }
        if (maxScore > bestScore){ bestScore = maxScore; best = item; }
      }
      if (best && bestScore >= 0.32){
        if (best.route){ lastSuggestion = {type:'page', route:best.route}; return best.answer + ' Would you like me to open the relevant page? Say "yes" to proceed.'; }
        return best.answer;
      }
      return null;
    }catch(_){ return null; }
  }

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
    injectTipStyles();
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
  var ttsAudioEl = null; // HTMLAudioElement for OpenAI TTS playback
  var lastSuggestion = null; // remember last suggested action to execute on user consent
  var clickLog = []; // recent user clicks for context
  function injectTipStyles(){
    if (document.getElementById('agent-tip-styles')) return;
    var css = [
      '#agentTipsCard{position:fixed;right:32px;bottom:120px;width:260px;max-width:90vw;background:#0f1422;color:#f8fafc;border-radius:10px;box-shadow:0 12px 30px rgba(15,20,34,0.25);padding:16px;display:flex;gap:12px;align-items:flex-start;font-family:inherit;font-size:14px;line-height:1.4;z-index:9998;opacity:0;transform:translateY(20px);transition:opacity .3s ease,transform .3s ease;}',
      '#agentTipsCard.show{opacity:1;transform:translateY(0);}',
      '#agentTipsCard button{all:unset;cursor:pointer;}',
      '#agentTipsCard .tip-close{margin-left:auto;color:#94a3b8;font-size:12px;}',
      '#agentTipsCard .tip-close:hover{color:#e2e8f0;}',
      '#agentTipsCard .tip-icon{flex:0 0 auto;background:#38bdf8;color:#0f172a;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;}',
      '#agentTipsCard .tip-body{flex:1 1 auto;color:#e2e8f0;}',
      '#agentTipsToggle{position:fixed;right:32px;bottom:120px;background:#0f172a;color:#e2e8f0;border-radius:20px;padding:8px 14px;font-size:13px;cursor:pointer;box-shadow:0 8px 20px rgba(15,20,34,0.2);display:none;z-index:9997;}',
      '#agentTipsToggle:hover{background:#1e293b;}'
    ].join('\n');
    var styleTag = document.createElement('style');
    styleTag.id = 'agent-tip-styles';
    styleTag.textContent = css;
    document.head.appendChild(styleTag);
  }
  function initTipsWidget(){
    try{
      if (!isDesktop()) return;
      if (sessionStorage.getItem('agent_tips_suppressed') === '1') return;
      if (document.getElementById('agentTipsCard')) return;
      var card = document.createElement('div');
      card.id = 'agentTipsCard';
      var icon = document.createElement('div');
      icon.className = 'tip-icon';
      icon.textContent = '?';
      var body = document.createElement('div');
      body.className = 'tip-body';
      var textNode = document.createElement('div');
      textNode.id = 'agentTipsText';
      body.appendChild(textNode);
      var close = document.createElement('button');
      close.className = 'tip-close';
      close.setAttribute('aria-label', 'Hide tips');
      close.textContent = 'Hide';
      card.appendChild(icon);
      card.appendChild(body);
      card.appendChild(close);
      document.body.appendChild(card);
      var toggle = document.createElement('button');
      toggle.id = 'agentTipsToggle';
      toggle.textContent = 'Show tips';
      document.body.appendChild(toggle);
      var tips = TIP_MESSAGES.slice();
      if (!tips.length){
        card.remove();
        toggle.remove();
        return;
      }
      var index = Math.floor(Math.random() * tips.length);
      function setTip(i){ textNode.textContent = tips[i]; }
      function nextTip(){ index = (index + 1) % tips.length; setTip(index); }
      var rotation = null;
      function start(){ rotation = setInterval(nextTip, 7000); }
      function stop(){ if (rotation){ clearInterval(rotation); rotation = null; } }
      function showCard(){
        card.style.display = 'flex';
        requestAnimationFrame(function(){ card.classList.add('show'); });
        toggle.style.display = 'none';
        sessionStorage.setItem('agent_tips_hidden','0');
        stop(); start();
      }
      function hideCard(){
        card.classList.remove('show');
        stop();
        sessionStorage.setItem('agent_tips_hidden','1');
        setTimeout(function(){ card.style.display = 'none'; toggle.style.display = 'inline-flex'; }, 250);
      }
      close.addEventListener('click', hideCard);
      toggle.addEventListener('click', function(){ showCard(); });
      setTip(index);
      if (sessionStorage.getItem('agent_tips_hidden') === '1'){
        card.style.display = 'none';
        toggle.style.display = 'inline-flex';
      } else {
        card.style.display = 'flex';
        requestAnimationFrame(function(){ card.classList.add('show'); });
        start();
      }
    }catch(_){ }
  }

  var currentSectionId = null; // current visible section
  var awaitingOverviewChoice = false; // awaiting y/n for site overview

  // ---------- Click + Section Tracking ----------
  function getSectionIdFrom(el){
    try{
      var n = el && el.closest && el.closest('section[id], [id][data-section]');
      if (n && n.id) return n.id;
      // Walk up for any id if no section wrapper
      var p = el; var hops=0;
      while (p && hops<5){ if (p.id) return p.id; p=p.parentElement; hops++; }
    }catch(_){}
    return null;
  }
  function describeEl(el){
    var t = '';
    try{ t = (el.textContent||'').trim().replace(/\s+/g,' ').slice(0,80); }catch(_){ }
    var id = ''; try{ id = el.id||''; }catch(_){ }
    var al = ''; try{ al = el.getAttribute && el.getAttribute('aria-label') || ''; }catch(_){ }
    var role = ''; try{ role = el.getAttribute && el.getAttribute('role') || ''; }catch(_){ }
    return { text:t, id:id, aria:al, role:role };
  }
  function startClickTracking(){
    try{
      document.addEventListener('click', function(e){
        var el = e.target && e.target.closest && e.target.closest('a, button, [role="button"], input[type="submit"], .btn, .cta');
        if (!el) return;
        var meta = describeEl(el);
        meta.section = getSectionIdFrom(el) || currentSectionId || '';
        meta.page = location.pathname.replace(/^\/+/, '') || 'index.html';
        clickLog.push(meta);
        if (clickLog.length>15) clickLog.shift();
        try{ sessionStorage.setItem('agent_clicks', JSON.stringify(clickLog)); }catch(_){ }
        try{ if (window.gtag) window.gtag('event','agent_click', meta); }catch(_){ }
      }, true);
    }catch(_){ }
  }
  function startSectionObserver(){
    try{
      var els = Array.from(document.querySelectorAll('section[id], main > section[id], [data-section][id]'));
      if (!els.length) return;
      var obs = new IntersectionObserver(function(entries){
        entries.forEach(function(ent){ if (ent.isIntersecting){ currentSectionId = ent.target.id; } });
      }, { root:null, threshold:0.4 });
      els.forEach(function(s){ obs.observe(s); });
    }catch(_){ }
  }

  function bindUI(){
    panel = document.getElementById('agentPanel');
    logEl = document.getElementById('agentLog');
    inputEl = document.getElementById('agentText');
    muteBtn = document.getElementById('agentMute');
    document.getElementById('agentFab').addEventListener('click', togglePanel);
    document.getElementById('agentClose').addEventListener('click', function(){ try{ sessionStorage.setItem('agent_closed','1'); }catch(_){} closePanel(); });
    document.getElementById('agentForm').addEventListener('submit', onSubmit);
    muteBtn.addEventListener('click', toggleMute);

    try{
      var stored = sessionStorage.getItem('agent_muted');
      if (stored === null) {
        muted = !isDesktop();
        try{ sessionStorage.setItem('agent_muted', muted ? '1' : '0'); }catch(_){ }
      } else {
        muted = stored === '1';
      }
    }catch(_){ muted = !isDesktop(); }
    if (muteBtn){
      var desktop = isDesktop();
      muteBtn.disabled = !desktop;
      muteBtn.title = desktop ? 'Toggle voice' : 'Voice available on desktop only';
    }
    updateMuteUI();
  }

  function openPanel(){
    var root = document.getElementById('agent-widget');
    root.classList.add('open');
    // Introduce once per session only
    var introDone = false;
    try { introDone = sessionStorage.getItem('agent_intro_done') === '1'; } catch(_){}
    if (!introDone && !logEl.dataset.greeted){
      var greet = 'Welcome to KypexTech. We specialize in delivering cutting-edge IT and AI solutions — from web and mobile development to cloud, cybersecurity, consulting, and data analytics. My mission is to empower businesses with technology, creativity, and innovation, helping you grow smarter, faster, and more securely. How may we help you today.';
      addAgentMsg(greet, true);
      setTimeout(function(){ addAgentMsg('Would you like a quick site overview? Type y for Yes or n for No.'); awaitingOverviewChoice = true; }, 50);
      logEl.dataset.greeted = '1';
      try { sessionStorage.setItem('agent_intro_done','1'); } catch(_){}
    }
    setTimeout(function(){ if (inputEl) inputEl.focus(); }, 40);
  }
  function closePanel(){
    try{ if (window.speechSynthesis) window.speechSynthesis.cancel(); }catch(_){}
    try{ if (ttsAudioEl){ ttsAudioEl.pause(); ttsAudioEl.src=''; ttsAudioEl=null; } }catch(_){}
    document.getElementById('agent-widget').classList.remove('open');
  }
  function togglePanel(){ var root = document.getElementById('agent-widget'); if (root.classList.contains('open')) { closePanel(); } else { openPanel(); } }

  // ---------- Chat helpers ----------
  function addUserMsg(text){
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch(_){}
    var row = document.createElement('div');
    row.className = 'msg user'; row.textContent = text;
    logEl.appendChild(row); logEl.scrollTop = logEl.scrollHeight;
    persistHistory('user', text);
  }
  function enforceClientPolicy(text){
    try{
      var s = String(text||'');
      // Never talk about how to improve the client's site
      var taboo = /(improv(e|ing|ement)s?|optimis(e|z)e|fix|revamp|redo|redesign|speed up|seo|accessibility|ux)\b[^.\n]*(site|website)\b/i;
      if (taboo.test(s)) {
        return 'I can help with next steps. Would you like me to open a relevant page or book a consultation?';
      }
      return s;
    }catch(_){ return text; }
  }
  function addAgentMsg(text, noStore){
    text = enforceClientPolicy(text);
    var row = document.createElement('div');
    row.className = 'msg agent'; row.textContent = text;
    logEl.appendChild(row); logEl.scrollTop = logEl.scrollHeight;
    if (!noStore) persistHistory('agent', text);
    if (!muted) speak(text);
  }

  function buildSiteOverview(){
    var lines = [
      'KypexTech Quick Guide',
      '',
      '1. Home - Hero intro, AI highlight, and core services. Start with Explore Our Services or subscribe via the footer.',
      '2. AI Solutioning - GenAI, NLP, predictive models, computer vision, and MLOps. Great place to book a consultation.',
      '3. Portfolio - Case studies and outcomes to spark your next project.',
      '4. About - Mission, values, and what sets the team apart before you reach out.',
      '5. Contact - Fast form and FAQs to schedule a call or send a message.',
      '',
      'Key services: Website Development, Mobile Apps, Cybersecurity, Cloud, IT Consulting, Data Analytics.',
      '',
      'Say a page name any time and I can open it for you.'
    ];
    return lines.join('\n');
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
  var speakQueue = [];
  var speaking = false;
  async function speak(text){
    try {
      // Enforce desktop-only voice
      if (muted || !isDesktop()) return;
      speakQueue.push(String(text||''));
      if (speaking) return;
      speaking = true;
      while (speakQueue.length && !muted){
        var msg = sanitizeForTTS(speakQueue.shift());

        // Try OpenAI TTS first (Aoede)
        var played = false;
        if (OPENAI_TTS.key) {
          try{
            var res = await fetch(OPENAI_TTS.endpoint, {
              method: 'POST',
              headers: {
                'Authorization': 'Bearer ' + OPENAI_TTS.key,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: OPENAI_TTS.model,
                voice: OPENAI_TTS.voice,
                input: msg,
                format: OPENAI_TTS.format
              })
            });
            if (res.ok) {
              var buf = await res.arrayBuffer();
              var mime = OPENAI_TTS.format === 'mp3' ? 'audio/mpeg' : 'audio/webm';
              var blob = new Blob([buf], { type: mime });
              var url = URL.createObjectURL(blob);
              ttsAudioEl = new Audio(url);
              await new Promise(function(resolve){
                var done = function(){ try{ URL.revokeObjectURL(url); }catch(_){ } resolve(); };
                ttsAudioEl.onended = done; ttsAudioEl.onerror = done;
                ttsAudioEl.play().catch(done);
              });
              played = true;
            }
          }catch(_){ /* ignore and fall back */ }
        }

        if (!played && window.speechSynthesis){
          await new Promise(function(resolve){
            try{
              var u = new SpeechSynthesisUtterance(msg);
              u.rate=1.02; u.pitch=1.0; u.volume=1.0;
              var vs = window.speechSynthesis.getVoices() || [];
              var v = vs.find(function(x){ return /aoede/i.test(x.name||'') || /aoede/i.test(x.voiceURI||''); })
                    || vs.find(function(x){ return /en-(ZA|US|GB)/i.test(x.lang||''); })
                    || vs[0];
              if (v) u.voice = v;
              u.onend = resolve; u.onerror = resolve;
              window.speechSynthesis.speak(u);
            }catch(_){ resolve(); }
          });
        }
      }
    } catch(_){
      // swallow
    } finally {
      speaking = false;
    }
  }
  function toggleMute(){
    // Do not allow enabling voice on non-desktop devices
    if (!isDesktop()) { addAgentMsg('Voice is available on desktop only.'); return; }
    muted = !muted;
    try{ sessionStorage.setItem('agent_muted', muted?'1':'0'); }catch(_){ }
    if (muted) {
      try{ if (window.speechSynthesis) window.speechSynthesis.cancel(); }catch(_){ }
      try{ if (ttsAudioEl){ ttsAudioEl.pause(); ttsAudioEl.src=''; ttsAudioEl=null; } }catch(_){ }
    }
    updateMuteUI();
  }
  function updateMuteUI(){ if (muteBtn) { muteBtn.textContent = muted ? 'Unmute' : 'Mute'; } }

  // ---------- Actions ----------
  var ROUTES = {
    ai:'ai-solutioning.html', website:'website-development.html', mobile:'mobile-app-development.html',
    cybersecurity:'cybersecurity.html', cloud:'cloud-services.html', cloudMigration:'cloud-migration.html',
    cloudSecurity:'cloud-security.html', cloudOptimization:'cloud-optimization.html', hybridCloud:'hybrid-cloud.html',
    cloudStorage:'cloud-storage.html', cloudCrm:'cloud-crm.html', consulting:'it-consulting.html',
    analytics:'data-analytics.html', portfolio:'portfolio.html', about:'about.html', contact:'contact.html',
    assessment:'assessment.html', consultation:'consultation.html', start:'project-start.html', home:'index.html'
  };
  function route(key){
    if (!ROUTES[key]){ addAgentMsg('I could not find that page.'); return false; }
    if (key === 'home'){
      addAgentMsg('Opening the Home page...');
      addAgentMsg('Once you are on the Home page, remember you can subscribe via the footer for monthly updates.');
    } else {
      addAgentMsg('Opening ' + key + '...');
    }
    setTimeout(function(){ window.location.href = ROUTES[key]; }, 120);
    return true;
  }

  function mapSpokenToRoute(s){
    s = String(s||'').toLowerCase().trim();
    if (!s) return null;
    var noSpaces = s.replace(/\s+/g,'');
    if (/^ai( solutions| solutioning)?$/.test(s)) return 'ai';
    if (/^(website|web( |-)dev(elopment)?)$/.test(s)) return 'website';
    if (/^mobile( app)?$/.test(s)) return 'mobile';
    if (/^cyber( ?security)?$/.test(s)) return 'cybersecurity';
    if (/^cloud( services)?$/.test(s)) return 'cloud';
    if (/^cloud migration$/.test(s) || noSpaces==='cloudmigration') return 'cloudMigration';
    if (/^cloud security$/.test(s) || noSpaces==='cloudsecurity') return 'cloudSecurity';
    if (/^cloud optimization$/.test(s) || noSpaces==='cloudoptimization') return 'cloudOptimization';
    if (/^hybrid cloud$/.test(s) || noSpaces==='hybridcloud') return 'hybridCloud';
    if (/^cloud storage$/.test(s) || noSpaces==='cloudstorage') return 'cloudStorage';
    if (/^cloud crm$/.test(s) || noSpaces==='cloudcrm') return 'cloudCrm';
    if (/^consult(ation|ing)?$/.test(s)) return 'consultation';
    if (/^data( analytics)?$/.test(s)) return 'analytics';
    if (/^portfolio$/.test(s)) return 'portfolio';
    if (/^about$/.test(s)) return 'about';
    if (/^contact( page| us)?$/.test(s) || /^c$/.test(s)) return 'contact';
    if (/^assessment$/.test(s)) return 'assessment';
    if (/^(project )?start$/.test(s)) return 'start';
    if (noSpaces==='home' || noSpaces==='homepage' || s==='h') return 'home';
    return null;
  }

  // Fuzzy routing helper – infer likely route from natural language
  function inferRouteFromText(text){
    try{
      var s = String(text||'').toLowerCase();
      // Normalize punctuation/spacing
      s = s.replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
      // High-intent contact synonyms
      if (/(get in touch|reach out|talk to (someone|a (human|person|rep))|speak to (someone|a (human|person|rep))|\bcontact( us)?\b|call you|phone you|whatsapp( us)?)/.test(s)) return 'contact';
      // Consultation / booking intents
      if (/(book|schedule|set up|arrange).*(consult(ation)?|meeting|call|demo)|\bconsultation\b/.test(s)) return 'consultation';
      // Portfolio / case studies
      if (/(portfolio|case studies|our work|examples)/.test(s)) return 'portfolio';
      // About page
      if (/(about( us)?|who (are|is) (you|kypextech))/.test(s)) return 'about';
      // Services
      if (/(\bai\b|genai|rag|nlp|mlops|computer vision)/.test(s)) return 'ai';
      if (/(web( ?site)?( dev(elopment)?)?|build (me )?a site)/.test(s)) return 'website';
      if (/(mobile( app)?|android|ios)/.test(s)) return 'mobile';
      if (/(cyber\s*security|security posture|pen(etration)? test)/.test(s)) return 'cybersecurity';
      if (/cloud migration/.test(s)) return 'cloudMigration';
      if (/cloud security/.test(s)) return 'cloudSecurity';
      if (/cloud optimization/.test(s)) return 'cloudOptimization';
      if (/hybrid cloud/.test(s)) return 'hybridCloud';
      if (/cloud storage/.test(s)) return 'cloudStorage';
      if (/cloud crm/.test(s)) return 'cloudCrm';
      if (/(cloud( services)?|aws|azure|gcp)/.test(s)) return 'cloud';
      if (/(data analytics|dashboards?|\bbi\b|reports?)/.test(s)) return 'analytics';
      if (/(assessment|security check|security audit)/.test(s)) return 'assessment';
      if (/(start( a)? project|kick ?off)/.test(s)) return 'start';
      if (/(^|\b)home(\s*page)?\b/.test(s) || s==='h') return 'home';
      return null;
    }catch(_){ return null; }
  }

  function executeSuggestion(sug){
    try{
      if (!sug) return false;
      if (sug.type==='page' && sug.route){ return route(sug.route); }
      if (sug.type==='link' && sug.href){ window.location.href = sug.href; return true; }
      if (sug.type==='section' && sug.id){ var el=document.getElementById(sug.id); if (el){ el.scrollIntoView({behavior:'smooth',block:'start'}); addAgentMsg('Scrolled to section #' + sug.id + '.'); return true; } }
      if (sug.type==='click' && sug.selector){ var el2=document.querySelector(sug.selector); if (el2){ try{ el2.click(); addAgentMsg('Activated ' + (el2.textContent||el2.getAttribute('aria-label')||'the button') + '.'); return true; }catch(_){ } } }
    }catch(_){ }
    return false;
  }

  function findCTAs(){
    var items=[];
    try{
      var anchors = Array.from(document.querySelectorAll('a, button'));
      anchors.forEach(function(a){
        var txt=((a.textContent||'').trim().toLowerCase());
        var href=(a.getAttribute&&a.getAttribute('href'))||'';
        var lab=(a.getAttribute&&a.getAttribute('aria-label'))||'';
        function push(type, route){ items.push({label:a.textContent.trim()||lab||href, type:type, route:route, href:href}); }
        if (/consult/.test(txt)||/consult/.test(href)||/consult/.test(lab)) push('page','consultation');
        else if (/assess/.test(txt)||/assessment/.test(href)||/assess/.test(lab)) push('page','assessment');
        else if (/contact/.test(txt)||/contact/.test(href)||/contact/.test(lab)) push('page','contact');
        else if (/quote|pricing|estimate/.test(txt)||/quote/.test(href)) items.push({label:a.textContent.trim()||lab||href, type:'link', href:href||'#'});
      });
    }catch(_){ }
    return items;
  }

  function suggestContextualHint(){
    try{
      var page = (location.pathname||'').toLowerCase();
      var sec = currentSectionId ? ('#'+currentSectionId) : '';
      var ctas = findCTAs();
      // Prefer top-priority CTAs
      var primary = ctas.find(function(x){return x.type==='page' && (x.route==='consultation'||x.route==='assessment'||x.route==='contact');});
      if (primary){
        lastSuggestion = primary;
        var routeName = primary.route;
        return 'If you like, I can take you to ' + (routeName==='consultation'?'the Free Consultation':routeName==='assessment'?'the Security Assessment':'the Contact page') + '. Say "yes" to proceed.';
      }
      // Otherwise suggest a visible section
      if (currentSectionId){
        lastSuggestion = {type:'section', id:currentSectionId};
        return 'You are on section #' + currentSectionId + '. I can scroll or point you to actions nearby.';
      }
      // Fallback generic
      lastSuggestion = null;
      return '';
    }catch(_){ return ''; }
  }
  function openWhatsApp(message){ var num=CONFIG.whatsapp.replace(/\D+/g,''); var url='https://wa.me/'+num+'?text='+encodeURIComponent(message||'Hi KypexTech!'); window.open(url,'_blank','noopener'); }
  function openMail(subject, body){ var url='mailto:'+encodeURIComponent(CONFIG.email)+'?subject='+encodeURIComponent(subject||'Enquiry from website')+'&body='+encodeURIComponent(body||''); window.location.href=url; }

  function setField(selectors, value){ for (var i=0;i<selectors.length;i++){ var el=document.querySelector(selectors[i]); if (el){ el.focus(); el.value=value; try{ el.dispatchEvent(new Event('input',{bubbles:true})); }catch(_){} el.blur(); return true; } } return false; }
  function setSelect(selectors, value){ value=String(value||'').toLowerCase(); for (var i=0;i<selectors.length;i++){ var sel=document.querySelector(selectors[i]); if (sel && sel.tagName==='SELECT'){ for (var j=0;j<sel.options.length;j++){ var opt=sel.options[j]; if (String(opt.value).toLowerCase()===value || String(opt.text).toLowerCase()===value){ sel.value=opt.value; sel.dispatchEvent(new Event('change',{bubbles:true})); return true; } } } } return false; }

  function openWebsiteQuote(){ try { var geo=(sessionStorage.getItem('geo_name')||'').toLowerCase(); var map={ 'south africa':'rsawebsitequote.html', 'zimbabwe':'zwwebsitequote.html', 'zambia':'zawebsitequote.html', 'botswana':'bwwebsitequote.html' }; window.location.href = map[geo] || 'website-development.html'; return true; } catch(_) { window.location.href='website-development.html'; return true; } }
  function routeToBestForm(text){ var t=(text||'').toLowerCase(); if (/(speak|talk) to (someone|a (person|human|rep)|team|agent)/.test(t)) return route('contact'); if (/contact (us|team)|reach (out|someone)|call you/.test(t)) return route('contact'); if (/(book|schedule|set up) (a )?(consult|meeting|call)/.test(t)) return route('consultation'); if (/assessment|security check|security audit/.test(t)) return route('assessment'); if (/(start|kick ?off|begin).*(project)/.test(t)) return route('start'); if (/(website|site).*(quote|pricing|estimate)|quote.*(website|site)/.test(t)) return openWebsiteQuote(); return false; }

  function handleLocalIntents(text){
    var t=(text||'').toLowerCase();
    if (isCurrentPageQuery(text)) {
      addAgentMsg(describeCurrentPage());
      return true;
    }
    // Handle initial overview choice
    if (awaitingOverviewChoice) {
      if (/^(y|yes)\b/.test(t)) {
        awaitingOverviewChoice = false;
        addAgentMsg(buildSiteOverview());
        return true;
      }
      if (/^(n|no)\b/.test(t)) {
        awaitingOverviewChoice = false;
        addAgentMsg('No problem — how can we help you today?');
        return true;
      }
    }
    // Section navigation by id: "go to services" or "scroll to #contact"
    if (/^(go to|scroll to|show me)\s+#?([a-z0-9][\w-]{1,80})\b/.test(t)){
      var secId = RegExp.$2;
      var dest = document.getElementById(secId);
      if (dest){ dest.scrollIntoView({behavior:'smooth', block:'start'}); addAgentMsg('Scrolled to section #' + secId + '.'); currentSectionId = secId; return true; }
      addAgentMsg('I could not find section #' + secId + ' on this page.');
      return true;
    }
    // Accept last suggested action with consent words
    if (/^(y|yes|ok|okay|sure|please|go ahead|do it|proceed|let's go|sounds good)\b/.test(t)){
      if (lastSuggestion){
        var done = executeSuggestion(lastSuggestion);
        if (!done && lastSuggestion && lastSuggestion.route) return route(lastSuggestion.route);
        return true;
      }
      // If no explicit suggestion, avoid guessing; ask a light clarification
      addAgentMsg('Got it — would you like me to open a page (e.g., Consultation, Contact, or Portfolio) or would you prefer an answer here?');
      return true;
    }
    if (routeToBestForm(t)) return true;
    // Explicit navigation commands (support varied phrasing)
    var navMatch = /^(open|go to|take me to|navigate to|show( me)?)\s+(the\s+)?(.+)$/i.exec(t);
    if (navMatch){
      // Group 4 captures the destination phrase
      var dest = (navMatch[4]||'').trim().replace(/\.$/,'');
      // Normalize common suffixes like "page" or "section"
      dest = dest.replace(/\b(page|section)\b/g, '').trim();
      var key = mapSpokenToRoute(dest) || inferRouteFromText(dest);
      if (key && ROUTES[key]) return route(key);
    }
    // Single-word or terse intents like "contact", "portfolio", "about"
    var terseKey = mapSpokenToRoute(t) || inferRouteFromText(t);
    if (terseKey && ROUTES[terseKey]) return route(terseKey);
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
    var a = answerQnA(text);
    if (a) { addAgentMsg(a); return; }
    var f = fuzzyAnswerQnA(text);
    if (f) { addAgentMsg(f); return; }
    var direct = kbAnswer(text);
    if (direct) { addAgentMsg(direct); return; }
    if (isHomePage() && isLikelyQuestion(text)) {
      addAgentMsg('I want to make sure you get the right help. If you need to talk to us directly, type "Open Contact Page", "contact page", "contact", or just "c" and I will open the Contact page for you.');
      return;
    }
    (async function(){
      var intent = await askGeminiIntent(text);
      if (intent){
        try{
          if (intent.intent==='affirmation' && lastSuggestion){ var done = executeSuggestion(lastSuggestion); if (done) return; }
          if (intent.intent==='navigate' && intent.route && ROUTES[intent.route]){ route(intent.route); return; }
          if (intent.intent==='book'){ route('consultation'); return; }
          if (intent.intent==='contact'){ route('contact'); return; }
          if (intent.intent==='quote'){ openWebsiteQuote(); return; }
        }catch(_){ }
      }
      askGemini(text).then(function(r){ addAgentMsg(r); track('gemini_answer'); }).catch(function(){ addAgentMsg('Network issue.'); });
    })();
  }
  function commandMuteIfAny(text){
    var t=(text||'').toLowerCase().trim();
    if (t==='mute'){
      muted=true; try{sessionStorage.setItem('agent_muted','1');}catch(_){ }
      updateMuteUI(); addAgentMsg('Muted. I will stop speaking.'); return true;
    }
    if (t==='unmute'){
      if (!isDesktop()) { addAgentMsg('Voice output is available on desktop only.'); return true; }
      muted=false; try{sessionStorage.setItem('agent_muted','0');}catch(_){ }
      updateMuteUI(); addAgentMsg('Unmuted. I will speak again.'); return true;
    }
    return false;
  }

  // ---------- Gemini ----------
  function capturePageContext(max){ try{ var parts=[]; parts.push('Title: ' + (document.title||'')); var m=document.querySelector('meta[name="description"]'); if(m&&m.content) parts.push('Meta: ' + m.content); var hs=Array.from(document.querySelectorAll('h1, h2, h3')).map(function(h){return h.textContent.trim();}).filter(Boolean); if(hs.length) parts.push('Headings: ' + hs.join(' | ')); var ctx=parts.join('\n'); return ctx.slice(0,max||1000);}catch(_){return '';} }
  async function askGeminiIntent(prompt){
    try{
      var pageCtx = capturePageContext(400);
      var schema = 'Return compact JSON only with keys: intent (navigate|question|affirmation|negation|book|contact|quote|smalltalk), topic (ai|analytics|security|cloud|website|mobile|crm|portfolio|about|contact|assessment|consultation|start|storage|migration|optimization|security-cloud|newsletter|general), route (ai|analytics|cybersecurity|cloud|website|mobile|portfolio|about|contact|assessment|consultation|start|home|null).';
      var inst = 'Classify the user message. If it expresses a desire to open a page (e.g., "take me to contact", "lets go to the contact page", or a bare keyword like "contact"), set intent=navigate and choose the closest route from the allowed enum. If the text is simply yes/ok/sure, set intent=affirmation. Prefer contact for phrases like get in touch / talk to someone / reach out. Prefer consultation for book/schedule meeting/call/consultation.';
      var body = { contents:[
        {role:'user', parts:[{text: schema}]},
        {role:'user', parts:[{text: inst}]},
        {role:'user', parts:[{text: 'Page: '+pageCtx}]},
        {role:'user', parts:[{text: 'Message: '+String(prompt||'')}]}
      ]};
      var res = await fetch(API_URL,{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
      if (!res.ok) throw new Error('intent http');
      var data = await res.json();
      var raw = (((data.candidates||[])[0]||{}).content||{}).parts && (((data.candidates||[])[0]||{}).content.parts.map(function(p){return p.text;}).join('\n')) || '';
      var txt = String(raw||'').trim();
      var json = null;
      try{ json = JSON.parse(txt); }catch(_){
        try{ var start = txt.indexOf('{'); var end = txt.lastIndexOf('}'); if (start>=0&&end>=start){ json = JSON.parse(txt.slice(start,end+1)); } }catch(_2){ json = null; }
      }
      if (json && typeof json==='object') return json; return null;
    }catch(_){ return null; }
  }
  async function askGemini(prompt){
    var system = 'You are Agent-Kypex, the friendly website assistant for KypexTech. You know the product and service catalog below and speak as a helpful marketing guide. Never say you lack real-time access or cannot know; use the provided knowledge and page context. Answer in 1-3 short sentences with a helpful next step (open a page, book consultation, or suggest a form). If a question is off-topic, politely steer back to how you can help. Never discuss how to improve the client\'s site; do not give website improvement advice.';
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
    var text = (((data.candidates||[])[0]||{}).content||{}).parts && (((data.candidates||[])[0]||{}).content.parts.map(function(p){return p.text;}).join('\n')) || 'I can help with next steps. Would you like me to open a relevant page or book a consultation?';
    history.push({role:'user', parts:[{text: prompt}]});
    history.push({role:'model', parts:[{text: text}]});
    while (history.length>12) history.shift();
    return enforceClientPolicy(text);
  }

  // ---------- Persistence ----------
  function persistHistory(role, text){ try{ var store=JSON.parse(sessionStorage.getItem('agent_history')||'[]'); store.push({role:role, text:text}); if(store.length>50) store=store.slice(store.length-50); sessionStorage.setItem('agent_history', JSON.stringify(store)); }catch(_){ } }
  function restoreHistory(){ try{ var store=JSON.parse(sessionStorage.getItem('agent_history')||'[]'); for(var i=0;i<store.length;i++){ var m=store[i]; var row=document.createElement('div'); row.className='msg ' + (m.role==='user'?'user':'agent'); row.textContent=m.text; logEl.appendChild(row);} logEl.scrollTop=logEl.scrollHeight; }catch(_){ } }

  // ---------- Hints + GA ----------
  function speakHints(){ try{ var p=(location.pathname||'').toLowerCase(); if(p.indexOf('website-development.html')>=0){ addAgentMsg('Tip: Type your country and "website quote", or type "submit form" when done.'); return; } if(p.indexOf('consultation.html')>=0){ addAgentMsg('You can type preferred date, preferred time, timezone, then "submit form".'); return; } if(p.indexOf('contact.html')>=0){ addAgentMsg('You can type name, email, message, then "submit form".'); return; } if(p.indexOf('ai-solutioning.html')>=0){ addAgentMsg('Ask about assistants, RAG, vision, or type "book a consultation".'); return; } if(p.indexOf('index.html')>=0||p=='/'){ addAgentMsg('This is the Home page. Try: "website quote", "book consultation", or "open AI solutions", and remember you can subscribe via the footer for monthly updates.'); return; } }catch(_){}}
  function speakHints(){
    try{
      // Dynamic contextual suggestion first
      var dyn = suggestContextualHint();
      if (dyn) { addAgentMsg(dyn); return; }
      var p=(location.pathname||'').toLowerCase();
      if(p.indexOf('website-development.html')>=0){ addAgentMsg('Tip: Type your country and "website quote", or type "submit form" when done.'); return; }
      if(p.indexOf('consultation.html')>=0){ addAgentMsg('You can type preferred date, preferred time, timezone, then "submit form".'); return; }
      if(p.indexOf('contact.html')>=0){ addAgentMsg('You can type name, email, message, then "submit form".'); return; }
      if(p.indexOf('ai-solutioning.html')>=0){ addAgentMsg('Ask about assistants, RAG, vision, or type "book a consultation".'); return; }
      if(p.indexOf('index.html')>=0||p=='/'){ addAgentMsg('This is the Home page. Try: "website quote", "book consultation", or "open AI solutions", and remember you can subscribe via the footer for monthly updates.'); return; }
    }catch(_){}
  }
  function track(action){ try{ if(window.gtag) window.gtag('event','agent_action',{action:action,page:location.pathname}); }catch(_){ }}

  // ---------- Boot ----------
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', onReady); else onReady();
  function onReady(){
    // Load OpenAI TTS key from meta or localStorage
    try{
      var meta = document.querySelector('meta[name="openai-tts-key"]');
      var k = meta && meta.content ? meta.content.trim() : '';
      if (!k) { try{ k = localStorage.getItem('openai_tts_key')||''; }catch(_){ } }
      if (k) OPENAI_TTS.key = k;
    }catch(_){ }
    initUI();
    startClickTracking();
    startSectionObserver();
    initTipsWidget();
    // Do not auto-open; user toggles with the AI button
    restoreHistory();
  }
})();
