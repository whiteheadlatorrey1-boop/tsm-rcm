// ══════════════════════════════════════════════════════════════════════
// INSURANCE SUITE API — inject above the catch-all app.use('/api', ...)
// Matches tsmAIJSON pattern used by HC + Construction suites
// ══════════════════════════════════════════════════════════════════════

// ── CORE QUERY ROUTE (multi-purpose, node-aware) ──────────────────────
app.post('/api/insurance/query', async (req, res) => {
  const { action = '', agent = 'SHIELD', payload = {} } = req.body;
  const { context = '', stakeholder = 'Insurance Manager', node = '', priority = 'NORMAL' } = payload;
  const personas = {
    'claims-triage':  'Claims Triage specialist — scores intake severity, routes to adjusters, flags for fraud review',
    'claims-dashboard':'Claims Dashboard analyst — monitors adjuster workload, SLA compliance, and queue health',
    'fnol-intake':    'FNOL Intake specialist — captures First Notice of Loss, validates coverage, initiates claim lifecycle',
    'fraud-signal':   'Fraud Detection analyst — pattern matching, anomaly scoring, network analysis, and SIU referral prep',
    'siu-referral':   'SIU Referral coordinator — packages investigation referrals, documents red flags, maintains audit trail',
    'compliance':     'Insurance Compliance officer — DOI regulations, state filing requirements, reserve adequacy review',
    'audit-prep':     'Audit Preparation specialist — regulatory exam readiness, evidence packaging, exam checklist management',
    'reserving':      'Actuarial Reserving analyst — IBNR projections, loss development, reserve adequacy monitoring',
    'client-360':     'Client Relations specialist — full policyholder profile, policy history, claims, and payment context',
    'az-insurance':   'Arizona market insurance specialist — AZ DOI regulations, state-specific policy guidelines',
    'az-life':        'AZ Life & Annuity specialist — life product quoting, illustration, and compliance for Arizona market',
    'pitch':          'Insurance Business Development specialist — client presentations, value proposition, ROI analysis',
    'strategist':     'Insurance Operations strategist — cross-suite intelligence, ops efficiency, executive advisory',
    'agents-intel':   'Agent Performance analyst — producer metrics, pipeline health, licensing compliance, quota tracking',
    'underwriting':   'Underwriting specialist — risk scoring, appetite matrix, referral queue, declination workflow',
  };
  const persona = personas[node] || 'Insurance intelligence agent for the TSM Insurance Suite';
  const prompt = `You are ${agent}, a ${persona}. Action: ${action}. Stakeholder: ${stakeholder}. Priority: ${priority}. Context: ${context}. Return ONLY valid JSON: {"ok":true,"action":"${action}","agent":"${agent}","node":"${node}","response":"...","key_findings":[],"recommendations":[],"risk_level":"MEDIUM","next_steps":[],"confidence":85}`;
  const result = await tsmAIJSON(prompt, { ok: false, response: 'AI unavailable', ai_status: 'fallback' });
  res.json(result);
});

// ── CLAIMS TRIAGE ─────────────────────────────────────────────────────
app.post('/api/insurance/claims/triage', async (req, res) => {
  const { claim_type = '', description = '', claimant = '', policy_type = '', loss_date = '', context = '' } = req.body;
  const prompt = `You are a Claims Triage AI for the TSM Insurance Suite. Triage this claim: type=${claim_type}, policy=${policy_type}, description=${description}, claimant=${claimant}, loss_date=${loss_date}. Context: ${context}. Return ONLY valid JSON: {"ok":true,"triage_score":0,"severity":"LOW|MEDIUM|HIGH|CRITICAL","priority_rank":1,"route_to":"adjuster queue","fraud_flag":false,"fraud_indicators":[],"recommended_adjuster_type":"","sla_target_hours":24,"next_action":"","notes":""}`;
  const result = await tsmAIJSON(prompt, { ok: false, response: 'AI unavailable' });
  res.json(result);
});

// ── FRAUD SIGNAL ──────────────────────────────────────────────────────
app.post('/api/insurance/fraud/analyze', async (req, res) => {
  const { claim_id = '', claim_type = '', description = '', claimant_history = '', provider = '', context = '' } = req.body;
  const prompt = `You are a Fraud Signal AI analyst for the TSM Insurance Suite. Analyze claim ${claim_id}: type=${claim_type}, description=${description}, claimant_history=${claimant_history}, provider=${provider}. Context: ${context}. Return ONLY valid JSON: {"ok":true,"claim_id":"${claim_id}","signal_score":0,"confidence":0,"red_flags":[],"pattern_categories":[],"network_indicators":[],"siu_referral_recommended":false,"referral_priority":"LOW|MEDIUM|HIGH","narrative":"","recommended_action":""}`;
  const result = await tsmAIJSON(prompt, { ok: false, response: 'AI unavailable' });
  res.json(result);
});

// ── COMPLIANCE CHECK ──────────────────────────────────────────────────
app.post('/api/insurance/compliance/check', async (req, res) => {
  const { state = 'AZ', line_of_business = '', topic = '', context = '' } = req.body;
  const prompt = `You are an Insurance Compliance AI for the TSM Insurance Suite. Check compliance for state=${state}, line_of_business=${line_of_business}, topic=${topic}. Context: ${context}. Return ONLY valid JSON: {"ok":true,"state":"${state}","line_of_business":"${line_of_business}","compliance_status":"COMPLIANT|AT_RISK|NON_COMPLIANT","risk_level":"LOW|MEDIUM|HIGH","findings":[],"filing_deadlines":[],"regulatory_references":[],"action_items":[],"next_review_date":""}`;
  const result = await tsmAIJSON(prompt, { ok: false, response: 'AI unavailable' });
  res.json(result);
});

// ── UNDERWRITING RISK SCORE ───────────────────────────────────────────
app.post('/api/insurance/underwriting/score', async (req, res) => {
  const { applicant = '', line_of_business = '', risk_factors = '', coverage_requested = '', context = '' } = req.body;
  const prompt = `You are an Underwriting AI for the TSM Insurance Suite. Score this risk: applicant=${applicant}, line=${line_of_business}, factors=${risk_factors}, coverage=${coverage_requested}. Context: ${context}. Return ONLY valid JSON: {"ok":true,"risk_score":0,"risk_tier":"PREFERRED|STANDARD|SUBSTANDARD|DECLINE","appetite_match":true,"premium_indication":"","conditions":[],"exclusions":[],"referral_required":false,"decline_reason":"","uwdecision_notes":""}`;
  const result = await tsmAIJSON(prompt, { ok: false, response: 'AI unavailable' });
  res.json(result);
});

// ── AGENT PERFORMANCE BRIEF ───────────────────────────────────────────
app.post('/api/insurance/agents/brief', async (req, res) => {
  const { agent_name = '', period = 'current month', metrics = '', context = '' } = req.body;
  const prompt = `You are an Agent Intelligence AI for the TSM Insurance Suite. Generate a performance brief for agent: ${agent_name}, period: ${period}, metrics: ${metrics}. Context: ${context}. Return ONLY valid JSON: {"ok":true,"agent":"${agent_name}","period":"${period}","performance_tier":"TOP|ON_TRACK|AT_RISK|BELOW_QUOTA","premium_written":0,"policy_count":0,"retention_rate":0,"license_status":"ACTIVE","license_expiry":"","coaching_flags":[],"recognition_flags":[],"recommended_actions":[]}`;
  const result = await tsmAIJSON(prompt, { ok: false, response: 'AI unavailable' });
  res.json(result);
});

// ── RESERVE ADEQUACY ──────────────────────────────────────────────────
app.post('/api/insurance/reserves/review', async (req, res) => {
  const { line_of_business = '', reserve_amount = 0, period = '', loss_data = '', context = '' } = req.body;
  const prompt = `You are an Actuarial Reserve AI for the TSM Insurance Suite. Review reserve adequacy: line=${line_of_business}, amount=${reserve_amount}, period=${period}, loss_data=${loss_data}. Context: ${context}. Return ONLY valid JSON: {"ok":true,"line_of_business":"${line_of_business}","reserve_adequacy":"ADEQUATE|DEFICIENT|REDUNDANT","ibnr_estimate":0,"development_factor":1.0,"confidence_interval":{"low":0,"high":0},"actuarial_flags":[],"recommendations":[],"next_review_date":""}`;
  const result = await tsmAIJSON(prompt, { ok: false, response: 'AI unavailable' });
  res.json(result);
});

// ── EXECUTIVE BRIEF (cross-suite) ─────────────────────────────────────
app.post('/api/insurance/brief', async (req, res) => {
  const { stakeholder = 'CFO', scope = 'full-suite', context = '', period = 'current' } = req.body;
  const prompt = `You are the TSM Insurance Suite AI. Generate an executive brief for ${stakeholder}, scope: ${scope}, period: ${period}. Context: ${context}. Return ONLY valid JSON: {"ok":true,"stakeholder":"${stakeholder}","period":"${period}","brief":"...","claims_summary":{"open":0,"critical":0,"fraud_flags":0},"compliance_status":"","top_risks":[],"key_wins":[],"action_items":[],"confidence":85}`;
  const result = await tsmAIJSON(prompt, { ok: false, response: 'AI unavailable' });
  res.json(result);
});

// ── CONVERSATIONAL CHAT (suite-wide) ─────────────────────────────────
app.post('/api/insurance/chat', async (req, res) => {
  const { message = '', node = '', agent = 'SHIELD', history = [] } = req.body;
  const historyText = history.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
  const prompt = `You are ${agent}, the TSM Insurance Suite AI assistant${node ? ` specializing in ${node}` : ''}.\n${historyText ? `Conversation:\n${historyText}\n\n` : ''}User: ${message}\nReturn ONLY valid JSON: {"ok":true,"response":"...","agent":"${agent}","suggestions":[],"follow_up_actions":[]}`;
  const result = await tsmAIJSON(prompt, { ok: false, response: 'AI unavailable' });
  res.json(result);
});

// ── SIU REFERRAL PACKAGE ──────────────────────────────────────────────
app.post('/api/insurance/siu/referral', async (req, res) => {
  const { claim_id = '', fraud_signals = [], claim_details = '', context = '' } = req.body;
  const prompt = `You are an SIU Referral AI for the TSM Insurance Suite. Prepare referral package for claim ${claim_id}. Fraud signals: ${JSON.stringify(fraud_signals)}. Claim details: ${claim_details}. Context: ${context}. Return ONLY valid JSON: {"ok":true,"claim_id":"${claim_id}","referral_narrative":"...","supporting_evidence":[],"investigation_priorities":[],"recommended_investigators":[],"urgency":"STANDARD|URGENT|CRITICAL","estimated_exposure":0,"referral_ready":true}`;
  const result = await tsmAIJSON(prompt, { ok: false, response: 'AI unavailable' });
  res.json(result);
});

// ── AUDIT PREP ────────────────────────────────────────────────────────
app.post('/api/insurance/audit/prep', async (req, res) => {
  const { exam_type = 'DOI Market Conduct', state = 'AZ', exam_date = '', focus_areas = '', context = '' } = req.body;
  const prompt = `You are an Insurance Audit Prep AI. Prepare for ${exam_type} exam in ${state} on ${exam_date}. Focus areas: ${focus_areas}. Context: ${context}. Return ONLY valid JSON: {"ok":true,"exam_type":"${exam_type}","state":"${state}","readiness_score":0,"checklist":[],"evidence_gaps":[],"high_risk_areas":[],"prep_timeline":[],"document_packages":[]}`;
  const result = await tsmAIJSON(prompt, { ok: false, response: 'AI unavailable' });
  res.json(result);
});

// ── ROUTES ────────────────────────────────────────────────────────────
app.get('/suite/insurance', (req, res) => res.sendFile(require('path').join(__dirname, 'html/tsm-insurance/suite-index.html')));
app.get('/insurance', (req, res) => res.redirect('/suite/insurance'));
app.get('/insurance/hub', (req, res) => res.sendFile(require('path').join(__dirname, 'html/tsm-insurance/index.html')));
