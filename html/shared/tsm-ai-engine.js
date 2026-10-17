/**
 * TSMatter AI Engine · tsm-ai-engine.js
 * Drop into: /html/shared/tsm-ai-engine.js
 * Reference from any app: <script src="/html/shared/tsm-ai-engine.js"></script>
 * Then call: TSMai.init('samplehealthsystem', 'hc-billing')
 *
 * Version: 1.0.0 · 2026-04
 */

(function (global) {
  'use strict';

  /* ─────────────────────────────────────────────────────────────
     COMPANY PROFILES
     Each profile defines: allowed nodes, priorities, disallowed
     domains, and the base system prompt context for that company.
  ───────────────────────────────────────────────────────────── */
  const PROFILES = {

    samplehealthsystem: {
      id: 'samplehealthsystem',
      company: 'Sample Health System',
      sector: 'healthcare',
      persona: 'Revenue Cycle Manager',
      allowedNodes: [
        'hc-billing','hc-compliance','hc-insurance','hc-medical',
        'hc-pharmacy','hc-grants','hc-strategist','hc-command',
        'hc-taxprep','hc-vendors','hc-financial','hc-legal'
      ],
      disallowedDomains: ['legal','mortgage','construction','schools','reo','hotelops'],
      offices: ['scottsdale','mesa','tempe','northmountain'],
      priorities: ['denial_rate','payer_auths','claims_backlog','documentation_gaps','satellite_office_variance'],
      currentData: {
        denialRate: 18.4, denialThreshold: 15, revenueAtRisk: 48000,
        deniedClaims: 231, cleanClaimRate: 94.2, cleanClaimTarget: 97,
        authPending: 65, bpoQueue: 4,
        offices: {
          scottsdale: { denial: 18.4, auth: 31, drift: 0.12, alerts: 6 },
          mesa:        { denial: 22.1, auth: 14, drift: 0.19, alerts: 9 },
          tempe:       { denial: 11.2, auth: 8,  drift: 0.04, alerts: 2 },
          northmountain:{ denial: 13.5, auth: 12, drift: 0.07, alerts: 4 }
        },
        urgentClaims: [
          { id: 'CLM-0334', cpt: '93454', payer: 'Medicare', code: 'CO-29', amount: 3800, deadline: '48hr' }
        ],
        denialCodes: [
          { code: 'PR-96', count: 104, pct: 45, risk: 21600 },
          { code: 'CO-4',  count: 65,  pct: 28, risk: 13400 },
          { code: 'CO-11', count: 42,  pct: 18, risk: 8100  },
          { code: 'CO-29', count: 12,  pct: 5,  risk: 5700  }
        ]
      },
      systemPrompt() {
        const d = this.currentData;
        return `You are HC-Strategist for Sample Health System.
Persona: ${this.persona} (Dee Montee).
Approved source nodes: ${this.allowedNodes.join(', ')}.
Approved satellite offices: ${this.offices.join(', ')}.
STRICTLY DO NOT reference non-healthcare sectors: ${this.disallowedDomains.join(', ')}.
Prioritize: revenue cycle, denial prevention, payer authorization friction, coding documentation gaps, cross-office variance.

LIVE SAMPLE HEALTH SYSTEM DATA (as of today):
- Denial rate: ${d.denialRate}% (CMS threshold: ${d.denialThreshold}%) → $${(d.revenueAtRisk/1000).toFixed(0)}K at risk, ${d.deniedClaims} denied claims
- Clean claim rate: ${d.cleanClaimRate}% vs ${d.cleanClaimTarget}% target
- Auth pending: ${d.authPending} across all offices
- BPO queue: ${d.bpoQueue} documents

TOP DENIAL CODES:
${d.denialCodes.map(c=>`  ${c.code}: ${c.count} claims (${c.pct}%) — $${(c.risk/1000).toFixed(1)}K at risk`).join('\n')}

URGENT: CLM-0334 (CPT 93454, $3,800, Medicare CO-29 timely filing) — 48hr write-off deadline

SATELLITE OFFICES:
${Object.entries(d.offices).map(([name, o])=>`  ${name}: ${o.denial}% denial, ${o.auth} auth pending, drift ${o.drift}, ${o.alerts} alerts`).join('\n')}

RESPONSE FORMAT — always return:
1. Top issue + source (office/node)
2. Business impact ($)
3. Exactly 3 immediate actions (numbered)
4. Which office manager or node should act first`;
      }
    },

    banner: {
      id: 'banner',
      company: 'Sample Health System B',
      sector: 'healthcare',
      persona: 'Revenue Cycle Director',
      allowedNodes: ['hc-billing','hc-compliance','hc-insurance','hc-medical','hc-strategist'],
      disallowedDomains: ['mortgage','construction','schools','reo','hotelops'],
      offices: [],
      priorities: ['denial_rate','prior_auth','coding_quality','compliance_risk'],
      currentData: {},
      systemPrompt() {
        return `You are HC-Strategist for Sample Health System B.
Persona: ${this.persona}.
Approved nodes: ${this.allowedNodes.join(', ')}.
DO NOT reference: ${this.disallowedDomains.join(', ')}.
Prioritize: revenue cycle performance, prior auth friction, coding quality, compliance risk.
Return: top issue, dollar impact, 3 immediate actions, who acts first.`;
      }
    },

    samplecreditunion: {
      id: 'samplecreditunion',
      company: 'Sample Credit Union',
      sector: 'financial',
      persona: 'Operations Manager',
      allowedNodes: ['financial','compliance','tax','vendors','strategist'],
      disallowedDomains: ['healthcare','construction','schools','hotelops'],
      offices: [],
      priorities: ['portfolio_performance','compliance_risk','member_services','loan_quality'],
      currentData: {},
      systemPrompt() {
        return `You are Strategist for Sample Credit Union Credit Union.
Persona: ${this.persona}.
Approved nodes: ${this.allowedNodes.join(', ')}.
DO NOT reference: ${this.disallowedDomains.join(', ')}.
Prioritize: portfolio performance, compliance risk, member services quality, loan processing.
Return: top issue, dollar impact, 3 immediate actions, who acts first.`;
      }
    },

    federation: {
      id: 'federation',
      company: 'TSMatter Federation',
      sector: 'cross-vertical',
      persona: 'Sovereign Strategist',
      allowedNodes: ['all'],
      disallowedDomains: [],
      offices: [],
      priorities: ['cross_vertical_risk','highest_roi','system_health','critical_alerts'],
      currentData: {},
      systemPrompt() {
        return `You are TSMatter Sovereign Strategist — the cross-vertical neural intelligence layer.
You synthesize signals across all connected verticals: Healthcare, Legal, Financial, Construction, Schools, REO, HotelOps.
Persona: ${this.persona}.
Prioritize: highest cross-vertical risk, highest ROI opportunity, system health, critical alerts.
Return: top issue, business impact, 3 immediate actions, which vertical or node acts first.`;
      }
    }
  };

  /* ─────────────────────────────────────────────────────────────
     NODE CONTEXT LAYERS
     Each node has a supplementary context injected alongside
     the company profile prompt.
  ───────────────────────────────────────────────────────────── */
  const NODE_CONTEXTS = {
    'hc-billing':    'You are operating within the HC-Billing node. Focus on: claim submissions, denial management, ERA processing, aging AR, clean claim rate improvement, billing workflow optimization.',
    'hc-compliance': 'You are operating within the HC-Compliance node. Focus on: audit risk, coding compliance, documentation gaps, regulatory requirements, CPT/ICD-10 accuracy, modifier review.',
    'hc-medical':    'You are operating within the HC-Medical node. Focus on: clinical documentation, CDI, physician queries, diagnosis coding, clinical risk adjustment.',
    'hc-insurance':  'You are operating within the HC-Insurance node. Focus on: prior authorizations, payer contracts, eligibility verification, auth approval rates, payer-specific policies.',
    'hc-pharmacy':   'You are operating within the HC-Pharmacy node. Focus on: formulary compliance, drug prior auths, DME billing, specialty pharmacy costs, medication reconciliation.',
    'hc-taxprep':    'You are operating within the HC-TaxPrep node. Focus on: tax preparation for healthcare entities, grant reporting, revenue recognition, 990 compliance, financial reporting.',
    'hc-grants':     'You are operating within the HC-Grants node. Focus on: grant opportunities, reporting requirements, compliance, funding cycles, application strategy.',
    'hc-vendors':    'You are operating within the HC-Vendors node. Focus on: vendor contracts, procurement compliance, spend analysis, vendor performance, renewal risk.',
    'hc-command':    'You are operating within the HC-Command center. You have visibility across all HC nodes and satellite offices. Synthesize the complete operational picture.',
    'hc-strategist': 'You are the HC-Strategist neural core. You synthesize signals from all HC nodes and satellite office summaries to produce the Best Next Course of Action (BNCA).',
    'hc-financial':  'You are operating within the HC-Financial node. Focus on: revenue reporting, financial performance, budget variance, payer mix analysis, net revenue.',
    'hc-legal':      'You are operating within the HC-Legal node. Focus on: healthcare regulatory compliance, contract review, HIPAA, payer dispute resolution, legal risk.',
    'financial':     'You are operating within the Financial node. Focus on: portfolio performance, financial metrics, risk analysis, reporting.',
    'compliance':    'You are operating within the Compliance node. Focus on: regulatory risk, audit readiness, policy adherence, compliance gaps.',
    'strategist':    'You are the Strategist neural core for this vertical. Synthesize all signals and produce the Best Next Course of Action (BNCA).',
    'default':       'You are an AI assistant for this TSMatter node. Provide clear, actionable intelligence based on the data and context provided.'
  };

  /* ─────────────────────────────────────────────────────────────
     PULL PACK DEFINITIONS
  ───────────────────────────────────────────────────────────── */
  const PACKS = {
    revenue: {
      id: 'revenue', label: 'Revenue Pack',
      prompt: (profile) => `Pull ${profile.company} Revenue Pack.
Synthesize data from: ${profile.allowedNodes.filter(n=>['hc-billing','hc-insurance','hc-compliance','hc-financial'].includes(n)).join(', ')} + all satellite office summaries.
Metrics to analyze: denial_rate, claims_aging, payer_auth_pending, modifier_overuse, documentation_gap_rate, clean_claim_rate.
Company data: ${JSON.stringify(profile.currentData || {})}.
Return top 5 revenue risks ranked by dollar impact. For each: issue, source node/office, dollar amount, recommended action.`
    },
    variance: {
      id: 'variance', label: 'Site Variance Pack',
      prompt: (profile) => `Pull ${profile.company} Office Variance Pack.
Compare all satellite offices: ${profile.offices.join(', ')}.
${profile.currentData?.offices ? 'Office data: '+JSON.stringify(profile.currentData.offices) : ''}
Metrics: denial_rate, auth_delay, coding_review_backlog, writeoff_risk, clean_claim_rate.
Which office needs immediate intervention and why?
What should each office manager do this week? Be specific per office.`
    },
    denial: {
      id: 'denial', label: 'Denial Recovery Pack',
      prompt: (profile) => `Pull ${profile.company} Denial Recovery Pack.
${profile.currentData?.denialCodes ? 'Denial codes: '+JSON.stringify(profile.currentData.denialCodes) : ''}
${profile.currentData?.urgentClaims ? 'URGENT claims: '+JSON.stringify(profile.currentData.urgentClaims) : ''}
Build a prioritized appeal sequence:
1. Rank by dollar recovery potential
2. Provide payer-specific appeal tactics for each code
3. Identify any write-off deadline emergencies
4. Recommend workflow changes to prevent recurrence`
    },
    auth: {
      id: 'auth', label: 'Auth Friction Pack',
      prompt: (profile) => `Pull ${profile.company} Auth Friction Pack.
${profile.currentData?.offices ? 'Office auth data: '+JSON.stringify(Object.fromEntries(Object.entries(profile.currentData.offices).map(([k,v])=>[k,{auth:v.auth}]))) : ''}
Analyze: which payers are causing the most auth friction?
What workflow fixes reduce auth lag?
Which office should be prioritized for auth intervention?
Provide 3 specific payer-by-payer recommendations.`
    },
    compliance: {
      id: 'compliance', label: 'Compliance Sweep Pack',
      prompt: (profile) => `Pull ${profile.company} Compliance Sweep Pack.
Analyze all active compliance risks:
- Coding accuracy issues (CPT, ICD-10, modifiers)
- Audit exposure (upcoding patterns, modifier overuse)
- Documentation gaps
- Regulatory threshold breaches (e.g. denial rate vs CMS)
Risk-rank each finding. Provide mitigation plan with owner and deadline for each.`
    },
    executive: {
      id: 'executive', label: 'Executive Brief Pack',
      prompt: (profile) => `Pull ${profile.company} Executive Brief Pack.
Synthesize ALL available data into a 5-point executive brief:
1. Overall health score (0-100) and trend
2. #1 risk right now (with dollar impact)
3. #1 win / best performing area
4. Top 3 actions for this week (ranked by ROI)
5. One strategic recommendation for this month

Write in confident, executive-level language. Concise. Data-driven. No fluff.`
    },
    payer: {
      id: 'payer', label: 'Payer Strategy Pack',
      prompt: (profile) => `Pull ${profile.company} Payer Strategy Pack.
${profile.currentData?.denialCodes ? 'Active denial data: '+JSON.stringify(profile.currentData.denialCodes) : ''}
For each major payer (Medicare, Aetna, BCBS, UHC, United):
1. What is the primary denial pattern?
2. What is the dollar exposure?
3. What is the payer-specific appeal strategy?
4. What documentation prevents future denials with this payer?
Prioritize by dollar recovery opportunity.`
    }
  };

  /* ─────────────────────────────────────────────────────────────
     DOCUMENT TYPES
  ───────────────────────────────────────────────────────────── */
  const DOC_TYPES = {
    appeal: 'a formal payer appeal letter with all required elements (claim number, denial code, clinical justification, supporting documentation list, signature block)',
    auth: 'a prior authorization request letter with clinical necessity justification, CPT codes, ICD-10 codes, and supporting clinical criteria',
    query: 'a physician query letter following AHIMA/ACDIS compliant query format (open-ended, non-leading, with response options)',
    compliance: 'a compliance notice or corrective action memo with findings, root cause, corrective actions, and monitoring plan',
    education: 'a coder education memo covering specific coding guidelines, examples of correct vs incorrect coding, and self-audit checklist',
    executive: 'an executive briefing memo with headline metrics, key findings, strategic implications, and recommended leadership actions'
  };

  /* ─────────────────────────────────────────────────────────────
     MAIN ENGINE OBJECT
  ───────────────────────────────────────────────────────────── */
  const TSMai = {

    version: '1.0.0',
    _profile: null,
    _nodeId: 'default',
    _chatHistory: [],
    _model: 'claude-sonnet-4-20250514',
    _maxTokens: 1000,
    _apiEndpoint: 'https://tsm-shell.fly.dev/api/hc/query',

    /* ── INIT ──────────────────────────────────────────────── */
    init(profileId, nodeId, overrideData) {
      const p = PROFILES[profileId] || PROFILES.federation;
      this._profile = { ...p };
      if (overrideData) {
        this._profile.currentData = { ...p.currentData, ...overrideData };
      }
      this._nodeId = nodeId || 'default';
      this._chatHistory = [];
      console.log(`TSMai initialized: ${p.company} · node: ${this._nodeId}`);
      return this;
    },

    /* ── SET ACTIVE PROFILE ────────────────────────────────── */
    setProfile(profileId) {
      this._profile = PROFILES[profileId] || PROFILES.federation;
      return this;
    },

    /* ── UPDATE LIVE DATA ──────────────────────────────────── */
    updateData(data) {
      if (this._profile) {
        this._profile.currentData = { ...this._profile.currentData, ...data };
      }
      return this;
    },

    /* ── BUILD SYSTEM PROMPT ───────────────────────────────── */
    _buildSystem(extraContext) {
      const profile = this._profile || PROFILES.federation;
      const nodeCtx = NODE_CONTEXTS[this._nodeId] || NODE_CONTEXTS.default;
      const profileCtx = typeof profile.systemPrompt === 'function'
        ? profile.systemPrompt()
        : `You are the AI assistant for ${profile.company}.`;
      return [profileCtx, nodeCtx, extraContext].filter(Boolean).join('\n\n');
    },

    /* ── CORE API CALL ─────────────────────────────────────── */
    async call(userMsg, opts = {}) {
      const system = opts.system || this._buildSystem(opts.extraContext);
      const messages = opts.messages || [{ role: 'user', content: userMsg }];

      const body = {
        model: opts.model || this._model,
        max_tokens: opts.maxTokens || this._maxTokens,
        system,
        messages
      };

      const resp = await fetch(this._apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await resp.json();
      if (data.error) throw new Error(data.error.message || 'API error');
      if (!data.content || !data.content) throw new Error('Empty response');
      return data.content;
    },

    /* ── STREAM TO ELEMENT (typewriter effect) ─────────────── */
    async stream(userMsg, outputEl, opts = {}) {
      this.ui.thinking(opts.thinkEl, true, opts.thinkMsg);
      this.ui.clear(outputEl);
      this.ui.clearError(opts.errEl);
      this._setStatus('synthesizing');

      try {
        const text = await this.call(userMsg, opts);
        this.ui.thinking(opts.thinkEl, false);

        if (opts.typewriter !== false) {
          await this._typewrite(text, outputEl);
        } else {
          this.ui.output(outputEl, text);
        }

        this._setStatus('ready');
        if (opts.onSuccess) opts.onSuccess(text);
        return text;

      } catch (e) {
        this.ui.thinking(opts.thinkEl, false);
        this.ui.error(opts.errEl || outputEl, e.message);
        this._setStatus('error');
        if (opts.onError) opts.onError(e);
        throw e;
      }
    },

    /* ── PULL PACK ─────────────────────────────────────────── */
    async pack(packId, outputEl, opts = {}) {
      const pack = PACKS[packId];
      if (!pack) {
        this.ui.error(outputEl, `Unknown pack: ${packId}`);
        return;
      }
      const profile = this._profile || PROFILES.federation;
      const prompt = pack.prompt(profile);

      opts.thinkMsg = opts.thinkMsg || `Pulling ${pack.label}...`;
      opts.extraContext = `PACK: ${pack.label}`;
      return this.stream(prompt, outputEl, opts);
    },

    /* ── MULTI-TURN CHAT ───────────────────────────────────── */
    async chat(userMsg, outputEl, opts = {}) {
      this._chatHistory.push({ role: 'user', content: userMsg });

      this.ui.thinking(opts.thinkEl, true, opts.thinkMsg || 'Thinking...');
      this._setStatus('synthesizing');

      try {
        const system = this._buildSystem(opts.extraContext);
        const text = await this.call(null, {
          system,
          messages: [...this._chatHistory],
          maxTokens: opts.maxTokens || 400
        });

        this._chatHistory.push({ role: 'assistant', content: text });
        this.ui.thinking(opts.thinkEl, false);
        this.ui.chatMessage(outputEl, text, 'assistant');
        this._setStatus('ready');
        return text;

      } catch (e) {
        this.ui.thinking(opts.thinkEl, false);
        this.ui.chatMessage(outputEl, `Error: ${e.message}`, 'error');
        this._setStatus('error');
        throw e;
      }
    },

    chatReset() {
      this._chatHistory = [];
    },

    /* ── DOCUMENT DRAFT ────────────────────────────────────── */
    async draft(docType, context, outputEl, opts = {}) {
      const docDesc = DOC_TYPES[docType] || 'a professional document';
      const profile = this._profile || PROFILES.federation;
      const prompt = `Draft ${docDesc} for ${profile.company}.

Context provided: ${context}

Requirements:
- Professional, ready-to-send format
- Include all required fields and sections
- Appropriate tone for the document type
- Specific to the provided context — not generic`;

      opts.thinkMsg = opts.thinkMsg || `Drafting ${docType}...`;
      opts.maxTokens = opts.maxTokens || 1200;
      return this.stream(prompt, outputEl, opts);
    },

    /* ── HEALTH SCORE ──────────────────────────────────────── */
    async score(dataContext, scoreEl, labelEl) {
      const profile = this._profile || PROFILES.federation;
      try {
        const text = await this.call(
          `Score the overall operational health for ${profile.company} given this data: ${JSON.stringify(dataContext || profile.currentData)}. Return ONLY valid JSON: {"score": NUMBER_0_TO_100, "label": "SHORT_LABEL_UNDER_5_WORDS", "trend": "up|down|stable"}. No other text.`,
          {
            system: 'You are a scoring engine. Return only valid JSON. No markdown, no explanation.',
            maxTokens: 60
          }
        );
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        if (scoreEl) {
          scoreEl.textContent = parsed.score;
          scoreEl.style.color = parsed.score >= 75 ? 'var(--g,#00cc50)' : parsed.score >= 55 ? 'var(--amber,#ffaa00)' : 'var(--red,#ff4455)';
        }
        if (labelEl) labelEl.textContent = parsed.label;
        return parsed;
      } catch (e) {
        if (scoreEl) scoreEl.textContent = '—';
        if (labelEl) labelEl.textContent = 'unavailable';
        return null;
      }
    },

    /* ── LIVE SIGNALS ──────────────────────────────────────── */
    async signals(outputEl, opts = {}) {
      const profile = this._profile || PROFILES.federation;
      const count = opts.count || 4;
      const prompt = `Generate the top ${count} live operational signals for ${profile.company} right now.
Data: ${JSON.stringify(profile.currentData || {})}.
For each signal return:
- icon: one of ⚡▲◎◈▣
- title: under 8 words
- sub: one sentence detail with source node/office
- urgency: URGENT | HIGH | MED | LOW | INFRA

Return ONLY valid JSON array. No markdown. Example:
[{"icon":"⚡","title":"signal title","sub":"detail here · Source: node","urgency":"HIGH"}]`;

      try {
        const text = await this.call(prompt, {
          system: 'You are a signal engine. Return only a valid JSON array. No markdown fences.',
          maxTokens: 400
        });
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);

        if (outputEl) {
          this._renderSignals(parsed, outputEl, opts.colorClass || 'hh');
        }
        return parsed;
      } catch (e) {
        if (outputEl) outputEl.innerHTML = `<div style="font-size:10px;color:#ff4455">Signals unavailable: ${e.message}</div>`;
        return [];
      }
    },

    _renderSignals(signals, container, colorClass) {
      const urgencyColors = {
        URGENT: '#ff4455', HIGH: '#ffaa00', MED: '#a855f7', LOW: '#00cc50', INFRA: '#00e5cc'
      };
      const urgencyBg = {
        URGENT: 'rgba(255,68,85,.1)', HIGH: 'rgba(255,170,0,.1)',
        MED: 'rgba(168,85,247,.1)', LOW: 'rgba(0,255,100,.08)', INFRA: 'rgba(0,229,204,.08)'
      };
      container.innerHTML = signals.map(s => {
        const col = urgencyColors[s.urgency] || '#5a7a5a';
        const bg = urgencyBg[s.urgency] || 'transparent';
        return `<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid rgba(0,0,0,.06)">
          <div style="font-size:12px;flex-shrink:0;margin-top:1px;color:${col}">${s.icon}</div>
          <div style="flex:1">
            <div style="font-size:10px;font-weight:600;margin-bottom:2px">${s.title}</div>
            <div style="font-size:9px;color:#5a7a5a;line-height:1.4">${s.sub}</div>
          </div>
          <div style="font-size:7px;padding:2px 6px;border-radius:3px;background:${bg};color:${col};font-weight:700;flex-shrink:0;margin-top:2px;white-space:nowrap">${s.urgency}</div>
        </div>`;
      }).join('');
    },

    /* ── STRATEGIST ANALYSIS ───────────────────────────────── */
    async strategist(mode, contextText, outputEl, opts = {}) {
      const profile = this._profile || PROFILES.federation;
      const modePrompts = {
        priority:   'Identify the single highest-priority action right now. Top issue, source, dollar impact, 3 immediate actions in order, who acts first.',
        denial:     'Denial rate root cause analysis and recovery strategy. Analyze top denial codes, payer patterns, and provide a phased recovery roadmap.',
        revenue:    'Full revenue recovery opportunity map. Rank all revenue risks by recovery probability and dollar value. Give a sequenced action plan.',
        compliance: 'Compliance risk assessment. Analyze coding accuracy, documentation gaps, audit exposure. Risk-rank each and provide mitigation plan with owners.',
        payer:      'Payer-specific strategy. For each major payer: denial pattern, dollar exposure, appeal strategy, documentation requirements.',
        coding:     'Coding quality audit across all offices. Identify coding drift patterns, education needs, and a coaching action plan per office.',
        forecast:   '30-day revenue cycle forecast. Project denial rate, revenue recovery, and clean claim rate improvements if recommended actions are taken.',
        board:      'Board-ready executive talking points. Frame current challenges as managed opportunities. Confident, data-driven, concise. 5 bullet points max.'
      };

      const modeInstruction = modePrompts[mode] || modePrompts.priority;
      const prompt = `${profile.company} HC Strategist Analysis — Mode: ${mode.toUpperCase()}

Instruction: ${modeInstruction}

${contextText ? 'Additional context from operator: ' + contextText : ''}

Pull ${profile.company} healthcare mesh. Apply company profile. Scoped HC-only analysis.`;

      opts.thinkMsg = opts.thinkMsg || `Running ${mode} analysis...`;
      opts.maxTokens = opts.maxTokens || 1000;
      return this.stream(prompt, outputEl, opts);
    },

    /* ── QUICK ASK ─────────────────────────────────────────── */
    async ask(question, outputEl, opts = {}) {
      opts.thinkMsg = opts.thinkMsg || 'Synthesizing...';
      return this.stream(question, outputEl, opts);
    },

    /* ── WIRE — attach AI to existing DOM elements ─────────── */
    wire(config) {
      /**
       * config = {
       *   trigger: '#btn-id' | HTMLElement,       // button or element that triggers the call
       *   output: '#out-id' | HTMLElement,         // where AI text renders
       *   thinking: '#think-id' | HTMLElement,     // optional loading bar
       *   error: '#err-id' | HTMLElement,          // optional error display
       *   input: '#input-id' | HTMLElement,        // optional input field for prompt
       *   type: 'stream' | 'pack' | 'strategist' | 'draft' | 'chat',
       *   packId: 'revenue',                       // for type='pack'
       *   mode: 'priority',                        // for type='strategist'
       *   prompt: 'static prompt string',          // for type='stream'
       *   docType: 'appeal',                       // for type='draft'
       *   event: 'click',                          // default: click
       *   onSuccess: (text) => {},
       * }
       */
      const get = (sel) => typeof sel === 'string' ? document.querySelector(sel) : sel;
      const triggerEl = get(config.trigger);
      const outputEl  = get(config.output);
      const thinkEl   = get(config.thinking);
      const errEl     = get(config.error);
      const inputEl   = get(config.input);

      if (!triggerEl || !outputEl) {
        console.warn('TSMai.wire: trigger or output element not found', config);
        return this;
      }

      const event = config.event || 'click';
      const opts = { thinkEl, errEl, onSuccess: config.onSuccess };

      triggerEl.addEventListener(event, async (e) => {
        e.preventDefault();
        const inputVal = inputEl ? (inputEl.value || inputEl.textContent || '') : '';

        switch (config.type) {
          case 'pack':
            await this.pack(config.packId, outputEl, opts);
            break;
          case 'strategist':
            await this.strategist(config.mode || 'priority', inputVal, outputEl, opts);
            break;
          case 'draft':
            await this.draft(config.docType || 'appeal', inputVal, outputEl, opts);
            break;
          case 'chat':
            if (inputVal) await this.chat(inputVal, outputEl, opts);
            if (inputEl) inputEl.value = '';
            break;
          case 'score':
            await this.score(null, config.scoreEl ? get(config.scoreEl) : null, config.labelEl ? get(config.labelEl) : null);
            break;
          case 'signals':
            await this.signals(outputEl, opts);
            break;
          case 'stream':
          default:
            const prompt = config.prompt || inputVal;
            if (prompt) await this.stream(prompt, outputEl, opts);
            break;
        }
      });

      return this;
    },

    /* ── WIRE ALL — scan page for data-tsmai attributes ─────── */
    wireAll() {
      /**
       * Scans the page for elements with data-tsmai-* attributes and wires them automatically.
       * Usage in HTML:
       *   <button data-tsmai="pack" data-tsmai-pack="revenue" data-tsmai-output="#my-out">Pull Revenue</button>
       *   <button data-tsmai="stream" data-tsmai-prompt="What is the top issue?" data-tsmai-output="#out">Ask</button>
       *   <button data-tsmai="strategist" data-tsmai-mode="denial" data-tsmai-output="#out">Run</button>
       *   <button data-tsmai="score" data-tsmai-score="#score-el" data-tsmai-label="#label-el">Score</button>
       */
      document.querySelectorAll('[data-tsmai]').forEach(el => {
        const type = el.getAttribute('data-tsmai');
        const output = el.getAttribute('data-tsmai-output');
        if (!output) return;

        this.wire({
          trigger: el,
          output,
          thinking: el.getAttribute('data-tsmai-thinking'),
          error:    el.getAttribute('data-tsmai-error'),
          input:    el.getAttribute('data-tsmai-input'),
          type,
          packId:   el.getAttribute('data-tsmai-pack'),
          mode:     el.getAttribute('data-tsmai-mode'),
          prompt:   el.getAttribute('data-tsmai-prompt'),
          docType:  el.getAttribute('data-tsmai-doc'),
          scoreEl:  el.getAttribute('data-tsmai-score'),
          labelEl:  el.getAttribute('data-tsmai-label')
        });
      });
      return this;
    },

    /* ── UI HELPERS ────────────────────────────────────────── */
    ui: {
      thinking(el, show, msg) {
        if (!el) return;
        if (typeof el === 'string') el = document.querySelector(el);
        if (!el) return;
        if (show) {
          el.style.display = 'flex';
          if (msg) {
            const span = el.querySelector('.tsmai-think-txt');
            if (span) span.textContent = msg;
          }
        } else {
          el.style.display = 'none';
        }
      },
      output(el, text) {
        if (!el) return;
        if (typeof el === 'string') el = document.querySelector(el);
        if (!el) return;
        el.textContent = text;
        el.style.display = 'block';
        el.classList.add('tsmai-show');
      },
      clear(el) {
        if (!el) return;
        if (typeof el === 'string') el = document.querySelector(el);
        if (!el) return;
        el.textContent = '';
        el.classList.remove('tsmai-show');
      },
      error(el, msg) {
        if (!el) return;
        if (typeof el === 'string') el = document.querySelector(el);
        if (!el) return;
        el.textContent = `Error: ${msg}`;
        el.style.display = 'block';
        el.classList.add('tsmai-show');
      },
      clearError(el) {
        if (!el) return;
        if (typeof el === 'string') el = document.querySelector(el);
        if (!el) return;
        el.style.display = 'none';
        el.classList.remove('tsmai-show');
      },
      chatMessage(container, text, role) {
        if (!container) return;
        if (typeof container === 'string') container = document.querySelector(container);
        if (!container) return;
        const div = document.createElement('div');
        div.className = `tsmai-msg tsmai-msg-${role}`;
        div.textContent = text;
        div.style.cssText = role === 'user'
          ? 'background:rgba(0,255,100,.08);border:1px solid rgba(0,255,100,.14);border-radius:4px;padding:7px 10px;margin-bottom:6px;font-size:10px;line-height:1.5;text-align:right'
          : role === 'error'
          ? 'background:rgba(255,68,85,.1);border:1px solid rgba(255,68,85,.25);border-radius:4px;padding:7px 10px;margin-bottom:6px;font-size:10px;color:#ff4455'
          : 'background:rgba(0,0,0,.04);border:1px solid rgba(0,0,0,.08);border-left:2px solid rgba(0,255,100,.4);border-radius:0 4px 4px 0;padding:7px 10px;margin-bottom:6px;font-size:10px;line-height:1.6';
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
      }
    },

    /* ── STATUS ─────────────────────────────────────────────── */
    _statusEl: null,
    setStatusEl(el) {
      this._statusEl = typeof el === 'string' ? document.querySelector(el) : el;
      return this;
    },
    _setStatus(state) {
      if (!this._statusEl) {
        this._statusEl = document.querySelector('#sb-status, .tsmai-status, [data-tsmai-status]');
      }
      if (!this._statusEl) return;
      const labels = { synthesizing: '◈ SYNTHESIZING...', ready: 'READY', error: 'ERROR' };
      this._statusEl.textContent = labels[state] || state.toUpperCase();
    },

    /* ── TYPEWRITER ─────────────────────────────────────────── */
    async _typewrite(text, el, speed) {
      if (!el) return;
      el.textContent = '';
      el.style.display = 'block';
      el.classList.add('tsmai-show');
      const chunkSize = 4;
      const delay = speed || 8;
      for (let i = 0; i < text.length; i += chunkSize) {
        el.textContent += text.slice(i, i + chunkSize);
        el.scrollTop = el.scrollHeight;
        await new Promise(r => setTimeout(r, delay));
      }
    },

    /* ── INJECT DEFAULT STYLES ──────────────────────────────── */
    injectStyles() {
      if (document.getElementById('tsmai-styles')) return;
      const style = document.createElement('style');
      style.id = 'tsmai-styles';
      style.textContent = `
        .tsmai-out {
          background: var(--bg3, rgba(0,0,0,.06));
          border: 1px solid rgba(168,85,247,.2);
          border-left: 2px solid var(--purple, #a855f7);
          border-radius: 3px; padding: 11px;
          font-size: 10px; line-height: 1.7;
          white-space: pre-wrap; display: none; margin-top: 8px;
        }
        .tsmai-out.tsmai-show { display: block; }
        .tsmai-out.tsmai-hc { border-left-color: var(--g, #00ff64); }
        .tsmai-err {
          background: rgba(255,68,85,.1);
          border: 1px solid rgba(255,68,85,.25);
          border-radius: 3px; padding: 9px;
          font-size: 10px; color: #ff4455;
          display: none; margin-top: 8px;
        }
        .tsmai-err.tsmai-show { display: block; }
        .tsmai-thinking {
          display: none; align-items: center; gap: 8px;
          padding: 8px 10px; border-radius: 3px; margin-top: 8px;
          background: rgba(168,85,247,.1);
          border: 1px solid rgba(168,85,247,.2);
          font-size: 9px; color: #a855f7;
        }
        .tsmai-thinking.tsmai-show { display: flex; }
        .tsmai-think-spin {
          width: 11px; height: 11px; flex-shrink: 0;
          border: 1.5px solid rgba(168,85,247,.3);
          border-top-color: #a855f7; border-radius: 50%;
          animation: tsmai-spin 1s linear infinite;
        }
        @keyframes tsmai-spin { to { transform: rotate(360deg); } }
      `;
      document.head.appendChild(style);
      return this;
    },

    /* ── SCAFFOLD — inject a thinking bar HTML into a container ─ */
    scaffoldThinking(containerId, id, msg) {
      const el = document.getElementById(containerId);
      if (!el) return;
      const div = document.createElement('div');
      div.id = id;
      div.className = 'tsmai-thinking';
      div.innerHTML = `<div class="tsmai-think-spin"></div><span class="tsmai-think-txt">${msg || 'Synthesizing...'}</span>`;
      el.appendChild(div);
      return div;
    },

    /* ── EXPOSE PROFILES + PACKS for external access ─────────── */
    profiles: PROFILES,
    packs: PACKS,
    nodeContexts: NODE_CONTEXTS,
    docTypes: DOC_TYPES
  };

  /* ── EXPOSE GLOBALLY ──────────────────────────────────────── */
  global.TSMai = TSMai;

  /* ── AUTO-INIT on DOMContentLoaded if data-tsmai-profile set ─ */
  document.addEventListener('DOMContentLoaded', () => {
    TSMai.injectStyles();
    const body = document.body;
    const profileAttr = body.getAttribute('data-tsmai-profile');
    const nodeAttr    = body.getAttribute('data-tsmai-node');
    if (profileAttr) {
      TSMai.init(profileAttr, nodeAttr || 'default');
      TSMai.wireAll();
    }
  });

})(window);
