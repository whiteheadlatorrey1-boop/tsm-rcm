/**
 * TSM Universal Guide Engine
 * Automatically detects Vertical (RE, Concierge, Legal, Construction, Healthcare, 
 * Mortgage, Schools, FinOps, Insurance, NOC, Honeywell, Plant Incident, Cyber Incident, 
 * Supplier Shutdown) and Page Role (War Room, Strategist, Exec Portal) to render dynamic step trackers.
 */
(function () {
  // 1. Detect Context from DOM attributes or URL path fallbacks
  function detectContext() {
    const body = document.body;
    const path = window.location.pathname.toLowerCase();

    // Determine Vertical
    let vertical = body.getAttribute("data-vertical");
    if (!vertical) {
      if (path.includes("concierge") || path.includes("hotel")) vertical = "concierge";
      else if (path.includes("legal") || path.includes("law")) vertical = "legal";
      else if (path.includes("construction") || path.includes("build")) vertical = "construction";
      else if (path.includes("healthcare") || path.includes("health") || path.includes("dpm")) vertical = "healthcare";
      else if (path.includes("mortgage") || path.includes("loan")) vertical = "mortgage";
      else if (path.includes("school") || path.includes("edu")) vertical = "schools";
      else if (path.includes("finops") || path.includes("finance")) vertical = "finops";
      else if (path.includes("insurance") || path.includes("claims")) vertical = "insurance";
      else if (path.includes("noc") || path.includes("network")) vertical = "noc";
      else if (path.includes("honeywell") || path.includes("hw-")) vertical = "honeywell";
      else if (path.includes("plant-incident")) vertical = "plant-incident";
      else if (path.includes("cyber-incident")) vertical = "cyber-incident";
      else if (path.includes("supplier-shutdown")) vertical = "supplier-shutdown";
      else vertical = "re"; // Default fallback
    }

    // Determine Page Role
    let role = body.getAttribute("data-page-role");
    if (!role) {
      if (path.includes("exec") || path.includes("board") || path.includes("portal")) role = "exec";
      else if (path.includes("strategist") || path.includes("strategy")) role = "strategist";
      else role = "warroom";
    }

    return { vertical, role };
  }

  // 2. Comprehensive Multi-Vertical Workflow Matrix
  const GUIDE_CONFIGS = {
    re: {
      warroom: {
        title: "GUIDE · RE WAR ROOM INGESTION",
        steps: [
          { id: "s1", label: "Load Property / Loan Ingestion Data", triggerText: ["DOC SEARCH", "FILE SYSTEM", "SAMPLE", "LOAD"] },
          { id: "s2", label: "Run Ingestion Module or Deal Rescue Pack", triggerText: ["MODULES", "DEAL RESCUE", "RUN"] },
          { id: "s3", label: "Save Ingested Analysis", triggerText: ["SAVE", "STORE"] },
          { id: "s4", label: "Relay to RE Strategist", triggerText: ["STRATEGIST", "RELAY"] }
        ]
      },
      strategist: {
        title: "GUIDE · RE STRATEGIST WORKFLOW",
        steps: [
          { id: "s1", label: "Verify Intake & Session Data", triggerText: ["MODULES", "DEAL RESCUE"] },
          { id: "s2", label: "Configure Strategy & Risk Parameters", triggerText: ["TOP RISK", "30-DAY ACTION", "QUICK STRATEGY"] },
          { id: "s3", label: "Generate Strategic Brief", triggerText: ["FULL STRATEGIC BRIEF", "GENERATE BRIEF"] },
          { id: "s4", label: "Escalate to Exec Portal", triggerText: ["EXEC PORTAL", "ESCALATE"] }
        ]
      },
      exec: {
        title: "GUIDE · RE EXEC PORTAL SIGN-OFF",
        steps: [
          { id: "s1", label: "Select Deal Portfolio / Active Case", triggerText: ["DEAL", "PORTFOLIO", "SNAPSHOT"] },
          { id: "s2", label: "Generate Executive Brief", triggerText: ["GENERATE BRIEF", "BRIEF"] },
          { id: "s3", label: "Execute Sign-off / Override", triggerText: ["RESCUE", "SIGN-OFF", "APPROVE"] }
        ]
      }
    },
    concierge: {
      warroom: {
        title: "GUIDE · HOTELOPS WAR ROOM TELEMETRY",
        steps: [
          { id: "s1", label: "Load PMS / BMS Telemetry Data", triggerText: ["SAMPLE", "LOAD", "PMS", "TELEMETRY", "GUEST"] },
          { id: "s2", label: "Parse OTA & Maintenance Alerts", triggerText: ["PARSE", "OTA", "MAINTENANCE", "ALERTS", "RUN"] },
          { id: "s3", label: "Review IoT & Compliance Exposure", triggerText: ["GUEST INTELLIGENCE", "COMPLIANCE", "IOT", "EXPOSURE"] },
          { id: "s4", label: "Relay to HotelOps Strategist", triggerText: ["RELAY TO STRATEGIST", "STRATEGIST", "RELAY"] }
        ]
      },
      strategist: {
        title: "GUIDE · HOTELOPS STRATEGIST WORKFLOW",
        steps: [
          { id: "s1", label: "Audit OTA Overcharges & SLAs", triggerText: ["OTA COMMISSION AUDIT", "SLA", "MAINTENANCE", "OVERCHARGE"] },
          { id: "s2", label: "Review AI Operations Analysis", triggerText: ["EXPLAINABILITY", "ANALYSIS", "OPERATIONS", "DELTA"] },
          { id: "s3", label: "Generate Dispatch & Dispute Packets", triggerText: ["GENERATE DISPATCH", "DISPUTE", "SAVE", "PACKET"] },
          { id: "s4", label: "Escalate to Executive View", triggerText: ["EXECUTIVE VIEW", "ESCALATE", "EXEC PORTAL"] }
        ]
      },
      exec: {
        title: "GUIDE · HOTELOPS EXECUTIVE PORTAL",
        steps: [
          { id: "s1", label: "Review Portfolio Occupancy & GOP", triggerText: ["HILTON", "MARRIOTT", "PORTFOLIO", "OCCUPANCY", "GOP"] },
          { id: "s2", label: "Audit Total Overcharge Exposure", triggerText: ["OTA EXPOSURE", "REVENUE RISK", "FINANCIAL DELTA"] },
          { id: "s3", label: "Approve Board Directives & Refunds", triggerText: ["APPROVE", "DISPUTE", "EXECUTE", "REFUND", "SIGN-OFF"] }
        ]
      }
    },
    legal: {
      warroom: {
        title: "GUIDE · LEGAL WAR ROOM INGESTION",
        steps: [
          { id: "s1", label: "Load Case Files & Filings", triggerText: ["DOC SEARCH", "CASE DATA", "SAMPLE", "LOAD"] },
          { id: "s2", label: "Run Municipal Residency / Factor Audit", triggerText: ["FACTOR", "AUDIT", "MODULES"] },
          { id: "s3", label: "Save Ingested Case Analysis", triggerText: ["SAVE", "STORE"] },
          { id: "s4", label: "Relay to Legal Strategist", triggerText: ["STRATEGIST", "RELAY"] }
        ]
      },
      strategist: {
        title: "GUIDE · LEGAL STRATEGIST WORKFLOW",
        steps: [
          { id: "s1", label: "Verify Case Citations & Precedent", triggerText: ["CITATIONS", "PRECEDENT", "INTAKE"] },
          { id: "s2", label: "Configure Litigation Strategy", triggerText: ["MOTION", "SETTLEMENT", "RISK", "PARAM"] },
          { id: "s3", label: "Generate Defense Brief", triggerText: ["GENERATE BRIEF", "DEFENSE BRIEF"] },
          { id: "s4", label: "Escalate to Senior Partner Portal", triggerText: ["EXEC PORTAL", "ESCALATE", "PARTNER"] }
        ]
      },
      exec: {
        title: "GUIDE · LEGAL EXECUTIVE PORTAL",
        steps: [
          { id: "s1", label: "Review Firm Case Portfolio Risk", triggerText: ["PORTFOLIO", "FIRM RISK", "ACTIVE CASE"] },
          { id: "s2", label: "Audit Settlement Deltas", triggerText: ["IMPACT DELTA", "FINANCIAL EXPOSURE", "BRIEF"] },
          { id: "s3", label: "Authorize Litigation Spend & Motions", triggerText: ["AUTHORIZE", "APPROVE", "SIGN-OFF"] }
        ]
      }
    },
    construction: {
      warroom: {
        title: "GUIDE · CONSTRUCTION WAR ROOM INGESTION",
        steps: [
          { id: "s1", label: "Load Site Inspection & Subcontract Logs", triggerText: ["SITE LOGS", "INSPECTION", "SAMPLE", "LOAD"] },
          { id: "s2", label: "Run Permitting & Safety Overrun Audit", triggerText: ["PERMIT", "OVERRUN", "MODULES"] },
          { id: "s3", label: "Save Site Telemetry", triggerText: ["SAVE", "STORE"] },
          { id: "s4", label: "Relay to Construction Strategist", triggerText: ["STRATEGIST", "RELAY"] }
        ]
      },
      strategist: {
        title: "GUIDE · CONSTRUCTION STRATEGIST WORKFLOW",
        steps: [
          { id: "s1", label: "Audit Vendor Change Orders & SLAs", triggerText: ["CHANGE ORDER", "SLA", "VENDOR"] },
          { id: "s2", label: "Review Material Cost Overruns", triggerText: ["COST DELTA", "ANALYSIS", "OVERRUN"] },
          { id: "s3", label: "Generate Remediation Directives", triggerText: ["GENERATE DIRECTIVE", "SAVE", "PACKET"] },
          { id: "s4", label: "Escalate to Developer Exec Portal", triggerText: ["EXEC PORTAL", "ESCALATE"] }
        ]
      },
      exec: {
        title: "GUIDE · CONSTRUCTION EXEC PORTAL",
        steps: [
          { id: "s1", label: "Review Multi-Project Contingency Reserves", triggerText: ["PROJECTS", "RESERVES", "PORTFOLIO"] },
          { id: "s2", label: "Audit Total SLA Penalties & Delays", triggerText: ["PENALTIES", "EXPOSURE", "RISK"] },
          { id: "s3", label: "Sign-off Project Funding & Overruns", triggerText: ["SIGN-OFF", "APPROVE", "FUNDING"] }
        ]
      }
    },
    healthcare: {
      warroom: {
        title: "GUIDE · HEALTHCARE WAR ROOM TELEMETRY",
        steps: [
          { id: "s1", label: "Load EHR / Claims Telemetry Data", triggerText: ["SAMPLE", "EHR", "CLAIMS", "LOAD"] },
          { id: "s2", label: "Parse Denial Flags & HIPAA Exposure", triggerText: ["PARSE", "DENIAL", "HIPAA", "MODULES"] },
          { id: "s3", label: "Review Patient SLA & Billing Leakage", triggerText: ["BILLING", "SLA", "PATIENT"] },
          { id: "s4", label: "Relay to Clinical Strategist", triggerText: ["STRATEGIST", "RELAY"] }
        ]
      },
      strategist: {
        title: "GUIDE · HEALTHCARE STRATEGIST WORKFLOW",
        steps: [
          { id: "s1", label: "Audit Claim Denials & CPT Coding", triggerText: ["DENIAL AUDIT", "CPT", "CODING"] },
          { id: "s2", label: "Review AI Care & Compliance Analysis", triggerText: ["EXPLAINABILITY", "ANALYSIS", "IMPACT"] },
          { id: "s3", label: "Generate Appeal & Action Packets", triggerText: ["GENERATE APPEAL", "SAVE", "PACKET"] },
          { id: "s4", label: "Escalate to Chief Medical Officer View", triggerText: ["EXEC PORTAL", "ESCALATE", "CMO"] }
        ]
      },
      exec: {
        title: "GUIDE · HEALTHCARE EXECUTIVE PORTAL",
        steps: [
          { id: "s1", label: "Review Clinical Net Revenue & Denials", triggerText: ["REVENUE", "DENIALS", "PORTFOLIO"] },
          { id: "s2", label: "Audit Regulatory & HIPAA Exposure", triggerText: ["HIPAA EXPOSURE", "COMPLIANCE"] },
          { id: "s3", label: "Authorize Clinical Appeals & Overrides", triggerText: ["AUTHORIZE", "APPROVE", "SIGN-OFF"] }
        ]
      }
    },
    mortgage: {
      warroom: {
        title: "GUIDE · MORTGAGE WAR ROOM INGESTION",
        steps: [
          { id: "s1", label: "Load Loan Origination / TRID Statements", triggerText: ["LOAN", "TRID", "SAMPLE", "LOAD"] },
          { id: "s2", label: "Run Pull-Through Rate & Closing Risk Audit", triggerText: ["PULL-THROUGH", "CLOSING RISK", "MODULES"] },
          { id: "s3", label: "Save Underwriting Telemetry", triggerText: ["SAVE", "STORE"] },
          { id: "s4", label: "Relay to Lending Strategist", triggerText: ["STRATEGIST", "RELAY"] }
        ]
      },
      strategist: {
        title: "GUIDE · LENDING STRATEGIST WORKFLOW",
        steps: [
          { id: "s1", label: "Audit TRID Violations & Title Issues", triggerText: ["TRID VIOLATIONS", "TITLE", "AUDIT"] },
          { id: "s2", label: "Review Pull-Through & Rate Lock Deltas", triggerText: ["IMPACT DELTA", "PULL-THROUGH", "EXPLAINABILITY"] },
          { id: "s3", label: "Generate Loan Rescue Directives", triggerText: ["RESCUE DIRECTIVE", "SAVE", "GENERATE"] },
          { id: "s4", label: "Escalate to Lending Exec Portal", triggerText: ["EXEC PORTAL", "ESCALATE"] }
        ]
      },
      exec: {
        title: "GUIDE · MORTGAGE EXECUTIVE PORTAL",
        steps: [
          { id: "s1", label: "Review Active Loan Pipeline Volume", triggerText: ["PIPELINE", "VOLUME", "ACTIVE LOANS"] },
          { id: "s2", label: "Audit Total TRID & Closing Exposure", triggerText: ["TRID EXPOSURE", "REVENUE RISK"] },
          { id: "s3", label: "Sign-off Secondary Market Offloads", triggerText: ["SIGN-OFF", "APPROVE", "OFFLOAD"] }
        ]
      }
    },
    schools: {
      warroom: {
        title: "GUIDE · SCHOOLS WAR ROOM TELEMETRY",
        steps: [
          { id: "s1", label: "Load District Attendance & ADA Funding Logs", triggerText: ["ADA", "ATTENDANCE", "DISTRICT", "SAMPLE"] },
          { id: "s2", label: "Parse Title IX & Safety Compliance Flags", triggerText: ["TITLE IX", "SAFETY", "MODULES"] },
          { id: "s3", label: "Review Campus Facilities SLA Risks", triggerText: ["FACILITIES", "SLA", "CAMPUS"] },
          { id: "s4", label: "Relay to District Strategist", triggerText: ["STRATEGIST", "RELAY"] }
        ]
      },
      strategist: {
        title: "GUIDE · SCHOOL STRATEGIST WORKFLOW",
        steps: [
          { id: "s1", label: "Audit ADA Funding Discrepancies", triggerText: ["ADA FUNDING", "ATTENDANCE AUDIT"] },
          { id: "s2", label: "Review Campus Compliance & Safety Deltas", triggerText: ["EXPLAINABILITY", "IMPACT DELTA", "ANALYSIS"] },
          { id: "s3", label: "Generate District Remediation Directives", triggerText: ["GENERATE DIRECTIVE", "SAVE"] },
          { id: "s4", label: "Escalate to School Board Exec Portal", triggerText: ["EXEC PORTAL", "ESCALATE", "BOARD"] }
        ]
      },
      exec: {
        title: "GUIDE · SCHOOL DISTRICT EXEC PORTAL",
        steps: [
          { id: "s1", label: "Review District ADA Funding & Enrollment", triggerText: ["ENROLLMENT", "FUNDING", "DISTRICT"] },
          { id: "s2", label: "Audit Title IX & Facility Exposure", triggerText: ["TITLE IX EXPOSURE", "COMPLIANCE"] },
          { id: "s3", label: "Approve Board Budget Allocations", triggerText: ["APPROVE", "ALLOCATE", "SIGN-OFF"] }
        ]
      }
    },
    finops: {
      warroom: {
        title: "GUIDE · FINOPS WAR ROOM INGESTION",
        steps: [
          { id: "s1", label: "Load Ledger & Transaction Logs", triggerText: ["LEDGER", "TRANSACTION", "SAMPLE", "LOAD"] },
          { id: "s2", label: "Run Revenue Delta & Margin Audit", triggerText: ["MARGIN", "REVENUE", "AUDIT", "MODULES"] },
          { id: "s3", label: "Save Ingested Audit Trail", triggerText: ["SAVE", "STORE"] },
          { id: "s4", label: "Relay to FinOps Strategist", triggerText: ["STRATEGIST", "RELAY"] }
        ]
      },
      strategist: {
        title: "GUIDE · FINOPS STRATEGIST WORKFLOW",
        steps: [
          { id: "s1", label: "Audit Cloud Spend & EBITDA Exposure", triggerText: ["EBITDA", "CLOUD SPEND", "AUDIT"] },
          { id: "s2", label: "Review Margin Delta & Cost Anomaly Analysis", triggerText: ["ANOMALY", "ANALYSIS", "IMPACT DELTA"] },
          { id: "s3", label: "Generate Cost Optimization Directives", triggerText: ["GENERATE DIRECTIVE", "OPTIMIZATION", "SAVE"] },
          { id: "s4", label: "Escalate to CFO Portal", triggerText: ["EXEC PORTAL", "ESCALATE", "CFO"] }
        ]
      },
      exec: {
        title: "GUIDE · FINOPS EXECUTIVE PORTAL",
        steps: [
          { id: "s1", label: "Review Corporate P&L & EBITDA Margin", triggerText: ["P&L", "EBITDA", "PORTFOLIO"] },
          { id: "s2", label: "Audit Financial Exposure Deltas", triggerText: ["EXPOSURE", "FINANCIAL RISK"] },
          { id: "s3", label: "Approve Capital Allocations & Budget Overrides", triggerText: ["APPROVE", "ALLOCATE", "SIGN-OFF"] }
        ]
      }
    },
    insurance: {
      warroom: {
        title: "GUIDE · INSURANCE WAR ROOM INGESTION",
        steps: [
          { id: "s1", label: "Load Policy & Claims Records", triggerText: ["POLICY", "CLAIMS", "SAMPLE", "LOAD"] },
          { id: "s2", label: "Run Loss Ratio & Underwriting Risk Audit", triggerText: ["LOSS RATIO", "UNDERWRITING", "MODULES"] },
          { id: "s3", label: "Save Claims Telemetry", triggerText: ["SAVE", "STORE"] },
          { id: "s4", label: "Relay to Claims Strategist", triggerText: ["STRATEGIST", "RELAY"] }
        ]
      },
      strategist: {
        title: "GUIDE · INSURANCE STRATEGIST WORKFLOW",
        steps: [
          { id: "s1", label: "Audit Fraud Indicators & Coverage Limits", triggerText: ["FRAUD", "COVERAGE", "AUDIT"] },
          { id: "s2", label: "Review Reserve Exposure & Severity Deltas", triggerText: ["RESERVE EXPOSURE", "SEVERITY", "ANALYSIS"] },
          { id: "s3", label: "Generate Settlement & Subrogation Packets", triggerText: ["SUBROGATION", "SETTLEMENT", "SAVE"] },
          { id: "s4", label: "Escalate to Chief Risk Officer View", triggerText: ["EXEC PORTAL", "ESCALATE", "CRO"] }
        ]
      },
      exec: {
        title: "GUIDE · INSURANCE EXECUTIVE PORTAL",
        steps: [
          { id: "s1", label: "Review Combined Ratio & Reinsurance Risk", triggerText: ["COMBINED RATIO", "REINSURANCE"] },
          { id: "s2", label: "Audit Total Portfolio Loss Reserves", triggerText: ["LOSS RESERVES", "PORTFOLIO RISK"] },
          { id: "s3", label: "Sign-off Enterprise Reinsurance Directives", triggerText: ["SIGN-OFF", "APPROVE", "AUTHORIZE"] }
        ]
      }
    },
    noc: {
      warroom: {
        title: "GUIDE · NOC WAR ROOM TELEMETRY",
        steps: [
          { id: "s1", label: "Load Network & Server Incident Feeds", triggerText: ["INCIDENT", "FEED", "SAMPLE", "LOAD"] },
          { id: "s2", label: "Parse Outage SLA & Latency Anomaly Flags", triggerText: ["LATENCY", "OUTAGE", "SLA", "MODULES"] },
          { id: "s3", label: "Save Network Telemetry State", triggerText: ["SAVE", "STORE"] },
          { id: "s4", label: "Relay to NOC Strategist", triggerText: ["STRATEGIST", "RELAY"] }
        ]
      },
      strategist: {
        title: "GUIDE · NOC STRATEGIST WORKFLOW",
        steps: [
          { id: "s1", label: "Audit Edge Failures & BGP Routing", triggerText: ["BGP", "EDGE FAILURE", "AUDIT"] },
          { id: "s2", label: "Review Uptime SLA & Penalties Analysis", triggerText: ["UPTIME SLA", "PENALTIES", "ANALYSIS"] },
          { id: "s3", label: "Generate Failover & Reroute Directives", triggerText: ["FAILOVER", "REROUTE", "GENERATE", "SAVE"] },
          { id: "s4", label: "Escalate to Infrastructure Exec Portal", triggerText: ["EXEC PORTAL", "ESCALATE"] }
        ]
      },
      exec: {
        title: "GUIDE · NOC EXECUTIVE PORTAL",
        steps: [
          { id: "s1", label: "Review Enterprise Network Availability & SLA", triggerText: ["AVAILABILITY", "SLA", "INFRASTRUCTURE"] },
          { id: "s2", label: "Audit Total SLA Breach Exposure", triggerText: ["SLA BREACH", "FINANCIAL PENALTY"] },
          { id: "s3", label: "Authorize Core Infrastructure Capital Spend", triggerText: ["AUTHORIZE", "APPROVE", "SIGN-OFF"] }
        ]
      }
    },
    honeywell: {
      strategist: {
        title: "GUIDE · HONEYWELL BGS STRATEGIST WORKFLOW",
        steps: [
          { id: "s1", label: "Audit BMS Telemetry & HVAC Performance", triggerText: ["BMS", "HVAC", "TELEMETRY", "AUDIT"] },
          { id: "s2", label: "Review Energy Efficiency & SLA Deltas", triggerText: ["ENERGY", "EFFICIENCY", "SLA DELTA"] },
          { id: "s3", label: "Generate Facility Automation Packets", triggerText: ["AUTOMATION", "PACKET", "GENERATE", "SAVE"] },
          { id: "s4", label: "Escalate to Honeywell Exec Portal", triggerText: ["EXEC PORTAL", "ESCALATE"] }
        ]
      },
      exec: {
        title: "GUIDE · HONEYWELL BGS EXECUTIVE PORTAL",
        steps: [
          { id: "s1", label: "Review Global Facility Portfolio Performance", triggerText: ["GLOBAL PORTFOLIO", "FACILITIES"] },
          { id: "s2", label: "Audit Total Building Operational Risk", triggerText: ["BUILDING RISK", "OPERATIONAL DELTA"] },
          { id: "s3", label: "Approve Enterprise Modernization Directives", triggerText: ["APPROVE", "DIRECTIVE", "SIGN-OFF"] }
        ]
      }
    },
    "plant-incident": {
      warroom: {
        title: "GUIDE · PLANT INCIDENT WAR ROOM INGESTION",
        steps: [
          { id: "s1", label: "Load Factory Telemetry & SCADA Logs", triggerText: ["SCADA", "FACTORY", "INCIDENT", "LOAD"] },
          { id: "s2", label: "Parse Equipment Downtime & Safety Flags", triggerText: ["DOWNTIME", "SAFETY", "MODULES"] },
          { id: "s3", label: "Save Plant Incident Telemetry", triggerText: ["SAVE", "STORE"] },
          { id: "s4", label: "Relay to Plant Strategist", triggerText: ["STRATEGIST", "RELAY"] }
        ]
      },
      strategist: {
        title: "GUIDE · PLANT INCIDENT STRATEGIST WORKFLOW",
        steps: [
          { id: "s1", label: "Audit Failure Root Cause & OSHA Risk", triggerText: ["ROOT CAUSE", "OSHA", "AUDIT"] },
          { id: "s2", label: "Review Production Line Yield Deltas", triggerText: ["PRODUCTION YIELD", "YIELD DELTA"] },
          { id: "s3", label: "Generate Maintenance & Safety Directives", triggerText: ["SAFETY DIRECTIVE", "MAINTENANCE", "SAVE"] },
          { id: "s4", label: "Escalate to Operations Exec Portal", triggerText: ["EXEC PORTAL", "ESCALATE"] }
        ]
      },
      exec: {
        title: "GUIDE · PLANT INCIDENT EXECUTIVE PORTAL",
        steps: [
          { id: "s1", label: "Review Multi-Plant Output & Safety Compliance", triggerText: ["MULTI-PLANT", "OUTPUT", "SAFETY"] },
          { id: "s2", label: "Audit Total Unplanned Downtime Cost", triggerText: ["DOWNTIME COST", "FINANCIAL LOSS"] },
          { id: "s3", label: "Authorize Plant Overhaul Capital Allocations", triggerText: ["AUTHORIZE", "OVERHAUL", "APPROVE"] }
        ]
      }
    },
    "cyber-incident": {
      warroom: {
        title: "GUIDE · CYBER INCIDENT WAR ROOM INGESTION",
        steps: [
          { id: "s1", label: "Load SIEM / SOC Alerts & Breach Logs", triggerText: ["SIEM", "SOC", "BREACH", "LOAD"] },
          { id: "s2", label: "Parse Threat Vector & Compromise Exposure", triggerText: ["THREAT VECTOR", "COMPROMISE", "MODULES"] },
          { id: "s3", label: "Save Cyber Telemetry Snapshot", triggerText: ["SAVE", "STORE"] },
          { id: "s4", label: "Relay to Cyber Strategist", triggerText: ["STRATEGIST", "RELAY"] }
        ]
      },
      strategist: {
        title: "GUIDE · CYBER INCIDENT STRATEGIST WORKFLOW",
        steps: [
          { id: "s1", label: "Audit Breach Containment & Ransom Exposure", triggerText: ["CONTAINMENT", "RANSOM", "AUDIT"] },
          { id: "s2", label: "Review Data Exfiltration & SEC Disclosure Deltas", triggerText: ["EXFILTRATION", "SEC DISCLOSURE", "ANALYSIS"] },
          { id: "s3", label: "Generate Incident Remediation Directives", triggerText: ["REMEDIATION DIRECTIVE", "GENERATE", "SAVE"] },
          { id: "s4", label: "Escalate to CISO Exec Portal", triggerText: ["EXEC PORTAL", "ESCALATE", "CISO"] }
        ]
      },
      exec: {
        title: "GUIDE · CYBER INCIDENT EXECUTIVE PORTAL",
        steps: [
          { id: "s1", label: "Review Corporate Cyber Risk & Active Breaches", triggerText: ["CYBER RISK", "ACTIVE BREACH"] },
          { id: "s2", label: "Audit Total Legal & Regulatory Liability", triggerText: ["REGULATORY LIABILITY", "FINANCIAL PENALTY"] },
          { id: "s3", label: "Sign-off Board Incident Communications & Disclosures", triggerText: ["SIGN-OFF", "DISCLOSURE", "APPROVE"] }
        ]
      }
    },
    "supplier-shutdown": {
      warroom: {
        title: "GUIDE · SUPPLIER SHUTDOWN WAR ROOM INGESTION",
        steps: [
          { id: "s1", label: "Load Vendor Outage & Logistics Logs", triggerText: ["VENDOR", "OUTAGE", "LOGISTICS", "LOAD"] },
          { id: "s2", label: "Parse Single-Point Failure & Inventory Risks", triggerText: ["SINGLE-POINT", "INVENTORY", "MODULES"] },
          { id: "s3", label: "Save Supply Chain Snapshot", triggerText: ["SAVE", "STORE"] },
          { id: "s4", label: "Relay to Supply Chain Strategist", triggerText: ["STRATEGIST", "RELAY"] }
        ]
      },
      strategist: {
        title: "GUIDE · SUPPLIER SHUTDOWN STRATEGIST WORKFLOW",
        steps: [
          { id: "s1", label: "Audit Alternate Vendor Capacity & SLAs", triggerText: ["ALTERNATE VENDOR", "CAPACITY", "SLA"] },
          { id: "s2", label: "Review Order Delays & Stockout Exposure Deltas", triggerText: ["STOCKOUT", "ORDER DELAYS", "ANALYSIS"] },
          { id: "s3", label: "Generate Emergency Rerouting Directives", triggerText: ["REROUTING DIRECTIVE", "GENERATE", "SAVE"] },
          { id: "s4", label: "Escalate to Supply Chain Exec Portal", triggerText: ["EXEC PORTAL", "ESCALATE"] }
        ]
      },
      exec: {
        title: "GUIDE · SUPPLIER SHUTDOWN EXECUTIVE PORTAL",
        steps: [
          { id: "s1", label: "Review Global Supply Network Continuity", triggerText: ["SUPPLY NETWORK", "CONTINUITY"] },
          { id: "s2", label: "Audit Revenue Exposure From Vendor Shutdowns", triggerText: ["REVENUE EXPOSURE", "SHUTDOWN LOSS"] },
          { id: "s3", label: "Authorize Secondary Vendor Procurement Commitments", triggerText: ["AUTHORIZE", "PROCUREMENT", "APPROVE"] }
        ]
      }
    }
  };

  // 3. Inject Collapsible Widget HTML Into DOM
  function renderWidget(config) {
    if (document.getElementById("tsm-universal-guide")) return;

    const totalSteps = config.steps.length;
    const widgetHtml = `
      <div id="tsm-universal-guide" style="position: fixed; bottom: 20px; right: 20px; z-index: 999999; width: 330px; background: #070d19; border: 1px solid #10b981; box-shadow: 0 10px 30px rgba(0,0,0,0.95); font-family: monospace; color: #e2e8f0; border-radius: 4px; overflow: hidden; pointer-events: auto;">
        <div style="background: rgba(16, 185, 129, 0.18); padding: 6px 10px; border-bottom: 1px solid #10b981; display: flex; justify-content: space-between; align-items: center; user-select: none;">
          <span style="font-size: 10px; font-weight: bold; letter-spacing: 1px; color: #10b981;" id="guide-title">• ${config.title}</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 9px; color: #38bdf8; font-weight: bold;" id="guide-step-counter">STEP 1 OF ${totalSteps}</span>
            <button id="guide-toggle-btn" style="background: #0f172a; border: 1px solid #10b981; color: #10b981; font-size: 10px; border-radius: 3px; cursor: pointer; padding: 0 5px; line-height: 14px; font-weight: bold;">+</button>
          </div>
        </div>
        <div id="guide-card-body" style="padding: 10px; font-size: 10px; line-height: 1.5; display: none;">
          ${config.steps
            .map(
              (step, idx) => `
            <div id="u-step-${idx + 1}" class="guide-step" style="margin-bottom: 6px; color: ${idx === 0 ? "#f59e0b" : "#64748b"}; opacity: ${idx === 0 ? "1" : "0.6"}; display: flex; align-items: flex-start; gap: 8px;">
              <span class="u-icon" style="font-weight: bold; width: 12px; text-align: center;">${idx === 0 ? "●" : "○"}</span>
              <div>
                <strong>${idx + 1}. ${step.label}</strong>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
        <div id="guide-card-footer" style="background: #030712; padding: 6px 10px; border-top: 1px solid #1e293b; font-size: 9px; color: #f59e0b; display: none;">
          <strong>Next:</strong> <span id="guide-step-hint">Click ${config.steps[0].label} to begin.</span>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", widgetHtml);

    // Toggle button event handler
    document.getElementById("guide-toggle-btn").addEventListener("click", function () {
      const body = document.getElementById("guide-card-body");
      const footer = document.getElementById("guide-card-footer");
      if (body.style.display === "none") {
        body.style.display = "block";
        footer.style.display = "block";
        this.innerText = "–";
      } else {
        body.style.display = "none";
        footer.style.display = "none";
        this.innerText = "+";
      }
    });
  }

  // 4. Attach Dynamic Listener Engine
  function initEngine(config) {
    let activeStep = 1;
    const totalSteps = config.steps.length;

    function advanceTo(stepNum, hint) {
      if (stepNum <= activeStep) return;
      
      // Mark preceding steps done
      for (let i = 1; i < stepNum; i++) {
        const prevEl = document.getElementById(`u-step-${i}`);
        if (prevEl) {
          prevEl.style.color = "#10b981";
          prevEl.style.opacity = "1";
          const icon = prevEl.querySelector(".u-icon");
          if (icon) icon.innerText = "✓";
        }
      }

      // Mark current step active
      activeStep = stepNum;
      const currEl = document.getElementById(`u-step-${activeStep}`);
      if (currEl) {
        currEl.style.color = "#f59e0b";
        currEl.style.opacity = "1";
        const icon = currEl.querySelector(".u-icon");
        if (icon) icon.innerText = "●";
      }

      const counterEl = document.getElementById("guide-step-counter");
      if (counterEl) {
        counterEl.innerText = activeStep > totalSteps ? "COMPLETE" : `STEP ${activeStep} OF ${totalSteps}`;
      }

      if (hint) {
        document.getElementById("guide-step-hint").innerHTML = hint;
      }
    }

    // Global Click Listener
    document.addEventListener("click", function (e) {
      const el = e.target.closest("*");
      if (!el) return;
      const txt = (el.innerText || "").toUpperCase();

      config.steps.forEach((step, idx) => {
        const stepNum = idx + 1;
        if (step.triggerText && step.triggerText.some((term) => txt.includes(term))) {
          const nextHint = config.steps[stepNum] ? `Proceed to: <strong>${config.steps[stepNum].label}</strong>` : "Workflow complete.";
          advanceTo(stepNum + 1, nextHint);
        }
      });
    }, true);
  }

  // 5. Bootstrap Engine on DOM Load
  document.addEventListener("DOMContentLoaded", function () {
    const context = detectContext();
    const vertConfig = GUIDE_CONFIGS[context.vertical] || GUIDE_CONFIGS.re;
    const pageConfig = vertConfig[context.role] || vertConfig.warroom || vertConfig.strategist;

    if (pageConfig) {
      renderWidget(pageConfig);
      initEngine(pageConfig);
    }
  });
})();