"""
prompt_engine.py — TSM Sovereign Prompt Engine (Groq / LLaMA 3.3-70B)
Builds context-injected, client-data-constrained prompts.
Calls Groq API (openai/gpt-oss-120b) and returns structured analysis.

Set your key: export GROQ_API_KEY=your_key_here

CRITICAL DESIGN PRINCIPLE:
  The system prompt is the enforcement layer. It explicitly forbids the model
  from inferring, estimating, or hallucinating values not present in the
  injected client_context block. Any field that is None is reported as
  "Not provided in source data" — never fabricated.
"""

import json
import os
import urllib.request
import urllib.error

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL   = "openai/gpt-oss-120b"
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"
MAX_TOKENS   = 1500


# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPTS = {

    "compliance": """You are TSM's OIG/CMS Medicare & Medicaid Compliance Analyst.

STRICT OPERATING RULES — READ BEFORE EVERY RESPONSE:
1. You may ONLY reference data explicitly provided in the <client_context> block below.
2. If a field value is null or absent, state: "Not available in source data." DO NOT estimate or infer.
3. Do NOT cite CFR regulations for risks that are not evidenced in the client data.
4. Do NOT invent dollar amounts, percentages, staff counts, or claim counts.
5. If the data is insufficient to perform analysis, say so clearly and list what additional data is needed.
6. Begin every response with: "COMPLIANCE ANALYSIS — [CLIENT NAME] — Source: [SOURCE TYPE]"

OUTPUT STRUCTURE (always follow this order):
- Executive Risk Summary (2-3 sentences, numbers from data only)
- Current Risk Areas (bullet each gap found in data; skip if no data supports it)
- Specific Regulatory Requirements (cite CFR only for identified gaps)
- Revenue at Risk (exact figure from data, or "Not calculable from provided data")
- Recommended Immediate Actions (based on gaps found, not generic boilerplate)
- Data Gaps (list any fields needed for a complete analysis that were absent)""",

    "music": """You are TSM's Music Rights & Royalty Compliance Analyst.

STRICT OPERATING RULES:
1. Reference ONLY data in the <client_context> block.
2. Null fields → "Not available in source data." Never estimate.
3. Do NOT cite PRO agreements or statutory rates not evidenced in the data.
4. Begin: "ROYALTY ANALYSIS — [CLIENT NAME] — Source: [SOURCE TYPE]"

OUTPUT STRUCTURE:
- Rights Summary (from data only)
- Royalty Gaps Identified
- Distribution & Payment Risks
- Revenue at Risk (exact or "Not calculable")
- Recommended Actions
- Data Gaps""",

    "legal": """You are TSM's Legal & Contract Compliance Analyst.

STRICT OPERATING RULES:
1. Reference ONLY data in the <client_context> block.
2. Null fields → "Not available in source data." Never estimate.
3. Do NOT cite statutes for issues not evidenced in the data.
4. Begin: "LEGAL ANALYSIS — [CLIENT NAME] — Source: [SOURCE TYPE]"

OUTPUT STRUCTURE:
- Exposure Summary
- Contract Gaps Identified
- Regulatory Risk Areas
- Financial Exposure (exact or "Not calculable")
- Recommended Actions
- Data Gaps""",

    "financial": """You are TSM's Financial Risk & Audit Analyst.

STRICT OPERATING RULES:
1. Reference ONLY data in the <client_context> block.
2. Null fields → "Not available in source data." Never estimate.
3. Do NOT cite benchmarks or industry averages not in the data.
4. Begin: "FINANCIAL ANALYSIS — [CLIENT NAME] — Source: [SOURCE TYPE]"

OUTPUT STRUCTURE:
- Financial Snapshot (from data only)
- Risk Areas Identified
- Anomalies & Red Flags
- Revenue at Risk (exact or "Not calculable")
- Recommended Actions
- Data Gaps""",
}

DEFAULT_SYSTEM = SYSTEM_PROMPTS["compliance"]


# ─────────────────────────────────────────────────────────────────────────────
# PROMPT BUILDER
# ─────────────────────────────────────────────────────────────────────────────

def build_prompt(metrics: dict, domain: str = "compliance") -> dict:
    """
    Returns a dict with keys: system, user_message
    None values serialized explicitly so the model sees what is absent.
    """
    system_prompt = SYSTEM_PROMPTS.get(domain, DEFAULT_SYSTEM)

    context_data = {
        "client_name":                      metrics.get("client_name") or "Unknown Client",
        "source_file":                      metrics.get("source_file") or "Not provided",
        "source_type":                      metrics.get("source_type") or "Not provided",
        "financial": {
            "total_billed_usd":             metrics.get("total_billed"),
            "total_paid_usd":               metrics.get("total_paid"),
            "total_denied_usd":             metrics.get("total_denied"),
            "denial_rate_pct":              metrics.get("denial_rate_pct"),
            "revenue_at_risk_usd":          metrics.get("revenue_at_risk"),
            "high_risk_claim_count":        metrics.get("high_risk_claims"),
        },
        "compliance": {
            "staff_total":                  metrics.get("staff_total"),
            "overdue_exclusion_screenings": metrics.get("overdue_exclusion_screenings"),
            "last_exclusion_screen_date":   metrics.get("last_exclusion_screen_date"),
            "npi_verified_count":           metrics.get("npi_verified"),
            "enrollment_gaps":              metrics.get("enrollment_gaps"),
        },
        "identified_compliance_gaps":       metrics.get("compliance_gaps") or [],
        "raw_data_snapshot":                metrics.get("raw_snapshot") or "Not available",
    }

    context_json = json.dumps(context_data, indent=2, default=_null_serializer)

    user_message = f"""Analyze the following client data and produce your structured report.

<client_context>
{context_json}
</client_context>

REMINDER: Your analysis must be strictly limited to the data provided above.
- Values shown as null mean that data was NOT in the source file.
- Do not estimate, infer, or fill in null values.
- If a risk area has no supporting data, do not include it in your analysis.
- List absent data fields under "Data Gaps" so the client knows what to provide next."""

    return {"system": system_prompt, "user_message": user_message}


# ─────────────────────────────────────────────────────────────────────────────
# GROQ API CALL
# ─────────────────────────────────────────────────────────────────────────────

def call_groq(prompt: dict, model: str = GROQ_MODEL, max_tokens: int = MAX_TOKENS) -> str:
    """
    Calls Groq (openai/gpt-oss-120b) via OpenAI-compatible endpoint.
    Uses `requests` if available (avoids Cloudflare 1010 blocks from urllib).
    Falls back to urllib with full browser-like headers if requests not installed.
    Returns analysis text — never raises, always returns a string.
    """
    if not GROQ_API_KEY:
        return (
            "[ERROR] GROQ_API_KEY not set.\n"
            "Run:  export GROQ_API_KEY=your_key_here\n"
            "Keys: https://console.groq.com"
        )

    payload = {
        "model":       model,
        "max_tokens":  max_tokens,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": prompt["system"]},
            {"role": "user",   "content": prompt["user_message"]},
        ],
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type":  "application/json",
        "Accept":        "application/json",
        # Groq's API sits behind Cloudflare; urllib's default UA triggers 1010.
        # A standard requests-style UA clears it.
        "User-Agent":    "python-requests/2.31.0",
    }

    # ── Prefer requests (cleaner TLS + header handling) ────────────────────
    try:
        import requests as _requests
        resp = _requests.post(GROQ_URL, json=payload, headers=headers, timeout=30)
        if resp.status_code != 200:
            return f"[GROQ ERROR {resp.status_code}] {resp.text}"
        return resp.json()["choices"][0]["message"]["content"].strip()

    except ImportError:
        pass  # fall through to urllib

    # ── urllib fallback ────────────────────────────────────────────────────
    encoded = json.dumps(payload).encode()
    req = urllib.request.Request(GROQ_URL, data=encoded, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            return data["choices"][0]["message"]["content"].strip()
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        if e.code == 403 and "1010" in body:
            return (
                "[GROQ 403/1010] Cloudflare blocked the request.\n"
                "Fix: pip install requests   (then retry — requests handles TLS differently)\n"
                f"Raw: {body[:300]}"
            )
        return f"[GROQ ERROR {e.code}] {body}"
    except urllib.error.URLError as e:
        return f"[NETWORK ERROR] {str(e.reason)}"
    except (KeyError, IndexError) as e:
        return f"[PARSE ERROR] Unexpected response shape: {str(e)}"
    except Exception as e:
        return f"[ERROR] {str(e)}"


# tsm_bridge_v2.py imports call_claude — alias keeps it compatible
call_claude = call_groq


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _null_serializer(obj):
    if obj is None:
        return "null — not present in source data"
    raise TypeError(f"Not serializable: {type(obj)}")


# ─────────────────────────────────────────────────────────────────────────────
# STANDALONE TEST
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    from data_ingestion import empty_metrics

    test_metrics = empty_metrics()
    test_metrics.update({
        "client_name": "Test Health System",
        "source_file": "claims_q1.csv",
        "source_type": "CSV/Excel",
        "total_billed": 2_100_000,
        "total_denied": 315_000,
        "denial_rate_pct": 15.0,
        "revenue_at_risk": 315_000,
        "staff_total": 180,
        "overdue_exclusion_screenings": 23,
        "compliance_gaps": [
            "23 staff overdue for OIG exclusion screening (42 CFR § 1001.501)",
            "Denial rate 15.0% — claims submission controls review required (42 CFR § 405.874)",
        ],
        "raw_snapshot": "Sample: 50 rows of claims data.",
    })

    prompt = build_prompt(test_metrics, domain="compliance")
    print(f"Model: {GROQ_MODEL}")

    if GROQ_API_KEY:
        print("Calling Groq...\n")
        print(call_groq(prompt))
    else:
        print("[GROQ_API_KEY not set — showing prompt preview]\n")
        print(prompt["user_message"][:600], "...")
