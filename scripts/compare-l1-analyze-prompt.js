#!/usr/bin/env node
'use strict';
// Fair before/after comparison for the L1 analyze prompt's CMDB block:
//   BEFORE -- the full, unfiltered cmdbContext (snAdapter.getTicket()'s
//     entire normalized record, including .raw -- every ServiceNow table
//     column, as {value, display_value} pairs)
//   AFTER  -- the same cmdbContext run through
//     server/l1-copilot/analyze-cmdb-allowlist.js
//
// For each real incident, runs SAMPLES_PER_VERSION calls per version at
// temperature 0 (so repeated samples measure consistency, not creativity),
// against the SAME model for both versions (the model is what you pick --
// isolating the prompt-content change is the point, so don't compare
// across two different models). Reports per-sample token usage and parsed
// severity/issue_summary so you can compute token savings and a severity
// agreement rate yourself (old vs new, and within-version consistency).
//
// SECURITY: GROQ_API_KEY is read from the environment and used only in the
// Authorization header of the outbound fetch -- never logged, never
// written to the output file.
//
// On a 429, retries using the same Retry-After-aware backoff as production
// (server/l1-copilot/retry-delay.js) rather than a flat guess. Groq's daily
// token cap (TPD) is a real, frequently-hit constraint in this account at
// time of writing -- if every retry for a sample is exhausted, that
// sample is recorded with status 429 and a null severity rather than
// blocking the whole run.
//
// USAGE:
//   GROQ_API_KEY=... SERVICENOW_INSTANCE_URL=... SERVICENOW_USERNAME=... SERVICENOW_PASSWORD=... \
//   node scripts/compare-l1-analyze-prompt.js <model> <incidentNumbersJSON> <outputPath>
//
// Example:
//   node scripts/compare-l1-analyze-prompt.js openai/gpt-oss-120b \
//     '["INC0000060","INC0009002","INC0000009","INC0000010","INC0000011","INC0000012","INC0000013","INC0000014"]' \
//     /tmp/prompt-compare-report.json
//
// Before running against a model, it's worth a single cheap probe at a
// realistic prompt size first to confirm that model isn't already at its
// daily cap -- this script does NOT pre-check quota or wait for a reset,
// it just runs and lets the per-call retry loop do its job.

const path = require('path');
const adapter = require(path.join(__dirname, '..', 'server', 'l1-copilot', 'servicenow-adapter'));
const { allowlistCmdbContext } = require(path.join(__dirname, '..', 'server', 'l1-copilot', 'analyze-cmdb-allowlist'));
const { retryDelayMs } = require(path.join(__dirname, '..', 'server', 'l1-copilot', 'retry-delay'));

const SAMPLES_PER_VERSION = 3;
const MAX_429_RETRIES = 6;

const SYSTEM_PROMPT = 'You are a Senior Network and Systems Engineer acting as the decision-making core of TSM L1 Ticket Copilot, a desktop/network support triage tool. You have 15+ years of enterprise IT experience across Windows/macOS endpoint management, Active Directory/Entra ID, DNS/DHCP, VLAN and routing, firewall/ACL policy, VPN and SD-WAN, virtualization, Microsoft 365/Azure, and OEM hardware (Dell, HP, Lenovo, Cisco, Meraki, Fortinet). Triage every ticket in OSI-layer order — physical/hardware first, then link/network (VLAN, switchport, DHCP, DNS), then transport/session (VPN, firewall, auth/SSO/MFA), then application — and do not skip layers. Distinguish clearly between an L1-actionable fix, a fix that needs elevated/L2 access, and a fix that needs vendor hardware service, and say which one applies and why. When recommending escalation, name the correct team (Desktop, Network, Server, Azure, O365, Security, Application, or Vendor) based on where in the stack the root cause actually sits, not just ticket category. Be precise, operational, and quantify confidence and risk where you can. No filler, no preamble, no restating the question back.';

function buildPrompt(ticket, cmdbBlockContent) {
  const summary = JSON.stringify({
    incident: ticket.incident, priority: ticket.priority, requester: ticket.requester,
    department: ticket.department, asset: ticket.asset, manufacturer: ticket.manufacturer,
    model: ticket.model, warranty: ticket.warranty
  }, null, 2);
  const cmdbBlock = cmdbBlockContent
    ? `\nReal CMDB/ServiceNow data for this asset/incident (trust this over the agent-typed fields above if they conflict):\n${JSON.stringify(cmdbBlockContent, null, 2)}\n`
    : '';
  return `Ticket metadata (may be incomplete — fields left blank were not provided):\n${summary}\n${cmdbBlock}\n` +
    `Ticket description (raw, as pasted by the agent):\n${ticket.description}\n\n` +
    `Do two things and return ONLY valid JSON, no markdown, no backticks, in exactly this shape:\n\n` +
    `1) Analyze the ticket:\n` +
    `{"issue_summary":"one sentence","likely_causes":["cause 1","cause 2"],"confidence":0-100 (a plain integer digit like 85 — never spell the number out as a word),` +
    `"affected_system":"short label","business_impact":"short label","severity":"Low|Medium|High|Critical",` +
    `"recommended_path":"the single next diagnostic or remediation step, and why",` +
    `\n\n2) Extract structured fields mentioned ANYWHERE in the ticket description or metadata above ` +
    `(incident number, priority, requester name, department, assignment group, asset/hostname/tag, ` +
    `manufacturer, model, warranty/support tier). Only include a value if it is actually stated or clearly ` +
    `implied in the text — use null for anything not present. Do not invent values.\n` +
    `"extracted_fields":{"incident":null,"priority":null,"requester":null,"department":null,` +
    `"assignmentGroup":null,"asset":null,"manufacturer":null,"model":null,"warranty":null}}\n\n` +
    `Return one JSON object with both the analysis keys and the "extracted_fields" key at the same top level.`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Same approach as production's groqChat(): on a 429, prefer the response's
// real Retry-After header (production's retry-delay.js), fall back to
// parsing the error body's "try again in Xs" text. Retry in place rather
// than guessing a pre-call wait from the reset-tokens header, which turned
// out to have an inconsistent format (plain "577ms" vs "43.897s" vs
// "14m24s") not worth re-deriving a parser for for a one-off script.
async function callGroq(model, prompt) {
  const groqKey = process.env.GROQ_API_KEY;

  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + groqKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        temperature: 0,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }]
      })
    });

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      const errMsg = data.error && data.error.message;
      if (attempt < MAX_429_RETRIES) {
        const delay = retryDelayMs({ retryAfterHeader: res.headers.get('retry-after'), errMsg, fallbackMs: 5000, maxMs: 20000, headerMaxMs: 65000 });
        console.log(`  [429, attempt ${attempt + 1}/${MAX_429_RETRIES + 1}] waiting ${delay}ms (${errMsg ? errMsg.slice(0, 80) : 'no detail'})`);
        await sleep(delay);
        continue;
      }
      return { status: 429, usage: null, error: data.error || { message: 'exhausted retries' }, content: null };
    }

    const data = await res.json();
    return { status: res.status, usage: data.usage || null, error: data.error || null, content: data?.choices?.[0]?.message?.content || null };
  }
}

function parseAnalysis(content) {
  if (!content) return null;
  try { return JSON.parse(content.replace(/```json|```/g, '').trim()); } catch (e) { return null; }
}

async function runVersion(model, ticket, cmdbBlockContent, label) {
  const prompt = buildPrompt(ticket, cmdbBlockContent);
  const samples = [];
  for (let i = 0; i < SAMPLES_PER_VERSION; i++) {
    await sleep(1500); // small courtesy gap between calls; real pacing is the 429 retry loop in callGroq
    const result = await callGroq(model, prompt);
    const analysis = parseAnalysis(result.content);
    samples.push({ status: result.status, usage: result.usage, error: result.error, severity: analysis && analysis.severity, issue_summary: analysis && analysis.issue_summary });
    console.log(`  [${label} #${i + 1}] status=${result.status} tokens=${result.usage ? result.usage.total_tokens : 'n/a'} severity=${analysis && analysis.severity}`);
  }
  return { promptChars: prompt.length, samples };
}

function usageAndExit(message) {
  if (message) console.error(message);
  console.error('\nUsage: node scripts/compare-l1-analyze-prompt.js <model> <incidentNumbersJSON> <outputPath>');
  console.error('Example: node scripts/compare-l1-analyze-prompt.js openai/gpt-oss-120b \'["INC0000060","INC0009002"]\' /tmp/report.json');
  process.exit(1);
}

async function main() {
  const [model, incidentNumbersArg, outPath] = process.argv.slice(2);
  if (!model || !incidentNumbersArg || !outPath) usageAndExit('model, incidentNumbersJSON, and outputPath are all required.');
  if (!process.env.GROQ_API_KEY) usageAndExit('GROQ_API_KEY must be set in the environment.');

  let incidentNumbers;
  try { incidentNumbers = JSON.parse(incidentNumbersArg); } catch (e) { usageAndExit('incidentNumbersJSON must be valid JSON, e.g. \'["INC0000060","INC0009002"]\' (got: ' + e.message + ')'); }
  if (!Array.isArray(incidentNumbers) || incidentNumbers.length === 0) usageAndExit('incidentNumbersJSON must be a non-empty array of incident numbers.');

  const report = [];

  for (const incidentNumber of incidentNumbers) {
    console.log(`\n=== ${incidentNumber} ===`);
    const ticketRec = await adapter.getTicket(incidentNumber).catch(() => null);
    const cmdbContext = ticketRec ? { asset: null, ticket: ticketRec } : null;

    const ticket = {
      incident: incidentNumber,
      priority: '3 - Medium',
      requester: 'Fair Comparison Test User',
      department: 'IT',
      description: '[fair-compare] sample description for ' + incidentNumber
    };

    console.log('  real short_description:', ticketRec && ticketRec.description);

    const before = await runVersion(model, ticket, cmdbContext, 'BEFORE');
    const after = await runVersion(model, ticket, allowlistCmdbContext(cmdbContext), 'AFTER');

    report.push({ incidentNumber, realShortDescription: ticketRec && ticketRec.description, before, after });
    require('fs').writeFileSync(outPath, JSON.stringify(report, null, 2)); // incremental save
  }

  console.log('\nWrote final report to', outPath);
}

main().catch(e => { console.error('ERROR', e.stack || e.message); process.exit(1); });
