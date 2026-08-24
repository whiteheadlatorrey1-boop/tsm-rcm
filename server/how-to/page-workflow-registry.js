'use strict';

/**
 * Generated TSM page-level Guided How-To registry.
 *
 * This registry maps application pages to:
 *   PROBLEM → START → INPUT → ANALYZE → REVIEW → DECIDE
 *   → EXECUTE → REPORT → MEASURE → REPEAT
 *
 * Generated automatically from the workflow audit.
 */

const PAGE_WORKFLOW_REGISTRY = [
{
  "path": "html/war-rooms/schools-command/schools-command.html",
  "vertical": "schools",
  "priority": "P0",
  "workflow": {
    "problem": "grant compliance",
    "problems": [
      "grant compliance",
      "missing documentation",
      "administrative backlog",
      "vendor risk",
      "operational exceptions"
    ],
    "start": "Start with the operational mission or school problem.",
    "input": "Load the relevant documents, records, grant evidence, or mission information.",
    "analyze": {
      "instruction": "Run the intelligence analysis.",
      "controls": []
    },
    "review": {
      "instruction": "Review findings, anomalies, severity, exposure, and supporting evidence.",
      "controls": []
    },
    "decide": {
      "instruction": "Prioritize the school issues requiring intervention, escalation, approval, or documentation.",
      "controls": []
    },
    "execute": {
      "instruction": "Assign ownership, update the mission, document the response, and execute corrective work.",
      "controls": []
    },
    "reports": [
      "Compliance Exception Report",
      "Grant/Documentation Risk Report",
      "Operational Exception Report",
      "Executive Schools Brief"
    ],
    "report_controls": [],
    "measure": "Track compliance exposure, unresolved exceptions, backlog, and operational improvement.",
    "repeat": "Repeat the workflow as new school missions and exceptions arrive."
  },
  "controlInventory": {
    "count": 0,
    "controls": []
  },
  "mappingQuality": {
    "analyze": false,
    "review": false,
    "decide": false,
    "execute": false,
    "report": false
  }
},
  {
    "path": "html/healthcare/hc-denial-war-room.html",
    "vertical": "healthcare",
    "priority": "P0",
    "workflow": {
      "problem": "denial leakage",
      "problems": [
        "denial leakage",
        "revenue-cycle backlog",
        "documentation gaps",
        "operational exceptions"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u26a1 Run New Scenario",
            "id": null
          },
          {
            "type": "button",
            "label": "EXPORT FULL ANALYSIS",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Denial Recovery Report",
        "Revenue Leakage Report",
        "Appeal Priority Queue",
        "Executive Revenue-Cycle Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u2b07 Export All",
          "id": null
        },
        {
          "type": "button",
          "label": "Copy Navigator Report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 Export Full Report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 Export Report",
          "id": null
        },
        {
          "type": "button",
          "label": "EXPORT FULL ANALYSIS",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 32,
      "controls": [
        {
          "type": "button",
          "label": "INJECT ANOMALY INTO WAR ROOM \u26a1",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 Denial Recovery",
          "id": "mode-denial"
        },
        {
          "type": "button",
          "label": "\ud83d\udd12 Prior Auth Rescue",
          "id": "mode-prior"
        },
        {
          "type": "button",
          "label": "\u26a1 Denial Sample",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udd12 Prior Auth Sample",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udccb Compliance Sample",
          "id": null
        },
        {
          "type": "button",
          "label": "Clear",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 FIRE ALL 5 ENGINES",
          "id": "fire-btn"
        },
        {
          "type": "button",
          "label": "Copy",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Feed to Root Cause",
          "id": null
        },
        {
          "type": "button",
          "label": "Copy",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Feed to Financial",
          "id": null
        },
        {
          "type": "button",
          "label": "Copy",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Feed to Recovery",
          "id": null
        },
        {
          "type": "button",
          "label": "Copy Appeal",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 Export All",
          "id": null
        },
        {
          "type": "button",
          "label": "Copy Navigator Report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 Export Full Report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 Export Report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 Run New Scenario",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 FIRE ALL",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 ESCALATE TO HC MAIN STRATEGIST \u2192",
          "id": "escalate-strategist-btn"
        },
        {
          "type": "button",
          "label": "EXPORT FULL ANALYSIS",
          "id": null
        },
        {
          "type": "button",
          "label": "CLEAR & RESET",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2190 BACK",
          "id": "tourBack"
        },
        {
          "type": "button",
          "label": "NEXT \u2192",
          "id": "tourNext"
        },
        {
          "type": "button",
          "label": "CLOSE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a0 DEFECT MANIFEST",
          "id": "manifestBtn"
        },
        {
          "type": "button",
          "label": "CLOSE",
          "id": null
        },
        {
          "type": "input",
          "label": "file-input",
          "id": "file-input"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/reo-command.html",
    "vertical": "mortgage",
    "priority": "P0",
    "workflow": {
      "problem": "pipeline bottlenecks",
      "problems": [
        "pipeline bottlenecks",
        "documentation exceptions",
        "underwriting risk",
        "closing delays"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "&#43; SAVE OUTPUT",
            "id": null
          },
          {
            "type": "button",
            "label": "SEND",
            "id": null
          }
        ]
      },
      "reports": [
        "Loan Pipeline Risk Report",
        "Underwriting Exception Report",
        "Closing Readiness Report",
        "Executive Mortgage Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&#8595; EXPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8595; EXPORT (.TXT)",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 21,
      "controls": [
        {
          "type": "button",
          "label": "&#9632; MODULES",
          "id": null
        },
        {
          "type": "button",
          "label": "&#9671; NODES",
          "id": null
        },
        {
          "type": "button",
          "label": "&#9889; SYNTHESIS",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8595; EXPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8212; CMD",
          "id": null
        },
        {
          "type": "button",
          "label": "ALL",
          "id": null
        },
        {
          "type": "button",
          "label": "STRATEGY",
          "id": null
        },
        {
          "type": "button",
          "label": "COMPLIANCE",
          "id": null
        },
        {
          "type": "button",
          "label": "TAX",
          "id": null
        },
        {
          "type": "button",
          "label": "RISK",
          "id": null
        },
        {
          "type": "button",
          "label": "FINANCE",
          "id": null
        },
        {
          "type": "button",
          "label": "OPERATIONS",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8599; NEW TAB",
          "id": null
        },
        {
          "type": "button",
          "label": "&#43; SAVE OUTPUT",
          "id": null
        },
        {
          "type": "button",
          "label": "&#9889; SYNTHESIZE ALL",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8595; EXPORT (.TXT)",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8853; COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "&#10005; CLEAR",
          "id": null
        },
        {
          "type": "button",
          "label": "SEND",
          "id": null
        },
        {
          "type": "input",
          "label": "rptTitle",
          "id": "rptTitle"
        },
        {
          "type": "input",
          "label": "tsm-ai-input",
          "id": "tsm-ai-input"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": true,
      "report": true
    }
  },
  {
    "path": "html/tsm-insurance/pc-command.html",
    "vertical": "healthcare",
    "priority": "P0",
    "workflow": {
      "problem": "denial leakage",
      "problems": [
        "denial leakage",
        "revenue-cycle backlog",
        "documentation gaps",
        "operational exceptions"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u25b6 Run Intelligence Briefing",
            "id": "dash-btn"
          },
          {
            "type": "button",
            "label": "Umbrella Gap Scan",
            "id": null
          },
          {
            "type": "button",
            "label": "Wildfire Scan",
            "id": null
          },
          {
            "type": "button",
            "label": "Auto Gap Scan",
            "id": null
          },
          {
            "type": "button",
            "label": "\u25b6 Analyze Coverage",
            "id": null
          },
          {
            "type": "button",
            "label": "\u25b6 Analyze Auto Coverage",
            "id": null
          },
          {
            "type": "button",
            "label": "AZ Uninsured Motorist Analysis",
            "id": null
          },
          {
            "type": "button",
            "label": "\u25b6 Analyze Commercial Coverage",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Denial Recovery Report",
        "Revenue Leakage Report",
        "Appeal Priority Queue",
        "Executive Revenue-Cycle Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u25b6 Run Intelligence Briefing",
          "id": "dash-btn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "\ud83d\udcd8 HOW TO",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2190 COMMAND CENTER",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Run Intelligence Briefing",
          "id": "dash-btn"
        },
        {
          "type": "button",
          "label": "Umbrella Gap Scan",
          "id": null
        },
        {
          "type": "button",
          "label": "Wildfire Scan",
          "id": null
        },
        {
          "type": "button",
          "label": "Auto Gap Scan",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Analyze Coverage",
          "id": null
        },
        {
          "type": "button",
          "label": "Calculate Gap",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Analyze Auto Coverage",
          "id": null
        },
        {
          "type": "button",
          "label": "AZ Uninsured Motorist Analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "SR-22 / High Risk",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Analyze Commercial Coverage",
          "id": null
        },
        {
          "type": "button",
          "label": "Workers Comp Analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Cyber Risk Assessment",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Liability Gap Analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 EPLI Exposure Analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "Calculate Umbrella Need",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 AI Umbrella Analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 E&O Gap Analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "D&O Analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Run Agent E&O Self-Audit",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 AZ Risk Profile",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 BOP Gap Analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "Business Interruption Deep Dive",
          "id": null
        },
        {
          "type": "button",
          "label": "Crime / Employee Dishonesty",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 AI Renewal Strategy",
          "id": null
        },
        {
          "type": "button",
          "label": "Ask",
          "id": "ai-btn"
        },
        {
          "type": "input",
          "label": "ho-dwelling",
          "id": "ho-dwelling"
        },
        {
          "type": "input",
          "label": "ho-personal",
          "id": "ho-personal"
        },
        {
          "type": "input",
          "label": "ho-current",
          "id": "ho-current"
        },
        {
          "type": "input",
          "label": "ho-zip",
          "id": "ho-zip"
        },
        {
          "type": "input",
          "label": "auto-value",
          "id": "auto-value"
        },
        {
          "type": "input",
          "label": "auto-miles",
          "id": "auto-miles"
        },
        {
          "type": "input",
          "label": "auto-drivers",
          "id": "auto-drivers"
        },
        {
          "type": "input",
          "label": "auto-loan",
          "id": "auto-loan"
        },
        {
          "type": "input",
          "label": "comm-revenue",
          "id": "comm-revenue"
        },
        {
          "type": "input",
          "label": "comm-employees",
          "id": "comm-employees"
        },
        {
          "type": "input",
          "label": "liab-industry",
          "id": "liab-industry"
        },
        {
          "type": "input",
          "label": "liab-revenue",
          "id": "liab-revenue"
        },
        {
          "type": "input",
          "label": "epli-emp",
          "id": "epli-emp"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/construct-war/construction-war-room.html",
    "vertical": "construction",
    "priority": "P0",
    "workflow": {
      "problem": "project cost leakage",
      "problems": [
        "project cost leakage",
        "permit delays",
        "change-order exposure",
        "WIP and billing backlog"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\ud83d\udcca Job Cost Report \u2014 Overrun",
            "id": "smp-jcr"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Project Risk Report",
        "WIP & Billing Report",
        "Permit/Proposal Exception Report",
        "Executive Project Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\ud83d\udcca Job Cost Report \u2014 Overrun",
          "id": "smp-jcr"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "WAR ROOM",
          "id": null
        },
        {
          "type": "button",
          "label": "HUB",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 GUIDED TOUR",
          "id": "tourLaunchBtn"
        },
        {
          "type": "button",
          "label": "HOW-TO GUIDE",
          "id": null
        },
        {
          "type": "button",
          "label": "STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "EXECUTIVE",
          "id": null
        },
        {
          "type": "button",
          "label": "AUDITOPS",
          "id": null
        },
        {
          "type": "button",
          "label": "PERMITS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 Change Order",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udee1 OSHA Citation",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2696 Lien Notice",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udccb Subcontract",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcd0 RFI",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcb0 Draw Request",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83c\udfdb Permit",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udd12 Retainage",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcd2 Journal Entry",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcca Job Cost",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udc77 Payroll/1099",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2705 Compliance",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 FIRE ALL 6 ENGINES",
          "id": "fireBtn"
        },
        {
          "type": "button",
          "label": "CLEAR",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83e\uddea LOAD DEMO ANOMALY \u2014 CO-114",
          "id": "smp-demo"
        },
        {
          "type": "button",
          "label": "\ud83d\udccb Change Order \u2014 Unforeseen Soil",
          "id": "smp-co"
        },
        {
          "type": "button",
          "label": "\ud83d\udee1 OSHA Citation \u2014 Fall Protection",
          "id": "smp-osha"
        },
        {
          "type": "button",
          "label": "\u2696 Prelim Lien Notice \u2014 Steel Fab",
          "id": "smp-lien"
        },
        {
          "type": "button",
          "label": "\ud83d\udd12 Retainage Dispute \u2014 MEP Sub",
          "id": "smp-retainage"
        },
        {
          "type": "button",
          "label": "\ud83d\udcb0 Draw Request \u2014 Budget Variance",
          "id": "smp-draw"
        },
        {
          "type": "button",
          "label": "\ud83d\udcca Job Cost Report \u2014 Overrun",
          "id": "smp-jcr"
        },
        {
          "type": "button",
          "label": "\ud83d\udc77 Payroll / 1099 Discrepancy",
          "id": "smp-payroll"
        },
        {
          "type": "button",
          "label": "\ud83d\udcd2 Journal Entry \u2014 Loan Draw Error",
          "id": "smp-je"
        },
        {
          "type": "button",
          "label": "\ud83d\udd17 Intercompany Loan Variance",
          "id": "smp-interco"
        },
        {
          "type": "button",
          "label": "\ud83d\udcc8 Cash Flow / Reconciliation Gap",
          "id": "smp-cashflow"
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 ESCALATE TO STRATEGIST \u2192",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/insure-war/insurance-war-room.html",
    "vertical": "insurance",
    "priority": "P0",
    "workflow": {
      "problem": "claims leakage",
      "problems": [
        "claims leakage",
        "compliance exposure",
        "underwriting risk",
        "appeal backlog"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "EXPORT ANALYSIS",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "Policy Review",
            "id": null
          },
          {
            "type": "button",
            "label": "\ud83d\udcc4 Policy Review \u2014 Coverage Gaps",
            "id": "smp-policy"
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Claims Risk Report",
        "Compliance Exception Report",
        "Underwriting Risk Report",
        "Executive Insurance Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "Claims Report",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udccb Claims Report \u2014 Q1 2026",
          "id": "smp-claims"
        },
        {
          "type": "button",
          "label": "EXPORT ANALYSIS",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "WAR ROOM",
          "id": null
        },
        {
          "type": "button",
          "label": "STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "EXECUTIVE",
          "id": null
        },
        {
          "type": "button",
          "label": "HUB",
          "id": null
        },
        {
          "type": "button",
          "label": "P&C COMMAND",
          "id": null
        },
        {
          "type": "button",
          "label": "DME",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 GUIDED TOUR",
          "id": "tourLaunchBtn"
        },
        {
          "type": "button",
          "label": "\ud83d\udd0a SPEAK",
          "id": "speechPlayBtn"
        },
        {
          "type": "button",
          "label": "\u23f8 PAUSE",
          "id": "speechPauseBtn"
        },
        {
          "type": "button",
          "label": "\u23f9 STOP",
          "id": "speechStopBtn"
        },
        {
          "type": "button",
          "label": "\u2715 END TOUR",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c0 PREV",
          "id": "hudPrevBtn"
        },
        {
          "type": "button",
          "label": "NEXT \u25b6",
          "id": "hudNextBtn"
        },
        {
          "type": "button",
          "label": "Claims Report",
          "id": null
        },
        {
          "type": "button",
          "label": "Denial Letter",
          "id": null
        },
        {
          "type": "button",
          "label": "Policy Review",
          "id": null
        },
        {
          "type": "button",
          "label": "DME Claim",
          "id": null
        },
        {
          "type": "button",
          "label": "AP Aging",
          "id": null
        },
        {
          "type": "button",
          "label": "ERA Batch",
          "id": null
        },
        {
          "type": "button",
          "label": "Underwriting",
          "id": null
        },
        {
          "type": "button",
          "label": "Compliance",
          "id": null
        },
        {
          "type": "button",
          "label": "CE Renewal",
          "id": null
        },
        {
          "type": "button",
          "label": "Other",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udccb Claims Report \u2014 Q1 2026",
          "id": "smp-claims"
        },
        {
          "type": "button",
          "label": "\ud83e\ude7a DME Claim \u2014 Denied",
          "id": "smp-dme"
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 Policy Review \u2014 Coverage Gaps",
          "id": "smp-policy"
        },
        {
          "type": "button",
          "label": "\u26a1 FIRE ALL 6 ENGINES",
          "id": "fireBtn"
        },
        {
          "type": "button",
          "label": "CLR",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "\u269c ESCALATE TO STRATEGIST \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 RESCUE PACK",
          "id": "rescuePackBtn"
        },
        {
          "type": "button",
          "label": "EXPORT ANALYSIS",
          "id": null
        },
        {
          "type": "button",
          "label": "CLEAR & RESET",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN ${name.toUpperCase()} \u2192",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": true,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/legal-war/legal-war-room.html",
    "vertical": "legal",
    "priority": "P0",
    "workflow": {
      "problem": "matter backlog",
      "problems": [
        "matter backlog",
        "deadline risk",
        "document review burden",
        "compliance exposure"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "EXPORT FULL ANALYSIS",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Matter Risk Report",
        "Deadline/Exception Report",
        "Document Intelligence Brief",
        "Executive Legal Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "COPY NAVIGATOR REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT FULL REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "EXPORT FULL ANALYSIS",
          "id": null
        },
        {
          "type": "button",
          "label": "FULL REPORT \u2197",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "WAR ROOM",
          "id": null
        },
        {
          "type": "button",
          "label": "LEGAL NODES",
          "id": null
        },
        {
          "type": "button",
          "label": "STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "CHIEF STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "EXECUTIVE PORTAL",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2696 Complaint",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcdd Contract",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udccb Motion",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udd0d Discovery",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2709 Correspond.",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83c\udfe5 Med Records",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\ude94 Police Rpt",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udc64 Employment",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 Employment Class Action",
          "id": "smp-complaint"
        },
        {
          "type": "button",
          "label": "\ud83d\udcdd Vendor Breach of Contract",
          "id": "smp-contract"
        },
        {
          "type": "button",
          "label": "\ud83d\udee1 Regulatory Inquiry",
          "id": "smp-regulatory"
        },
        {
          "type": "button",
          "label": "\ud83d\udc64 EEOC Wrongful Termination",
          "id": "smp-employment"
        },
        {
          "type": "button",
          "label": "\u26a1 FIRE ALL 6 ENGINES",
          "id": "fireBtn"
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY \u2192 FEED TO RECOVERY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY NAVIGATOR REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT FULL REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 ESCALATE TO LEGAL CHIEF STRATEGIST \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "EXPORT FULL ANALYSIS",
          "id": null
        },
        {
          "type": "button",
          "label": "CLEAR &amp; RESET",
          "id": null
        },
        {
          "type": "button",
          "label": "Legal Nodes \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "Case Strategist \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "Chief Strategist \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "Executive Portal \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        },
        {
          "type": "button",
          "label": "LAUNCH ${esc(app.name.toUpperCase())} \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "FULL REPORT \u2197",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715 CLOSE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udd0a SPEAK",
          "id": "speechPlayBtn"
        },
        {
          "type": "button",
          "label": "\u23f8 PAUSE",
          "id": "speechPauseBtn"
        },
        {
          "type": "button",
          "label": "\u25a0 STOP",
          "id": "speechStopBtn"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/re-war/re-war-room.html",
    "vertical": "mortgage",
    "priority": "P0",
    "workflow": {
      "problem": "pipeline bottlenecks",
      "problems": [
        "pipeline bottlenecks",
        "documentation exceptions",
        "underwriting risk",
        "closing delays"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u26a1 RUN TRANSACTION RESCUE PACK",
            "id": "rescueBtn"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "\ud83d\udd27 INSPECTION ISSUES Repairs \u00b7 credits \u00b7 negotiations",
            "id": null
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "+ SAVE CURRENT OUTPUT",
            "id": null
          },
          {
            "type": "button",
            "label": "SEND",
            "id": null
          }
        ]
      },
      "reports": [
        "Loan Pipeline Risk Report",
        "Underwriting Exception Report",
        "Closing Readiness Report",
        "Executive Mortgage Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&#8595; EXPORT (.TXT)",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "&#9889; DEAL RESCUE PACK",
          "id": null
        },
        {
          "type": "button",
          "label": "&#9632; WAR ROOM",
          "id": null
        },
        {
          "type": "button",
          "label": "&#9671; NODE VIEWER",
          "id": null
        },
        {
          "type": "button",
          "label": "&#9658; GUIDED TOUR",
          "id": "tourLaunchBtn"
        },
        {
          "type": "button",
          "label": "HOW-TO",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8599; ESCALATE \u2192 STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "WAR ROOM",
          "id": "vtab-warroom"
        },
        {
          "type": "button",
          "label": "&#9889; DEAL RESCUE PACK",
          "id": "vtab-rescue"
        },
        {
          "type": "button",
          "label": "NODE VIEWER",
          "id": "vtab-nodes"
        },
        {
          "type": "button",
          "label": "\u25b6 TAKE THE TOUR",
          "id": null
        },
        {
          "type": "button",
          "label": "01 \u00b7 ACQUISITION",
          "id": null
        },
        {
          "type": "button",
          "label": "02 \u00b7 FINANCE",
          "id": null
        },
        {
          "type": "button",
          "label": "03 \u00b7 TRANSACTION",
          "id": null
        },
        {
          "type": "button",
          "label": "04 \u00b7 MORTGAGE OPS",
          "id": null
        },
        {
          "type": "button",
          "label": "05 \u00b7 COMPLIANCE",
          "id": null
        },
        {
          "type": "button",
          "label": "06 \u00b7 BNCA DISPATCH",
          "id": null
        },
        {
          "type": "button",
          "label": "+ SAVE CURRENT OUTPUT",
          "id": null
        },
        {
          "type": "button",
          "label": "&#9889; SYNTHESIZE ALL NODES",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8595; EXPORT (.TXT)",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8599; ESCALATE \u2192 RE STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "&#10005; CLEAR SESSION",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2328 PASTE TEXT",
          "id": "btnPaste"
        },
        {
          "type": "button",
          "label": "\u2191 UPLOAD FILE",
          "id": "btnUpload"
        },
        {
          "type": "button",
          "label": "\u26a1 LOAD DOC INTO SESSION",
          "id": null
        },
        {
          "type": "button",
          "label": "PASTE TEXT",
          "id": "btnPaste"
        },
        {
          "type": "button",
          "label": "UPLOAD FILE",
          "id": "btnUpload"
        },
        {
          "type": "button",
          "label": "\ud83d\udcb8 FINANCING FAILURE DTI \u00b7 docs \u00b7 asset sourcing",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc9 APPRAISAL GAP Value below contract \u00b7 comps needed",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2696\ufe0f TITLE DEFECT Liens \u00b7 clouds \u00b7 chain gaps",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udd27 INSPECTION ISSUES Repairs \u00b7 credits \u00b7 negotiations",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udccb UW CONDITIONS Open conditions \u00b7 CTC blocked",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udea8 CLOSING DELAY HOA \u00b7 title \u00b7 insurance \u00b7 wire",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 RUN TRANSACTION RESCUE PACK",
          "id": "rescueBtn"
        },
        {
          "type": "button",
          "label": "&#8599; NEW TAB",
          "id": null
        },
        {
          "type": "button",
          "label": "SEND",
          "id": null
        },
        {
          "type": "button",
          "label": "${i + 2} ${t.icon} ${t.label}",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 OPEN RESCUE PACK \u2192 ${rescuePack}",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 BUILD REMEDIATION MISSION",
          "id": "re-build-mission-btn"
        },
        {
          "type": "button",
          "label": "\u2713 COMPLETE STEP ${mission.steps.indexOf(step) + 1}",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": true,
      "decide": false,
      "execute": true,
      "report": true
    }
  },
  {
    "path": "html/construction-command.tsmatter.html",
    "vertical": "construction",
    "priority": "P0",
    "workflow": {
      "problem": "project cost leakage",
      "problems": [
        "project cost leakage",
        "permit delays",
        "change-order exposure",
        "WIP and billing backlog"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "ANALYZE",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Fulfillment bottleneck analysis",
            "id": null
          },
          {
            "type": "button",
            "label": "PROCESS",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Risk analysis \u00b7 AR late-pay prediction",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "\u203a Intake queue \u00b7 unlabeled 48h",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Open invoices 60d+ \u00b7 collection queue",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Dispute flags \u00b7 90-day review",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Exception queue \u00b7 unmatched 3d+",
            "id": null
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": [
          {
            "type": "button",
            "label": "\u203a Unapproved timesheets \u00b7 current period",
            "id": null
          }
        ]
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Project Risk Report",
        "WIP & Billing Report",
        "Permit/Proposal Exception Report",
        "Executive Project Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u203a Q1 tax liability export \u00b7 all 15 states",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Generate label \u00b7 carrier rate shop",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Daily cash position report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Billable utilization \u00b7 monthly report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Payroll export \u00b7 QuickBooks format",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 BUILD REPORT",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "\u26a1 DEPLOY",
          "id": "masterBtn"
        },
        {
          "type": "button",
          "label": "\u203a Q1 tax liability export \u00b7 all 15 states",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a New nexus risk by sales velocity",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Exemption certs expiring in 60 days",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Audit-ready Q reconciliation",
          "id": null
        },
        {
          "type": "button",
          "label": "ANALYZE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Generate label \u00b7 carrier rate shop",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Intake queue \u00b7 unlabeled 48h",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Fulfillment bottleneck analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Bank feed auto-match \u00b7 receipts",
          "id": null
        },
        {
          "type": "button",
          "label": "PROCESS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Risk analysis \u00b7 AR late-pay prediction",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Deposit \u2192 invoice auto-match",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a 30-60-90 aging \u00b7 collection actions",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a QuickBooks sync \u00b7 customer update",
          "id": null
        },
        {
          "type": "button",
          "label": "RECONCILE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Open invoices 60d+ \u00b7 collection queue",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a AR cash flow forecast \u00b7 30 days",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Dispute flags \u00b7 90-day review",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Match today's deposits \u00b7 open invoices",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Exception queue \u00b7 unmatched 3d+",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Daily cash position report",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Integration health check \u00b7 all systems",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a GL mapping gaps \u00b7 QuickBooks alignment",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Carrier accounts \u00b7 rate agreements",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Unapproved timesheets \u00b7 current period",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Billable utilization \u00b7 monthly report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Payroll export \u00b7 QuickBooks format",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Budget burn alerts \u00b7 overrun risk",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Project P&amp;L \u00b7 margin ranking",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Deliverables due this week \u00b7 status",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 BUILD REPORT",
          "id": null
        },
        {
          "type": "input",
          "label": "masterQuery",
          "id": "masterQuery"
        },
        {
          "type": "input",
          "label": "input-tax",
          "id": "input-tax"
        },
        {
          "type": "input",
          "label": "input-orders",
          "id": "input-orders"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": true,
      "decide": true,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/financial-command.html",
    "vertical": "finops",
    "priority": "P0",
    "workflow": {
      "problem": "financial leakage",
      "problems": [
        "financial leakage",
        "invoice exceptions",
        "close-cycle delays",
        "spend visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "ANALYZE",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Fulfillment bottleneck analysis",
            "id": null
          },
          {
            "type": "button",
            "label": "PROCESS",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Risk analysis \u00b7 AR late-pay prediction",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "\u203a Intake queue \u00b7 unlabeled 48h",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Open invoices 60d+ \u00b7 collection queue",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Dispute flags \u00b7 90-day review",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Exception queue \u00b7 unmatched 3d+",
            "id": null
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": [
          {
            "type": "button",
            "label": "\u203a Unapproved timesheets \u00b7 current period",
            "id": null
          }
        ]
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Financial Exception Report",
        "Spend/Leakage Report",
        "Close Readiness Report",
        "Executive Finance Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u203a Q1 tax liability export \u00b7 all 15 states",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Generate label \u00b7 carrier rate shop",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Daily cash position report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Billable utilization \u00b7 monthly report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Payroll export \u00b7 QuickBooks format",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 BUILD REPORT",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "\u26a1 DEPLOY",
          "id": "masterBtn"
        },
        {
          "type": "button",
          "label": "\u203a Q1 tax liability export \u00b7 all 15 states",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a New nexus risk by sales velocity",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Exemption certs expiring in 60 days",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Audit-ready Q reconciliation",
          "id": null
        },
        {
          "type": "button",
          "label": "ANALYZE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Generate label \u00b7 carrier rate shop",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Intake queue \u00b7 unlabeled 48h",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Fulfillment bottleneck analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Bank feed auto-match \u00b7 receipts",
          "id": null
        },
        {
          "type": "button",
          "label": "PROCESS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Risk analysis \u00b7 AR late-pay prediction",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Deposit \u2192 invoice auto-match",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a 30-60-90 aging \u00b7 collection actions",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a QuickBooks sync \u00b7 customer update",
          "id": null
        },
        {
          "type": "button",
          "label": "RECONCILE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Open invoices 60d+ \u00b7 collection queue",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a AR cash flow forecast \u00b7 30 days",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Dispute flags \u00b7 90-day review",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Match today's deposits \u00b7 open invoices",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Exception queue \u00b7 unmatched 3d+",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Daily cash position report",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Integration health check \u00b7 all systems",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a GL mapping gaps \u00b7 QuickBooks alignment",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Carrier accounts \u00b7 rate agreements",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Unapproved timesheets \u00b7 current period",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Billable utilization \u00b7 monthly report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Payroll export \u00b7 QuickBooks format",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Budget burn alerts \u00b7 overrun risk",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Project P&amp;L \u00b7 margin ranking",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Deliverables due this week \u00b7 status",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 BUILD REPORT",
          "id": null
        },
        {
          "type": "input",
          "label": "masterQuery",
          "id": "masterQuery"
        },
        {
          "type": "input",
          "label": "input-tax",
          "id": "input-tax"
        },
        {
          "type": "input",
          "label": "input-orders",
          "id": "input-orders"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": true,
      "decide": true,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/financial-command.tsmatter.html",
    "vertical": "legal",
    "priority": "P0",
    "workflow": {
      "problem": "matter backlog",
      "problems": [
        "matter backlog",
        "deadline risk",
        "document review burden",
        "compliance exposure"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "ANALYZE",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Fulfillment bottleneck analysis",
            "id": null
          },
          {
            "type": "button",
            "label": "PROCESS",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Risk analysis \u00b7 AR late-pay prediction",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "\u203a Intake queue \u00b7 unlabeled 48h",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Open invoices 60d+ \u00b7 collection queue",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Dispute flags \u00b7 90-day review",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Exception queue \u00b7 unmatched 3d+",
            "id": null
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": [
          {
            "type": "button",
            "label": "\u203a Unapproved timesheets \u00b7 current period",
            "id": null
          }
        ]
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Matter Risk Report",
        "Deadline/Exception Report",
        "Document Intelligence Brief",
        "Executive Legal Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u203a Q1 tax liability export \u00b7 all 15 states",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Generate label \u00b7 carrier rate shop",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Daily cash position report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Billable utilization \u00b7 monthly report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Payroll export \u00b7 QuickBooks format",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 BUILD REPORT",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "\u26a1 DEPLOY",
          "id": "masterBtn"
        },
        {
          "type": "button",
          "label": "\u203a Q1 tax liability export \u00b7 all 15 states",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a New nexus risk by sales velocity",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Exemption certs expiring in 60 days",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Audit-ready Q reconciliation",
          "id": null
        },
        {
          "type": "button",
          "label": "ANALYZE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Generate label \u00b7 carrier rate shop",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Intake queue \u00b7 unlabeled 48h",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Fulfillment bottleneck analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Bank feed auto-match \u00b7 receipts",
          "id": null
        },
        {
          "type": "button",
          "label": "PROCESS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Risk analysis \u00b7 AR late-pay prediction",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Deposit \u2192 invoice auto-match",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a 30-60-90 aging \u00b7 collection actions",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a QuickBooks sync \u00b7 customer update",
          "id": null
        },
        {
          "type": "button",
          "label": "RECONCILE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Open invoices 60d+ \u00b7 collection queue",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a AR cash flow forecast \u00b7 30 days",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Dispute flags \u00b7 90-day review",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Match today's deposits \u00b7 open invoices",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Exception queue \u00b7 unmatched 3d+",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Daily cash position report",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Integration health check \u00b7 all systems",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a GL mapping gaps \u00b7 QuickBooks alignment",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Carrier accounts \u00b7 rate agreements",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Unapproved timesheets \u00b7 current period",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Billable utilization \u00b7 monthly report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Payroll export \u00b7 QuickBooks format",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Budget burn alerts \u00b7 overrun risk",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Project P&amp;L \u00b7 margin ranking",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Deliverables due this week \u00b7 status",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 BUILD REPORT",
          "id": null
        },
        {
          "type": "input",
          "label": "masterQuery",
          "id": "masterQuery"
        },
        {
          "type": "input",
          "label": "input-tax",
          "id": "input-tax"
        },
        {
          "type": "input",
          "label": "input-orders",
          "id": "input-orders"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": true,
      "decide": true,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/finops-suite/finops-main-strategist/manager-bar-patch.html",
    "vertical": "finops",
    "priority": "P0",
    "workflow": {
      "problem": "financial leakage",
      "problems": [
        "financial leakage",
        "invoice exceptions",
        "close-cycle delays",
        "spend visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "SAVE REPORT",
            "id": null
          }
        ]
      },
      "reports": [
        "Financial Exception Report",
        "Spend/Leakage Report",
        "Close Readiness Report",
        "Executive Finance Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u2193 Export Briefing",
          "id": null
        },
        {
          "type": "button",
          "label": "BUILD ACCOUNTING OPS REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "EXPORT PDF-READY",
          "id": null
        },
        {
          "type": "button",
          "label": "SAVE REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 GENERATE STRATEGIST REPORT",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 20,
      "controls": [
        {
          "type": "button",
          "label": "\u25b6 Needs Your Decision",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2193 Export Briefing",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25bc See decisions",
          "id": "mgr-toggle"
        },
        {
          "type": "button",
          "label": "Mark Done \u2713",
          "id": null
        },
        {
          "type": "button",
          "label": "Mark Done \u2713",
          "id": null
        },
        {
          "type": "button",
          "label": "Mark Done \u2713",
          "id": null
        },
        {
          "type": "button",
          "label": "Mark Done \u2713",
          "id": null
        },
        {
          "type": "button",
          "label": "Mark Done \u2713",
          "id": null
        },
        {
          "type": "button",
          "label": "BUILD ACCOUNTING OPS REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "EXPORT PDF-READY",
          "id": null
        },
        {
          "type": "button",
          "label": "SAVE REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 GENERATE STRATEGIST REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u21ba CLEAR OUTPUT",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN FINANCIAL COMMAND",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN COMPLIANCE",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN FINANCIAL INTEL",
          "id": null
        },
        {
          "type": "button",
          "label": "REFRESH",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN TAX PREP",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN COMPLIANCE",
          "id": null
        },
        {
          "type": "input",
          "label": "groqKey",
          "id": "groqKey"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": true,
      "report": true
    }
  },
  {
    "path": "html/finops-suite/finops-war/finops-war-room.html",
    "vertical": "finops",
    "priority": "P0",
    "workflow": {
      "problem": "financial leakage",
      "problems": [
        "financial leakage",
        "invoice exceptions",
        "close-cycle delays",
        "spend visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "DOC ANALYSIS",
            "id": null
          },
          {
            "type": "button",
            "label": "EXPORT ANALYSIS",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Financial Exception Report",
        "Spend/Leakage Report",
        "Close Readiness Report",
        "Executive Finance Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "EXPORT ANALYSIS",
          "id": null
        },
        {
          "type": "button",
          "label": "FULL REPORT \u2197",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "WAR ROOM",
          "id": null
        },
        {
          "type": "button",
          "label": "DOC ANALYSIS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 GUIDED TOUR",
          "id": "tourLaunchBtn"
        },
        {
          "type": "button",
          "label": "HOW-TO GUIDE",
          "id": null
        },
        {
          "type": "button",
          "label": "STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "EXECUTIVE",
          "id": null
        },
        {
          "type": "button",
          "label": "ACCOUNTING",
          "id": null
        },
        {
          "type": "button",
          "label": "OPERATIONS",
          "id": null
        },
        {
          "type": "button",
          "label": "AP Aging",
          "id": null
        },
        {
          "type": "button",
          "label": "GL Extract",
          "id": null
        },
        {
          "type": "button",
          "label": "Bank Recon",
          "id": null
        },
        {
          "type": "button",
          "label": "Invoice Audit",
          "id": null
        },
        {
          "type": "button",
          "label": "Budget Var.",
          "id": null
        },
        {
          "type": "button",
          "label": "ERA Batch",
          "id": null
        },
        {
          "type": "button",
          "label": "Cash Flow",
          "id": null
        },
        {
          "type": "button",
          "label": "Vendor Rpt",
          "id": null
        },
        {
          "type": "button",
          "label": "Tax / 1099",
          "id": null
        },
        {
          "type": "button",
          "label": "Other",
          "id": null
        },
        {
          "type": "button",
          "label": "AP Aging",
          "id": null
        },
        {
          "type": "button",
          "label": "GL Variance",
          "id": null
        },
        {
          "type": "button",
          "label": "ERA Batch",
          "id": null
        },
        {
          "type": "button",
          "label": "Invoice Audit",
          "id": null
        },
        {
          "type": "button",
          "label": "TEST",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 FIRE ALL 6 ENGINES",
          "id": "fireBtn"
        },
        {
          "type": "button",
          "label": "CLR",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 ESCALATE TO STRATEGIST \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "EXPORT ANALYSIS",
          "id": null
        },
        {
          "type": "button",
          "label": "CLEAR & RESET",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN ${name.toUpperCase()} \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 LAUNCH WITH MISSION GUIDE",
          "id": null
        },
        {
          "type": "button",
          "label": "CANCEL",
          "id": null
        },
        {
          "type": "button",
          "label": "LAUNCH WITH GUIDE \u2192",
          "id": "finops-modal-launch"
        },
        {
          "type": "button",
          "label": "FULL REPORT \u2197",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/hc-strategist.tsmatter.html",
    "vertical": "legal",
    "priority": "P0",
    "workflow": {
      "problem": "matter backlog",
      "problems": [
        "matter backlog",
        "deadline risk",
        "document review burden",
        "compliance exposure"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "ANALYZE",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Fulfillment bottleneck analysis",
            "id": null
          },
          {
            "type": "button",
            "label": "PROCESS",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Risk analysis \u00b7 AR late-pay prediction",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "\u203a Intake queue \u00b7 unlabeled 48h",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Open invoices 60d+ \u00b7 collection queue",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Dispute flags \u00b7 90-day review",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Exception queue \u00b7 unmatched 3d+",
            "id": null
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": [
          {
            "type": "button",
            "label": "\u203a Unapproved timesheets \u00b7 current period",
            "id": null
          }
        ]
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Matter Risk Report",
        "Deadline/Exception Report",
        "Document Intelligence Brief",
        "Executive Legal Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u203a Q1 tax liability export \u00b7 all 15 states",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Generate label \u00b7 carrier rate shop",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Daily cash position report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Billable utilization \u00b7 monthly report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Payroll export \u00b7 QuickBooks format",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 BUILD REPORT",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "\u26a1 DEPLOY",
          "id": "masterBtn"
        },
        {
          "type": "button",
          "label": "\u203a Q1 tax liability export \u00b7 all 15 states",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a New nexus risk by sales velocity",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Exemption certs expiring in 60 days",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Audit-ready Q reconciliation",
          "id": null
        },
        {
          "type": "button",
          "label": "ANALYZE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Generate label \u00b7 carrier rate shop",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Intake queue \u00b7 unlabeled 48h",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Fulfillment bottleneck analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Bank feed auto-match \u00b7 receipts",
          "id": null
        },
        {
          "type": "button",
          "label": "PROCESS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Risk analysis \u00b7 AR late-pay prediction",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Deposit \u2192 invoice auto-match",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a 30-60-90 aging \u00b7 collection actions",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a QuickBooks sync \u00b7 customer update",
          "id": null
        },
        {
          "type": "button",
          "label": "RECONCILE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Open invoices 60d+ \u00b7 collection queue",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a AR cash flow forecast \u00b7 30 days",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Dispute flags \u00b7 90-day review",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Match today's deposits \u00b7 open invoices",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Exception queue \u00b7 unmatched 3d+",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Daily cash position report",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Integration health check \u00b7 all systems",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a GL mapping gaps \u00b7 QuickBooks alignment",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Carrier accounts \u00b7 rate agreements",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Unapproved timesheets \u00b7 current period",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Billable utilization \u00b7 monthly report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Payroll export \u00b7 QuickBooks format",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Budget burn alerts \u00b7 overrun risk",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Project P&amp;L \u00b7 margin ranking",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Deliverables due this week \u00b7 status",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 BUILD REPORT",
          "id": null
        },
        {
          "type": "input",
          "label": "masterQuery",
          "id": "masterQuery"
        },
        {
          "type": "input",
          "label": "input-tax",
          "id": "input-tax"
        },
        {
          "type": "input",
          "label": "input-orders",
          "id": "input-orders"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": true,
      "decide": true,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/healthcare/hc-main-strategist.html",
    "vertical": "healthcare",
    "priority": "P0",
    "workflow": {
      "problem": "denial leakage",
      "problems": [
        "denial leakage",
        "revenue-cycle backlog",
        "documentation gaps",
        "operational exceptions"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u25c8 Run HC Strategist Analysis",
            "id": "strat-run-btn"
          },
          {
            "type": "button",
            "label": "Site Variance Analysis",
            "id": null
          },
          {
            "type": "button",
            "label": "\u25c8 ANALYZE",
            "id": null
          },
          {
            "type": "button",
            "label": "\u25c8 AI ANALYZE",
            "id": null
          },
          {
            "type": "button",
            "label": "\u26a1 RUN DENIAL PACK ON WAR ROOM DATA",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "\u25c8 AI REVIEW",
            "id": null
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Denial Recovery Report",
        "Revenue Leakage Report",
        "Appeal Priority Queue",
        "Executive Revenue-Cycle Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u25c8 PULL EXECUTIVE BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "Board Brief",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 GENERATE APPEAL FROM SELECTED CASE",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "\u25c8 Pull Revenue Pack",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25a3 Pull Site Variance",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 Pull Denial Recovery",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25ce Pull Auth Friction",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b2 Pull Compliance Sweep",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 PULL EXECUTIVE BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "\u21e2 ESCALATE / RELAY TO EXEC",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 Run HC Strategist Analysis",
          "id": "strat-run-btn"
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        },
        {
          "type": "button",
          "label": "\u21bb REFRESH",
          "id": null
        },
        {
          "type": "button",
          "label": "Draft CO-29 Appeal",
          "id": null
        },
        {
          "type": "button",
          "label": "Mesa Denial Spike",
          "id": null
        },
        {
          "type": "button",
          "label": "Denial Reduction Plan",
          "id": null
        },
        {
          "type": "button",
          "label": "Board Brief",
          "id": null
        },
        {
          "type": "button",
          "label": "Payer Strategy",
          "id": null
        },
        {
          "type": "button",
          "label": "99215 Defense",
          "id": null
        },
        {
          "type": "button",
          "label": "Site Variance Analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "Recovery Roadmap",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 COMPARE VARIANCE",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udd04 LOAD LIVE CASES",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 GENERATE APPEAL FROM SELECTED CASE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 ANALYZE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 Appeal",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 Appeal",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 Appeal",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 URGENT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 Medicare Strategy",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 Aetna Strategy",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 AI ANALYZE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 Coder Education Memo",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 Physician Query",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2695 E/M DOCUMENTATION CHECK \u2014 GATED (scores entered visit facts against CMS MDM levels, no AI-written notes)",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 AI VARIANCE PACK",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 COMPLIANCE SWEEP",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 AI REVIEW",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 TAXPREP NODE ALERT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 INJECT INTO STRATEGIST CONTEXT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 RUN DENIAL PACK ON WAR ROOM DATA",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": true,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/healthcare/hc-strategist/index.html",
    "vertical": "healthcare",
    "priority": "P0",
    "workflow": {
      "problem": "denial leakage",
      "problems": [
        "denial leakage",
        "revenue-cycle backlog",
        "documentation gaps",
        "operational exceptions"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\ud83d\udcc8 ANALYTICS",
            "id": null
          },
          {
            "type": "button",
            "label": "\ud83e\udde0 INTEL WORKBENCH AI ANALYSIS",
            "id": null
          },
          {
            "type": "button",
            "label": "Revenue Impact Scan",
            "id": null
          },
          {
            "type": "button",
            "label": "\u2b21 RUN ANOMALY SCAN",
            "id": "anomaly-btn"
          },
          {
            "type": "button",
            "label": "RUN ENTERPRISE BNCA",
            "id": null
          },
          {
            "type": "button",
            "label": "\u26a1 RUN BNCA",
            "id": null
          },
          {
            "type": "button",
            "label": "\u26a1 RUN ${tab} BNCA",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "SAVE CURRENT AS REPORT",
            "id": null
          },
          {
            "type": "button",
            "label": "SUBMIT TELEMETRY",
            "id": null
          },
          {
            "type": "button",
            "label": "SAVE REPORT",
            "id": null
          }
        ]
      },
      "reports": [
        "Denial Recovery Report",
        "Revenue Leakage Report",
        "Appeal Priority Queue",
        "Executive Revenue-Cycle Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\ud83d\uddc2 REPORTS",
          "id": null
        },
        {
          "type": "button",
          "label": "SAVE CURRENT AS REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2709\ufe0f GENERATE APPEAL LETTER",
          "id": "apl-btn"
        },
        {
          "type": "button",
          "label": "SAVE REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "EXPORT JSON",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udce4 EXPORT REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "GENERATE LEADERSHIP BRIEF",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "\u229e DASHBOARD",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcca NODE STATUS",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83c\udfaf PRIORITIES",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc8 ANALYTICS",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\uddc2 REPORTS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b21 ANOMALY ADVISOR",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2695 PAYER STRATEGY",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83e\udde0 INTEL WORKBENCH AI ANALYSIS",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 DOC SHOWCASE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 PRESETS",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udce8 EXEC CORRESPONDENCE",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83c\udfa4 PRESENTATION MODE",
          "id": null
        },
        {
          "type": "button",
          "label": "DISMISS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 ASK",
          "id": "dash-btn"
        },
        {
          "type": "button",
          "label": "SAVE CURRENT AS REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "SUBMIT TELEMETRY",
          "id": null
        },
        {
          "type": "button",
          "label": "Node Health Check",
          "id": null
        },
        {
          "type": "button",
          "label": "Cross-Node BNCA",
          "id": null
        },
        {
          "type": "button",
          "label": "Revenue Impact Scan",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 ASK",
          "id": "nodes-btn"
        },
        {
          "type": "button",
          "label": "\u2709\ufe0f GENERATE APPEAL LETTER",
          "id": "apl-btn"
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "SAVE REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "EXPORT JSON",
          "id": null
        },
        {
          "type": "button",
          "label": "REFRESH",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b21 RUN ANOMALY SCAN",
          "id": "anomaly-btn"
        },
        {
          "type": "button",
          "label": "OPEN NODE \u2197",
          "id": "anomaly-open-node-btn"
        },
        {
          "type": "button",
          "label": "RUN ENTERPRISE BNCA",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 ASK",
          "id": "ai-btn"
        },
        {
          "type": "button",
          "label": "\u26a1 RUN BNCA",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udce4 EXPORT REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN",
          "id": null
        },
        {
          "type": "button",
          "label": "DELETE",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY TALK TRACK",
          "id": null
        },
        {
          "type": "button",
          "label": "GENERATE LEADERSHIP BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 RUN ${tab} BNCA",
          "id": null
        },
        {
          "type": "input",
          "label": "dash-inp",
          "id": "dash-inp"
        },
        {
          "type": "input",
          "label": "nodes-inp",
          "id": "nodes-inp"
        },
        {
          "type": "input",
          "label": "apl-claim",
          "id": "apl-claim"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": true,
      "report": true
    }
  },
  {
    "path": "html/legal-pro/case-strategist.html",
    "vertical": "real_estate",
    "priority": "P0",
    "workflow": {
      "problem": "property operational leakage",
      "problems": [
        "property operational leakage",
        "maintenance backlog",
        "vendor performance",
        "turnover delays"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u26a1 RUN LEGAL MAIN STRATEGIST BNCA",
            "id": "run-bnca"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "QUEUE",
            "id": null
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "ASSIGN OWNER",
            "id": null
          },
          {
            "type": "button",
            "label": "\u2192 SEND TO EP",
            "id": null
          }
        ]
      },
      "reports": [
        "Property Operations Report",
        "Maintenance Exception Report",
        "Vendor Performance Report",
        "Portfolio Executive Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 14,
      "controls": [
        {
          "type": "button",
          "label": "STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "NODES",
          "id": null
        },
        {
          "type": "button",
          "label": "QUEUE",
          "id": null
        },
        {
          "type": "button",
          "label": "RELAY",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 RUN LEGAL MAIN STRATEGIST BNCA",
          "id": "run-bnca"
        },
        {
          "type": "button",
          "label": "ASSIGN OWNER",
          "id": null
        },
        {
          "type": "button",
          "label": "ESCALATE",
          "id": null
        },
        {
          "type": "button",
          "label": "CLEAR BLOCKER",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 SEND TO EP",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 LAUNCH EXECUTIVE PORTAL",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN EXECUTIVE PORTAL \u2192",
          "id": null
        },
        {
          "type": "input",
          "label": "matter-name",
          "id": "matter-name"
        },
        {
          "type": "input",
          "label": "responsible-partner",
          "id": "responsible-partner"
        },
        {
          "type": "input",
          "label": "hours-risk",
          "id": "hours-risk"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": true,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/pc-command.tsmatter.html",
    "vertical": "legal",
    "priority": "P0",
    "workflow": {
      "problem": "matter backlog",
      "problems": [
        "matter backlog",
        "deadline risk",
        "document review burden",
        "compliance exposure"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "ANALYZE",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Fulfillment bottleneck analysis",
            "id": null
          },
          {
            "type": "button",
            "label": "PROCESS",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Risk analysis \u00b7 AR late-pay prediction",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "\u203a Intake queue \u00b7 unlabeled 48h",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Open invoices 60d+ \u00b7 collection queue",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Dispute flags \u00b7 90-day review",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Exception queue \u00b7 unmatched 3d+",
            "id": null
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": [
          {
            "type": "button",
            "label": "\u203a Unapproved timesheets \u00b7 current period",
            "id": null
          }
        ]
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Matter Risk Report",
        "Deadline/Exception Report",
        "Document Intelligence Brief",
        "Executive Legal Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u203a Q1 tax liability export \u00b7 all 15 states",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Generate label \u00b7 carrier rate shop",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Daily cash position report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Billable utilization \u00b7 monthly report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Payroll export \u00b7 QuickBooks format",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 BUILD REPORT",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "\u26a1 DEPLOY",
          "id": "masterBtn"
        },
        {
          "type": "button",
          "label": "\u203a Q1 tax liability export \u00b7 all 15 states",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a New nexus risk by sales velocity",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Exemption certs expiring in 60 days",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Audit-ready Q reconciliation",
          "id": null
        },
        {
          "type": "button",
          "label": "ANALYZE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Generate label \u00b7 carrier rate shop",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Intake queue \u00b7 unlabeled 48h",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Fulfillment bottleneck analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Bank feed auto-match \u00b7 receipts",
          "id": null
        },
        {
          "type": "button",
          "label": "PROCESS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Risk analysis \u00b7 AR late-pay prediction",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Deposit \u2192 invoice auto-match",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a 30-60-90 aging \u00b7 collection actions",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a QuickBooks sync \u00b7 customer update",
          "id": null
        },
        {
          "type": "button",
          "label": "RECONCILE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Open invoices 60d+ \u00b7 collection queue",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a AR cash flow forecast \u00b7 30 days",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Dispute flags \u00b7 90-day review",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Match today's deposits \u00b7 open invoices",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Exception queue \u00b7 unmatched 3d+",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Daily cash position report",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Integration health check \u00b7 all systems",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a GL mapping gaps \u00b7 QuickBooks alignment",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Carrier accounts \u00b7 rate agreements",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Unapproved timesheets \u00b7 current period",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Billable utilization \u00b7 monthly report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Payroll export \u00b7 QuickBooks format",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Budget burn alerts \u00b7 overrun risk",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Project P&amp;L \u00b7 margin ranking",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Deliverables due this week \u00b7 status",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 BUILD REPORT",
          "id": null
        },
        {
          "type": "input",
          "label": "masterQuery",
          "id": "masterQuery"
        },
        {
          "type": "input",
          "label": "input-tax",
          "id": "input-tax"
        },
        {
          "type": "input",
          "label": "input-orders",
          "id": "input-orders"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": true,
      "decide": true,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/rrd-command.tsmatter.html",
    "vertical": "legal",
    "priority": "P0",
    "workflow": {
      "problem": "matter backlog",
      "problems": [
        "matter backlog",
        "deadline risk",
        "document review burden",
        "compliance exposure"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "ANALYZE",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Fulfillment bottleneck analysis",
            "id": null
          },
          {
            "type": "button",
            "label": "PROCESS",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Risk analysis \u00b7 AR late-pay prediction",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "\u203a Intake queue \u00b7 unlabeled 48h",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Open invoices 60d+ \u00b7 collection queue",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Dispute flags \u00b7 90-day review",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Exception queue \u00b7 unmatched 3d+",
            "id": null
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": [
          {
            "type": "button",
            "label": "\u203a Unapproved timesheets \u00b7 current period",
            "id": null
          }
        ]
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Matter Risk Report",
        "Deadline/Exception Report",
        "Document Intelligence Brief",
        "Executive Legal Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u203a Q1 tax liability export \u00b7 all 15 states",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Generate label \u00b7 carrier rate shop",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Daily cash position report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Billable utilization \u00b7 monthly report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Payroll export \u00b7 QuickBooks format",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 BUILD REPORT",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "\u26a1 DEPLOY",
          "id": "masterBtn"
        },
        {
          "type": "button",
          "label": "\u203a Q1 tax liability export \u00b7 all 15 states",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a New nexus risk by sales velocity",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Exemption certs expiring in 60 days",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Audit-ready Q reconciliation",
          "id": null
        },
        {
          "type": "button",
          "label": "ANALYZE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Generate label \u00b7 carrier rate shop",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Intake queue \u00b7 unlabeled 48h",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Fulfillment bottleneck analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Bank feed auto-match \u00b7 receipts",
          "id": null
        },
        {
          "type": "button",
          "label": "PROCESS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Risk analysis \u00b7 AR late-pay prediction",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Deposit \u2192 invoice auto-match",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a 30-60-90 aging \u00b7 collection actions",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a QuickBooks sync \u00b7 customer update",
          "id": null
        },
        {
          "type": "button",
          "label": "RECONCILE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Open invoices 60d+ \u00b7 collection queue",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a AR cash flow forecast \u00b7 30 days",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Dispute flags \u00b7 90-day review",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Match today's deposits \u00b7 open invoices",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Exception queue \u00b7 unmatched 3d+",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Daily cash position report",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Integration health check \u00b7 all systems",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a GL mapping gaps \u00b7 QuickBooks alignment",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Carrier accounts \u00b7 rate agreements",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Unapproved timesheets \u00b7 current period",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Billable utilization \u00b7 monthly report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Payroll export \u00b7 QuickBooks format",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Budget burn alerts \u00b7 overrun risk",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Project P&amp;L \u00b7 margin ranking",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Deliverables due this week \u00b7 status",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 BUILD REPORT",
          "id": null
        },
        {
          "type": "input",
          "label": "masterQuery",
          "id": "masterQuery"
        },
        {
          "type": "input",
          "label": "input-tax",
          "id": "input-tax"
        },
        {
          "type": "input",
          "label": "input-orders",
          "id": "input-orders"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": true,
      "decide": true,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/strategist00.tsmatter.html",
    "vertical": "legal",
    "priority": "P0",
    "workflow": {
      "problem": "matter backlog",
      "problems": [
        "matter backlog",
        "deadline risk",
        "document review burden",
        "compliance exposure"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "ANALYZE",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Fulfillment bottleneck analysis",
            "id": null
          },
          {
            "type": "button",
            "label": "PROCESS",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Risk analysis \u00b7 AR late-pay prediction",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          },
          {
            "type": "button",
            "label": "RUN",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "\u203a Intake queue \u00b7 unlabeled 48h",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Open invoices 60d+ \u00b7 collection queue",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Dispute flags \u00b7 90-day review",
            "id": null
          },
          {
            "type": "button",
            "label": "\u203a Exception queue \u00b7 unmatched 3d+",
            "id": null
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": [
          {
            "type": "button",
            "label": "\u203a Unapproved timesheets \u00b7 current period",
            "id": null
          }
        ]
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Matter Risk Report",
        "Deadline/Exception Report",
        "Document Intelligence Brief",
        "Executive Legal Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u203a Q1 tax liability export \u00b7 all 15 states",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Generate label \u00b7 carrier rate shop",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Daily cash position report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Billable utilization \u00b7 monthly report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Payroll export \u00b7 QuickBooks format",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 BUILD REPORT",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "\u26a1 DEPLOY",
          "id": "masterBtn"
        },
        {
          "type": "button",
          "label": "\u203a Q1 tax liability export \u00b7 all 15 states",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a New nexus risk by sales velocity",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Exemption certs expiring in 60 days",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Audit-ready Q reconciliation",
          "id": null
        },
        {
          "type": "button",
          "label": "ANALYZE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Generate label \u00b7 carrier rate shop",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Intake queue \u00b7 unlabeled 48h",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Fulfillment bottleneck analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Bank feed auto-match \u00b7 receipts",
          "id": null
        },
        {
          "type": "button",
          "label": "PROCESS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Risk analysis \u00b7 AR late-pay prediction",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Deposit \u2192 invoice auto-match",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a 30-60-90 aging \u00b7 collection actions",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a QuickBooks sync \u00b7 customer update",
          "id": null
        },
        {
          "type": "button",
          "label": "RECONCILE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Open invoices 60d+ \u00b7 collection queue",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a AR cash flow forecast \u00b7 30 days",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Dispute flags \u00b7 90-day review",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Match today's deposits \u00b7 open invoices",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Exception queue \u00b7 unmatched 3d+",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Daily cash position report",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Integration health check \u00b7 all systems",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a GL mapping gaps \u00b7 QuickBooks alignment",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Carrier accounts \u00b7 rate agreements",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Unapproved timesheets \u00b7 current period",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Billable utilization \u00b7 monthly report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Payroll export \u00b7 QuickBooks format",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Budget burn alerts \u00b7 overrun risk",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Project P&amp;L \u00b7 margin ranking",
          "id": null
        },
        {
          "type": "button",
          "label": "\u203a Deliverables due this week \u00b7 status",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 BUILD REPORT",
          "id": null
        },
        {
          "type": "input",
          "label": "masterQuery",
          "id": "masterQuery"
        },
        {
          "type": "input",
          "label": "input-tax",
          "id": "input-tax"
        },
        {
          "type": "input",
          "label": "input-orders",
          "id": "input-orders"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": true,
      "decide": true,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/insure-war/insurance-strategist.html",
    "vertical": "insurance",
    "priority": "P0",
    "workflow": {
      "problem": "claims leakage",
      "problems": [
        "claims leakage",
        "compliance exposure",
        "underwriting risk",
        "appeal backlog"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u269c RUN STRATEGIST CHAIN",
            "id": "runBtn"
          },
          {
            "type": "button",
            "label": "\u26a1 RUN ISSUE PACK ON WAR ROOM DATA",
            "id": null
          },
          {
            "type": "button",
            "label": "\u21ba RE-RUN",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "\u2192 SEND TO EXECUTIVE PORTAL",
            "id": null
          }
        ]
      },
      "reports": [
        "Claims Risk Report",
        "Compliance Exception Report",
        "Underwriting Risk Report",
        "Executive Insurance Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "EXPORT PACKAGE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u21ba Regenerate",
          "id": "tmg-regen-btn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 24,
      "controls": [
        {
          "type": "button",
          "label": "WAR ROOM",
          "id": null
        },
        {
          "type": "button",
          "label": "STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "EXECUTIVE",
          "id": null
        },
        {
          "type": "button",
          "label": "HUB",
          "id": null
        },
        {
          "type": "button",
          "label": "\u269c RUN STRATEGIST CHAIN",
          "id": "runBtn"
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 SEND TO EXECUTIVE PORTAL",
          "id": null
        },
        {
          "type": "button",
          "label": "EXPORT PACKAGE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 RUN ISSUE PACK ON WAR ROOM DATA",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        },
        {
          "type": "button",
          "label": "BILLING COORD",
          "id": null
        },
        {
          "type": "button",
          "label": "OFFICE MGR",
          "id": null
        },
        {
          "type": "button",
          "label": "RCM MANAGER",
          "id": null
        },
        {
          "type": "button",
          "label": "\u21ba RE-RUN",
          "id": null
        },
        {
          "type": "button",
          "label": "${collapsed?'\u25b2':'\u25bc'}",
          "id": "tmg-toggle-btn"
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": "tmg-close-btn"
        },
        {
          "type": "button",
          "label": "\u21ba Regenerate",
          "id": "tmg-regen-btn"
        },
        {
          "type": "button",
          "label": "\u2715 Clear Mission",
          "id": "tmg-clear-btn"
        },
        {
          "type": "button",
          "label": "Open \u2192",
          "id": "tmg-open-app"
        },
        {
          "type": "input",
          "label": "groqKey",
          "id": "groqKey"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": true,
      "report": true
    }
  },
  {
    "path": "html/construction-suite/construction-command-pro.html",
    "vertical": "construction",
    "priority": "P0",
    "workflow": {
      "problem": "project cost leakage",
      "problems": [
        "project cost leakage",
        "permit delays",
        "change-order exposure",
        "WIP and billing backlog"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u25b6 RUN WORKFLOW",
            "id": null
          },
          {
            "type": "button",
            "label": "\u26a1 FULL ANALYSIS",
            "id": null
          },
          {
            "type": "button",
            "label": "\u2696\ufe0f COMPLIANCE SCAN",
            "id": null
          },
          {
            "type": "button",
            "label": "\u25b6 Run a full job workflow",
            "id": null
          },
          {
            "type": "button",
            "label": "\ud83d\udcc4 Analyze job documents",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Project Risk Report",
        "WIP & Billing Report",
        "Permit/Proposal Exception Report",
        "Executive Project Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 19,
      "controls": [
        {
          "type": "button",
          "label": "\u25b6 RUN WORKFLOW",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 DEPLOY",
          "id": "btnDeploy"
        },
        {
          "type": "button",
          "label": "\u25c8 SYNTHESIZE",
          "id": "btnSynth"
        },
        {
          "type": "button",
          "label": "\u26a1 FULL ANALYSIS",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udccb CO EXTRACT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2696\ufe0f COMPLIANCE SCAN",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcb0 FINANCIAL EXTRACT",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcca EXEC SUMMARY",
          "id": null
        },
        {
          "type": "button",
          "label": "? HOW TO",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715 CLOSE",
          "id": null
        },
        {
          "type": "button",
          "label": "Ask",
          "id": "ai-btn"
        },
        {
          "type": "button",
          "label": "How To",
          "id": "tsmHowToToggle"
        },
        {
          "type": "button",
          "label": "\u25b6 Run a full job workflow",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 Analyze job documents",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83e\udde0 Get next actions for your job",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcca View all jobs in one command center",
          "id": null
        },
        {
          "type": "input",
          "label": "queryInput",
          "id": "queryInput"
        },
        {
          "type": "input",
          "label": "fileInput",
          "id": "fileInput"
        },
        {
          "type": "input",
          "label": "ai-input",
          "id": "ai-input"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/construction-suite/construction-command.html",
    "vertical": "construction",
    "priority": "P0",
    "workflow": {
      "problem": "project cost leakage",
      "problems": [
        "project cost leakage",
        "permit delays",
        "change-order exposure",
        "WIP and billing backlog"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u25b6 RUN WORKFLOW",
            "id": null
          },
          {
            "type": "button",
            "label": "\u26a1 FULL ANALYSIS",
            "id": null
          },
          {
            "type": "button",
            "label": "\u2696\ufe0f COMPLIANCE SCAN",
            "id": null
          },
          {
            "type": "button",
            "label": "\u25b6 Run a full job workflow",
            "id": null
          },
          {
            "type": "button",
            "label": "\ud83d\udcc4 Analyze job documents",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Project Risk Report",
        "WIP & Billing Report",
        "Permit/Proposal Exception Report",
        "Executive Project Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 19,
      "controls": [
        {
          "type": "button",
          "label": "\u25b6 RUN WORKFLOW",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 DEPLOY",
          "id": "btnDeploy"
        },
        {
          "type": "button",
          "label": "\u25c8 SYNTHESIZE",
          "id": "btnSynth"
        },
        {
          "type": "button",
          "label": "\u26a1 FULL ANALYSIS",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udccb CO EXTRACT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2696\ufe0f COMPLIANCE SCAN",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcb0 FINANCIAL EXTRACT",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcca EXEC SUMMARY",
          "id": null
        },
        {
          "type": "button",
          "label": "? HOW TO",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715 CLOSE",
          "id": null
        },
        {
          "type": "button",
          "label": "Ask",
          "id": "ai-btn"
        },
        {
          "type": "button",
          "label": "How To",
          "id": "tsmHowToToggle"
        },
        {
          "type": "button",
          "label": "\u25b6 Run a full job workflow",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcc4 Analyze job documents",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83e\udde0 Get next actions for your job",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcca View all jobs in one command center",
          "id": null
        },
        {
          "type": "input",
          "label": "queryInput",
          "id": "queryInput"
        },
        {
          "type": "input",
          "label": "fileInput",
          "id": "fileInput"
        },
        {
          "type": "input",
          "label": "ai-input",
          "id": "ai-input"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/finops-command-suite-v2.html",
    "vertical": "construction",
    "priority": "P0",
    "workflow": {
      "problem": "project cost leakage",
      "problems": [
        "project cost leakage",
        "permit delays",
        "change-order exposure",
        "WIP and billing backlog"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "&#9654; &nbsp;Ask Groq",
            "id": "groq-run"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Project Risk Report",
        "WIP & Billing Report",
        "Permit/Proposal Exception Report",
        "Executive Project Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "INJECT ANOMALY INTO WAR ROOM \u26a1",
          "id": null
        },
        {
          "type": "button",
          "label": "&#9654; &nbsp;Ask Groq",
          "id": "groq-run"
        },
        {
          "type": "input",
          "label": "groq-key",
          "id": "groq-key"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/finops-main-strategist.html",
    "vertical": "finops",
    "priority": "P0",
    "workflow": {
      "problem": "financial leakage",
      "problems": [
        "financial leakage",
        "invoice exceptions",
        "close-cycle delays",
        "spend visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u26a1 4-Engine Doc Analysis",
            "id": null
          },
          {
            "type": "button",
            "label": "\u25b6 Run Strategist \u2192",
            "id": null
          },
          {
            "type": "button",
            "label": "\u26a1 RUN ISSUE PACK ON WAR ROOM DATA",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "\ud83d\udcbe SAVE",
            "id": null
          }
        ]
      },
      "reports": [
        "Financial Exception Report",
        "Spend/Leakage Report",
        "Close Readiness Report",
        "Executive Finance Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u25b6 Strategist Report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Generate Strategist Report",
          "id": "genBtn"
        },
        {
          "type": "button",
          "label": "COPY REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2193 EXPORT TXT",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY CFO REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udce4 MGR EXPORT",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "\u2713 Approvals",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Strategist Report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 4-Engine Doc Analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c9 Node Status",
          "id": null
        },
        {
          "type": "button",
          "label": "? How To...",
          "id": null
        },
        {
          "type": "button",
          "label": "War Room",
          "id": "chip-warroom"
        },
        {
          "type": "button",
          "label": "Exec Portal",
          "id": "chip-exec"
        },
        {
          "type": "button",
          "label": "Manual",
          "id": "chip-manual"
        },
        {
          "type": "button",
          "label": "\u25b6 Generate Strategist Report",
          "id": "genBtn"
        },
        {
          "type": "button",
          "label": "\u2192 Relay to Executive Portal",
          "id": "relayExecBtn"
        },
        {
          "type": "button",
          "label": "\u21ba Clear Output",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2193 EXPORT TXT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Doc Engine",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c6 SAMPLE",
          "id": "modeS"
        },
        {
          "type": "button",
          "label": "\u2191 UPLOAD",
          "id": "modeU"
        },
        {
          "type": "button",
          "label": "AP Aging",
          "id": null
        },
        {
          "type": "button",
          "label": "AR",
          "id": null
        },
        {
          "type": "button",
          "label": "Bank Recon",
          "id": null
        },
        {
          "type": "button",
          "label": "GL / P&L",
          "id": null
        },
        {
          "type": "button",
          "label": "Tax / 1099",
          "id": null
        },
        {
          "type": "button",
          "label": "Expense",
          "id": null
        },
        {
          "type": "button",
          "label": "Compliance",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 FIRE ALL 4 ENGINES",
          "id": "fireBtn"
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY ACTION PLAN",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY CFO REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcbe SAVE",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udce4 MGR EXPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 PUSH TO STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "Cancel",
          "id": null
        },
        {
          "type": "button",
          "label": "Log Approvals \u2192 Relay to Executive",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 Doc Engine",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Run Strategist \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 RUN ISSUE PACK ON WAR ROOM DATA",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 INJECT INTO STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        },
        {
          "type": "button",
          "label": "AP COORDINATOR",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": true,
      "report": true
    }
  },
  {
    "path": "html/finops-suite/finops-main-strategist/index.html",
    "vertical": "finops",
    "priority": "P0",
    "workflow": {
      "problem": "financial leakage",
      "problems": [
        "financial leakage",
        "invoice exceptions",
        "close-cycle delays",
        "spend visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u26a1 4-Engine Doc Analysis",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": [
          {
            "type": "button",
            "label": "\u2713 Approve Items",
            "id": null
          }
        ]
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "\ud83d\udcbe SAVE",
            "id": null
          }
        ]
      },
      "reports": [
        "Financial Exception Report",
        "Spend/Leakage Report",
        "Close Readiness Report",
        "Executive Finance Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u2193 Brief",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Strategist Report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Generate Strategist Report",
          "id": "genBtn"
        },
        {
          "type": "button",
          "label": "COPY REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2193 EXPORT TXT",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY CFO REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udce4 MANAGER EXPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2193 EXPORT TXT",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "\u2193 Brief",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2713 Approve Items",
          "id": null
        },
        {
          "type": "button",
          "label": "Cancel",
          "id": null
        },
        {
          "type": "button",
          "label": "Log Approvals \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2190 Suite Hub",
          "id": null
        },
        {
          "type": "button",
          "label": "Daily Dashboard",
          "id": null
        },
        {
          "type": "button",
          "label": "Financial Intel",
          "id": null
        },
        {
          "type": "button",
          "label": "Controller Plan",
          "id": null
        },
        {
          "type": "button",
          "label": "Tax Prep",
          "id": null
        },
        {
          "type": "button",
          "label": "Compliance",
          "id": null
        },
        {
          "type": "button",
          "label": "Zero Trust",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Strategist Report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 4-Engine Doc Analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c9 Node Status",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Generate Strategist Report",
          "id": "genBtn"
        },
        {
          "type": "button",
          "label": "\u21ba Clear Output",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2193 EXPORT TXT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 PUSH TO DOC ENGINE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c6 SAMPLE",
          "id": "modeS"
        },
        {
          "type": "button",
          "label": "\u2191 UPLOAD",
          "id": "modeU"
        },
        {
          "type": "button",
          "label": "AP Aging",
          "id": null
        },
        {
          "type": "button",
          "label": "AR / Collections",
          "id": null
        },
        {
          "type": "button",
          "label": "Bank Recon",
          "id": null
        },
        {
          "type": "button",
          "label": "GL / P&L",
          "id": null
        },
        {
          "type": "button",
          "label": "Tax / 1099",
          "id": null
        },
        {
          "type": "button",
          "label": "Expense",
          "id": null
        },
        {
          "type": "button",
          "label": "Compliance",
          "id": null
        },
        {
          "type": "button",
          "label": "Zero Trust",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 FIRE ALL 4 ENGINES",
          "id": "fireBtn"
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY ACTION PLAN",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY CFO REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcbe SAVE",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udce4 MANAGER EXPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 PUSH TO STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2193 EXPORT TXT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2190 Suite Hub",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 Open Doc Engine",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": true,
      "execute": true,
      "report": true
    }
  },
  {
    "path": "html/finops-suite/finops-war/finops-main-strategist.html",
    "vertical": "finops",
    "priority": "P0",
    "workflow": {
      "problem": "financial leakage",
      "problems": [
        "financial leakage",
        "invoice exceptions",
        "close-cycle delays",
        "spend visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u26a1 4-Engine Doc Analysis",
            "id": null
          },
          {
            "type": "button",
            "label": "\u25b6 Run Strategist \u2192",
            "id": null
          },
          {
            "type": "button",
            "label": "\u26a1 RUN ISSUE PACK ON WAR ROOM DATA",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "\ud83d\udcbe SAVE",
            "id": null
          }
        ]
      },
      "reports": [
        "Financial Exception Report",
        "Spend/Leakage Report",
        "Close Readiness Report",
        "Executive Finance Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u25b6 Strategist Report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Generate Strategist Report",
          "id": "genBtn"
        },
        {
          "type": "button",
          "label": "COPY REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2193 EXPORT TXT",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY CFO REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udce4 MGR EXPORT",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "\u2713 Approvals",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Strategist Report",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 4-Engine Doc Analysis",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c9 Node Status",
          "id": null
        },
        {
          "type": "button",
          "label": "War Room",
          "id": "chip-warroom"
        },
        {
          "type": "button",
          "label": "Exec Portal",
          "id": "chip-exec"
        },
        {
          "type": "button",
          "label": "Manual",
          "id": "chip-manual"
        },
        {
          "type": "button",
          "label": "\u25b6 Generate Strategist Report",
          "id": "genBtn"
        },
        {
          "type": "button",
          "label": "\u2192 Relay to Executive Portal",
          "id": "relayExecBtn"
        },
        {
          "type": "button",
          "label": "\u21ba Clear Output",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2193 EXPORT TXT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Doc Engine",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c6 SAMPLE",
          "id": "modeS"
        },
        {
          "type": "button",
          "label": "\u2191 UPLOAD",
          "id": "modeU"
        },
        {
          "type": "button",
          "label": "AP Aging",
          "id": null
        },
        {
          "type": "button",
          "label": "AR",
          "id": null
        },
        {
          "type": "button",
          "label": "Bank Recon",
          "id": null
        },
        {
          "type": "button",
          "label": "GL / P&L",
          "id": null
        },
        {
          "type": "button",
          "label": "Tax / 1099",
          "id": null
        },
        {
          "type": "button",
          "label": "Expense",
          "id": null
        },
        {
          "type": "button",
          "label": "Compliance",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 FIRE ALL 4 ENGINES",
          "id": "fireBtn"
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY ACTION PLAN",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY CFO REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udcbe SAVE",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udce4 MGR EXPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 PUSH TO STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "Cancel",
          "id": null
        },
        {
          "type": "button",
          "label": "Log Approvals \u2192 Relay to Executive",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 Doc Engine",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Run Strategist \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 RUN ISSUE PACK ON WAR ROOM DATA",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 INJECT INTO STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        },
        {
          "type": "button",
          "label": "AP COORDINATOR",
          "id": null
        },
        {
          "type": "button",
          "label": "CONTROLLER",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": true,
      "report": true
    }
  },
  {
    "path": "html/healthcare/executive-portal.html",
    "vertical": "healthcare",
    "priority": "P0",
    "workflow": {
      "problem": "denial leakage",
      "problems": [
        "denial leakage",
        "revenue-cycle backlog",
        "documentation gaps",
        "operational exceptions"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u26a1 RUN DENIAL PACK ON WAR ROOM DATA",
            "id": null
          },
          {
            "type": "button",
            "label": "\u25c8 RUN HC STRATEGIST ANALYSIS",
            "id": null
          },
          {
            "type": "button",
            "label": "\u26a1 RUN DENIAL PACK",
            "id": null
          },
          {
            "type": "button",
            "label": "\u25c8 RUN HC STRATEGIST ANALYSIS",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "SAVE NOTE",
            "id": null
          },
          {
            "type": "button",
            "label": "SAVE NOTE",
            "id": null
          },
          {
            "type": "button",
            "label": "SAVE NOTE",
            "id": null
          },
          {
            "type": "button",
            "label": "SAVE NOTE",
            "id": null
          },
          {
            "type": "button",
            "label": "SAVE NOTE",
            "id": null
          },
          {
            "type": "button",
            "label": "SAVE NOTE",
            "id": null
          }
        ]
      },
      "reports": [
        "Denial Recovery Report",
        "Revenue Leakage Report",
        "Appeal Priority Queue",
        "Executive Revenue-Cycle Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u2b07 EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        },
        {
          "type": "button",
          "label": "\ud83d\udccb EXPORT REPORT",
          "id": "esc-export-btn"
        },
        {
          "type": "button",
          "label": "\u25c8 WAR ROOM BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 GENERATE / REFRESH DENIAL PACK",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 WAR ROOM BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 STRATEGIST REPORTS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 GENERATE / REFRESH DENIAL PACK",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udccb GENERATE PHYSICIAN E/M TEMPLATE",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "\u2b07 EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        },
        {
          "type": "button",
          "label": "+ NOTE",
          "id": null
        },
        {
          "type": "button",
          "label": "SAVE NOTE",
          "id": null
        },
        {
          "type": "button",
          "label": "+ NOTE",
          "id": null
        },
        {
          "type": "button",
          "label": "SAVE NOTE",
          "id": null
        },
        {
          "type": "button",
          "label": "+ NOTE",
          "id": null
        },
        {
          "type": "button",
          "label": "SAVE NOTE",
          "id": null
        },
        {
          "type": "button",
          "label": "+ NOTE",
          "id": null
        },
        {
          "type": "button",
          "label": "SAVE NOTE",
          "id": null
        },
        {
          "type": "button",
          "label": "+ NOTE",
          "id": null
        },
        {
          "type": "button",
          "label": "SAVE NOTE",
          "id": null
        },
        {
          "type": "button",
          "label": "+ NOTE",
          "id": null
        },
        {
          "type": "button",
          "label": "SAVE NOTE",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udccb EXPORT REPORT",
          "id": "esc-export-btn"
        },
        {
          "type": "button",
          "label": "\u2715 DISMISS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 WAR ROOM BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 DENIAL PACK",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25ce STRATEGIC ENGINE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 INJECT INTO STRATEGIST CONTEXT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 RUN DENIAL PACK ON WAR ROOM DATA",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 GENERATE / REFRESH DENIAL PACK",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 RUN HC STRATEGIST ANALYSIS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u21bb REFRESH",
          "id": null
        },
        {
          "type": "button",
          "label": "${q.label}",
          "id": null
        },
        {
          "type": "button",
          "label": "\u21bb REFRESH",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 WAR ROOM BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 DENIAL PACK",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25ce STRATEGIC ENGINE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u270e RESPOND / NOTES",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 STRATEGIST REPORTS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 MESH CONTINUITY",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 RUN DENIAL PACK",
          "id": null
        },
        {
          "type": "button",
          "label": "\u270e ADD RESPONSE NOTE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 GENERATE / REFRESH DENIAL PACK",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udccb GENERATE PHYSICIAN E/M TEMPLATE",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY TEMPLATE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 RUN HC STRATEGIST ANALYSIS",
          "id": null
        },
        {
          "type": "button",
          "label": "${q.label}",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2713 RELAY NOTE TO STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "CLEAR ALL",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": true,
      "report": true
    }
  },
  {
    "path": "html/l1-copilot/enterprise-command-center.html",
    "vertical": "itops",
    "priority": "P0",
    "workflow": {
      "problem": "ticket backlog",
      "problems": [
        "ticket backlog",
        "incident response delays",
        "SLA risk",
        "endpoint/network issues"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "Get Guidance",
            "id": "ai-widget-submit"
          },
          {
            "type": "button",
            "label": "Get Advice",
            "id": "l1a-send"
          }
        ]
      },
      "reports": [
        "Incident Summary Report",
        "Ticket/SLA Report",
        "Root-Cause Report",
        "Executive IT Operations Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 12,
      "controls": [
        {
          "type": "button",
          "label": "${c}",
          "id": null
        },
        {
          "type": "button",
          "label": "Inject Fault",
          "id": "vmware-fault-btn"
        },
        {
          "type": "button",
          "label": "Inject Fault",
          "id": "network-fault-btn"
        },
        {
          "type": "button",
          "label": "Inject Fault",
          "id": "ad-fault-btn"
        },
        {
          "type": "button",
          "label": "Inject Fault",
          "id": "device-fault-btn"
        },
        {
          "type": "button",
          "label": "Get Guidance",
          "id": "ai-widget-submit"
        },
        {
          "type": "button",
          "label": "${label}",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715 Close",
          "id": "howto-close"
        },
        {
          "type": "button",
          "label": "\ud83d\udcac",
          "id": "l1a-fab"
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": "l1a-close"
        },
        {
          "type": "button",
          "label": "Get Advice",
          "id": "l1a-send"
        },
        {
          "type": "input",
          "label": "ai-widget-input",
          "id": "ai-widget-input"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/logistics/logistics-situation-room.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u2b07 EXPORT BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 10,
      "controls": [
        {
          "type": "button",
          "label": "\u2190 BACK TO INTAKE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "ROUTE TO STRATEGIST \u2192",
          "id": "routeBtn"
        },
        {
          "type": "button",
          "label": "\u2190 INTAKE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 FIRE EXTRACTION ENGINE",
          "id": "fireEngineBtn"
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "STRATEGIST \u2014 COMING SOON",
          "id": "stratBtn"
        },
        {
          "type": "button",
          "label": "\u26a1 LAUNCH",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        },
        {
          "type": "input",
          "label": "logistics-file-input",
          "id": "logistics-file-input"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/supplier-vendor/supplier-vendor-situation-room.html",
    "vertical": "bpo",
    "priority": "P0",
    "workflow": {
      "problem": "processing backlog",
      "problems": [
        "processing backlog",
        "SLA misses",
        "quality variance",
        "manual processing"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "SLA Performance Report",
        "Processing Exception Report",
        "Quality/Throughput Report",
        "Client Executive Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u2b07 EXPORT BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 10,
      "controls": [
        {
          "type": "button",
          "label": "\u2190 BACK TO INTAKE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "ROUTE TO STRATEGIST \u2192",
          "id": "routeBtn"
        },
        {
          "type": "button",
          "label": "\u2190 INTAKE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 FIRE EXTRACTION ENGINE",
          "id": "fireEngineBtn"
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "STRATEGIST \u2014 COMING SOON",
          "id": "stratBtn"
        },
        {
          "type": "button",
          "label": "\u26a1 LAUNCH",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        },
        {
          "type": "input",
          "label": "vendor-file-input",
          "id": "vendor-file-input"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/bpo-war/bpo-war-room.html",
    "vertical": "bpo",
    "priority": "P0",
    "workflow": {
      "problem": "processing backlog",
      "problems": [
        "processing backlog",
        "SLA misses",
        "quality variance",
        "manual processing"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "SLA Performance Report",
        "Processing Exception Report",
        "Quality/Throughput Report",
        "Client Executive Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u2b07 EXPORT BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 10,
      "controls": [
        {
          "type": "button",
          "label": "\u2190 BACK TO INTAKE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "ROUTE TO STRATEGIST \u2192",
          "id": "routeBtn"
        },
        {
          "type": "button",
          "label": "\u2190 INTAKE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 FIRE EXTRACTION ENGINE",
          "id": "fireEngineBtn"
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "ROUTE TO STRATEGIST \u2192",
          "id": "stratBtn"
        },
        {
          "type": "button",
          "label": "\u26a1 LAUNCH",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        },
        {
          "type": "input",
          "label": "bpo-file-input",
          "id": "bpo-file-input"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/re-war/re-strategist.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "+ SAVE OUTPUT",
            "id": null
          }
        ]
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&#9889; FULL STRATEGIC BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8595; EXPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "STRATEGIC BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "&#9889; BUILD FULL BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8595; EXPORT (.TXT)",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 14,
      "controls": [
        {
          "type": "button",
          "label": "&#8592; WAR ROOM",
          "id": null
        },
        {
          "type": "button",
          "label": "&#9889; FULL STRATEGIC BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "&#9881; RESCUE PLAN",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8599; ESCALATE \u2192 EXEC PORTAL",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8595; EXPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "MODULES",
          "id": null
        },
        {
          "type": "button",
          "label": "STRATEGIC BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "RESCUE PLAN",
          "id": null
        },
        {
          "type": "button",
          "label": "+ SAVE OUTPUT",
          "id": null
        },
        {
          "type": "button",
          "label": "&#9889; BUILD FULL BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8599; ESCALATE \u2192 EXEC PORTAL",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8595; EXPORT (.TXT)",
          "id": null
        },
        {
          "type": "button",
          "label": "_",
          "id": "guide-toggle-btn"
        },
        {
          "type": "input",
          "label": "stratTitle",
          "id": "stratTitle"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": true,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/war-room-prep.html",
    "vertical": "healthcare",
    "priority": "P0",
    "workflow": {
      "problem": "denial leakage",
      "problems": [
        "denial leakage",
        "revenue-cycle backlog",
        "documentation gaps",
        "operational exceptions"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "RUN THE ENTERPRISE ENGINE \u2192",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Denial Recovery Report",
        "Revenue Leakage Report",
        "Appeal Priority Queue",
        "Executive Revenue-Cycle Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "Situation Room",
          "id": null
        },
        {
          "type": "button",
          "label": "Strategist",
          "id": null
        },
        {
          "type": "button",
          "label": "Exec Portal",
          "id": null
        },
        {
          "type": "button",
          "label": "Explainability",
          "id": null
        },
        {
          "type": "button",
          "label": "Cyber/OT Incident",
          "id": null
        },
        {
          "type": "button",
          "label": "Plant Incident",
          "id": null
        },
        {
          "type": "button",
          "label": "Supplier Shutdown",
          "id": null
        },
        {
          "type": "button",
          "label": "Validate Chain",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN THE ENTERPRISE ENGINE \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY DOC",
          "id": null
        },
        {
          "type": "button",
          "label": "RESET",
          "id": null
        },
        {
          "type": "button",
          "label": "NEXT: FINOPS \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY DOC",
          "id": null
        },
        {
          "type": "button",
          "label": "RESET",
          "id": null
        },
        {
          "type": "button",
          "label": "NEXT: INSURANCE \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY DOC",
          "id": null
        },
        {
          "type": "button",
          "label": "RESET",
          "id": null
        },
        {
          "type": "button",
          "label": "NEXT: CONSTRUCTION \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY DOC",
          "id": null
        },
        {
          "type": "button",
          "label": "RESET",
          "id": null
        },
        {
          "type": "button",
          "label": "NEXT: LEGAL \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY DOC",
          "id": null
        },
        {
          "type": "button",
          "label": "RESET",
          "id": null
        },
        {
          "type": "button",
          "label": "NEXT: REAL ESTATE \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY DOC",
          "id": null
        },
        {
          "type": "button",
          "label": "RESET",
          "id": null
        },
        {
          "type": "button",
          "label": "NEXT: MORTGAGE \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY DOC",
          "id": null
        },
        {
          "type": "button",
          "label": "RESET",
          "id": null
        },
        {
          "type": "button",
          "label": "NEXT: BPO \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY DOC",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY SUPPLIER DOC",
          "id": null
        },
        {
          "type": "button",
          "label": "RESET",
          "id": null
        },
        {
          "type": "button",
          "label": "NEXT: ORDER-TO-CASH \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "RESET",
          "id": null
        },
        {
          "type": "button",
          "label": "NEXT: CRM \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "RESET",
          "id": null
        },
        {
          "type": "button",
          "label": "NEXT: CPQ \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "RESET",
          "id": null
        },
        {
          "type": "button",
          "label": "NEXT: PRODUCT CATALOG \u2192",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/construction-suite/tsm-construction-command.html",
    "vertical": "construction",
    "priority": "P0",
    "workflow": {
      "problem": "project cost leakage",
      "problems": [
        "project cost leakage",
        "permit delays",
        "change-order exposure",
        "WIP and billing backlog"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u25b6 Run Analysis",
            "id": "nc-run"
          },
          {
            "type": "button",
            "label": "\u25b6 Run OCR + AI Analysis",
            "id": "bp-process-btn"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Project Risk Report",
        "WIP & Billing Report",
        "Permit/Proposal Exception Report",
        "Executive Project Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 7,
      "controls": [
        {
          "type": "button",
          "label": "\u25b6 Run Analysis",
          "id": "nc-run"
        },
        {
          "type": "button",
          "label": "\ud83d\udef0 Fly To Site",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Load Demo Project",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Run OCR + AI Analysis",
          "id": "bp-process-btn"
        },
        {
          "type": "input",
          "label": "nc-key",
          "id": "nc-key"
        },
        {
          "type": "input",
          "label": "geo-addr",
          "id": "geo-addr"
        },
        {
          "type": "input",
          "label": "bp-file",
          "id": "bp-file"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/finops-suite/finops-main-strategist/main-strategist.html",
    "vertical": "finops",
    "priority": "P0",
    "workflow": {
      "problem": "financial leakage",
      "problems": [
        "financial leakage",
        "invoice exceptions",
        "close-cycle delays",
        "spend visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u25b8 Generate Strategist Report",
            "id": "run-btn"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Financial Exception Report",
        "Spend/Leakage Report",
        "Close Readiness Report",
        "Executive Finance Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u25b8 Generate Strategist Report",
          "id": "run-btn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "\u25b8 Generate Strategist Report",
          "id": "run-btn"
        },
        {
          "type": "button",
          "label": "\u21ba Clear output",
          "id": null
        },
        {
          "type": "input",
          "label": "groq-key",
          "id": "groq-key"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/hotelops/hotelops-war-room.html",
    "vertical": "real_estate",
    "priority": "P0",
    "workflow": {
      "problem": "property operational leakage",
      "problems": [
        "property operational leakage",
        "maintenance backlog",
        "vendor performance",
        "turnover delays"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "RUN ANALYSIS",
            "id": "btnAnalyze"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "PARSE PREVIEW",
            "id": "btnIotImportPreview"
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "RESET SAVED DATA",
            "id": "btnResetData"
          }
        ]
      },
      "reports": [
        "Property Operations Report",
        "Maintenance Exception Report",
        "Vendor Performance Report",
        "Portfolio Executive Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 7,
      "controls": [
        {
          "type": "button",
          "label": "LOAD SAMPLE DATA",
          "id": "btnLoadSample"
        },
        {
          "type": "button",
          "label": "RESET SAVED DATA",
          "id": "btnResetData"
        },
        {
          "type": "button",
          "label": "PARSE PREVIEW",
          "id": "btnIotImportPreview"
        },
        {
          "type": "button",
          "label": "IMPORT TO WAR ROOM",
          "id": "btnIotImportCommit"
        },
        {
          "type": "button",
          "label": "RUN ANALYSIS",
          "id": "btnAnalyze"
        },
        {
          "type": "button",
          "label": "RELAY TO STRATEGIST &rarr;",
          "id": "btnRelay"
        },
        {
          "type": "input",
          "label": "iotImportReplace",
          "id": "iotImportReplace"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": true,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/pc-command/index.html",
    "vertical": "construction",
    "priority": "P0",
    "workflow": {
      "problem": "project cost leakage",
      "problems": [
        "project cost leakage",
        "permit delays",
        "change-order exposure",
        "WIP and billing backlog"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "RUN P&C BNCA",
            "id": null
          },
          {
            "type": "button",
            "label": "Run BNCA",
            "id": null
          },
          {
            "type": "button",
            "label": "\u26a1 RUN ${key} BNCA",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "Preview",
            "id": null
          },
          {
            "type": "button",
            "label": "Preview",
            "id": null
          },
          {
            "type": "button",
            "label": "Preview",
            "id": null
          },
          {
            "type": "button",
            "label": "Preview",
            "id": null
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "SAVE REPORT",
            "id": null
          },
          {
            "type": "button",
            "label": "Create Client Outreach",
            "id": null
          }
        ]
      },
      "reports": [
        "Project Risk Report",
        "WIP & Billing Report",
        "Permit/Proposal Exception Report",
        "Executive Project Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "AI BRIEFING",
          "id": null
        },
        {
          "type": "button",
          "label": "SAVE REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "Generate Quote",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 19,
      "controls": [
        {
          "type": "button",
          "label": "DASHBOARD",
          "id": null
        },
        {
          "type": "button",
          "label": "COVERAGE GAPS",
          "id": null
        },
        {
          "type": "button",
          "label": "RENEWALS",
          "id": null
        },
        {
          "type": "button",
          "label": "RISK SCORING",
          "id": null
        },
        {
          "type": "button",
          "label": "QUOTES",
          "id": null
        },
        {
          "type": "button",
          "label": "CLAIMS",
          "id": null
        },
        {
          "type": "button",
          "label": "CLIENT FILES",
          "id": null
        },
        {
          "type": "button",
          "label": "AI BRIEFING",
          "id": null
        },
        {
          "type": "button",
          "label": "Preview",
          "id": null
        },
        {
          "type": "button",
          "label": "Preview",
          "id": null
        },
        {
          "type": "button",
          "label": "Preview",
          "id": null
        },
        {
          "type": "button",
          "label": "Preview",
          "id": null
        },
        {
          "type": "button",
          "label": "RUN P&C BNCA",
          "id": null
        },
        {
          "type": "button",
          "label": "SAVE REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "Run BNCA",
          "id": null
        },
        {
          "type": "button",
          "label": "Generate Quote",
          "id": null
        },
        {
          "type": "button",
          "label": "Create Client Outreach",
          "id": null
        },
        {
          "type": "button",
          "label": "Push to Strategist",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 RUN ${key} BNCA",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": true,
      "decide": false,
      "execute": true,
      "report": true
    }
  },
  {
    "path": "html/strategist-index.html",
    "vertical": "construction",
    "priority": "P0",
    "workflow": {
      "problem": "project cost leakage",
      "problems": [
        "project cost leakage",
        "permit delays",
        "change-order exposure",
        "WIP and billing backlog"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "Run Playbook \u2192",
            "id": null
          },
          {
            "type": "button",
            "label": "Run Playbook \u2192",
            "id": null
          },
          {
            "type": "button",
            "label": "Run Playbook \u2192",
            "id": null
          },
          {
            "type": "button",
            "label": "Run Playbook \u2192",
            "id": null
          },
          {
            "type": "button",
            "label": "Run Playbook \u2192",
            "id": null
          },
          {
            "type": "button",
            "label": "Run Playbook \u2192",
            "id": null
          },
          {
            "type": "button",
            "label": "Run Playbook \u2192",
            "id": null
          },
          {
            "type": "button",
            "label": "Run Playbook \u2192",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "\u27a4",
            "id": "sendBtn"
          },
          {
            "type": "button",
            "label": "SEND",
            "id": null
          }
        ]
      },
      "reports": [
        "Project Risk Report",
        "WIP & Billing Report",
        "Permit/Proposal Exception Report",
        "Executive Project Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 20,
      "controls": [
        {
          "type": "button",
          "label": "Accept Essential",
          "id": null
        },
        {
          "type": "button",
          "label": "Decline Optional",
          "id": null
        },
        {
          "type": "button",
          "label": "Core Apps Suite \u25be",
          "id": "appsBtn"
        },
        {
          "type": "button",
          "label": "Run Playbook \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "Run Playbook \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "Run Playbook \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "Run Playbook \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "Run Playbook \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "Run Playbook \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "Run Playbook \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "Run Playbook \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "Compliance risks",
          "id": null
        },
        {
          "type": "button",
          "label": "Entity structuring",
          "id": null
        },
        {
          "type": "button",
          "label": "Hotel M&A",
          "id": null
        },
        {
          "type": "button",
          "label": "SOC 2 prep",
          "id": null
        },
        {
          "type": "button",
          "label": "Zero trust roadmap",
          "id": null
        },
        {
          "type": "button",
          "label": "RE structure",
          "id": null
        },
        {
          "type": "button",
          "label": "\u27a4",
          "id": "sendBtn"
        },
        {
          "type": "button",
          "label": "SEND",
          "id": null
        },
        {
          "type": "input",
          "label": "tsm-ai-input",
          "id": "tsm-ai-input"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/construct-war/construction-strategist.html",
    "vertical": "construction",
    "priority": "P0",
    "workflow": {
      "problem": "project cost leakage",
      "problems": [
        "project cost leakage",
        "permit delays",
        "change-order exposure",
        "WIP and billing backlog"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u26a1 Synthesize All \u2192 Push to BNCA",
            "id": "runBtn"
          },
          {
            "type": "button",
            "label": "\u26a1 RUN ISSUE PACK ON WAR ROOM DATA",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "Review",
            "id": null
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": [
          {
            "type": "button",
            "label": "Approve",
            "id": null
          }
        ]
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "Send Request",
            "id": null
          },
          {
            "type": "button",
            "label": "Send Request",
            "id": null
          },
          {
            "type": "button",
            "label": "Send Request",
            "id": null
          },
          {
            "type": "button",
            "label": "Save",
            "id": null
          }
        ]
      },
      "reports": [
        "Project Risk Report",
        "WIP & Billing Report",
        "Permit/Proposal Exception Report",
        "Executive Project Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 40,
      "controls": [
        {
          "type": "button",
          "label": "\u2192 Push",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Push",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Push",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Push",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Push",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Push",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Push",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Push",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 Synthesize All \u2192 Push to BNCA",
          "id": "synthAllBtn"
        },
        {
          "type": "button",
          "label": "Revoke",
          "id": null
        },
        {
          "type": "button",
          "label": "Revoke",
          "id": null
        },
        {
          "type": "button",
          "label": "Downgrade",
          "id": null
        },
        {
          "type": "button",
          "label": "Audit",
          "id": null
        },
        {
          "type": "button",
          "label": "Revoke",
          "id": null
        },
        {
          "type": "button",
          "label": "Review",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Push Zero Trust to Strategist BNCA",
          "id": null
        },
        {
          "type": "button",
          "label": "Send Request",
          "id": null
        },
        {
          "type": "button",
          "label": "Send Request",
          "id": null
        },
        {
          "type": "button",
          "label": "Send Request",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Push Tax Prep to Strategist BNCA",
          "id": null
        },
        {
          "type": "button",
          "label": "View",
          "id": null
        },
        {
          "type": "button",
          "label": "Approve",
          "id": null
        },
        {
          "type": "button",
          "label": "Renew",
          "id": null
        },
        {
          "type": "button",
          "label": "View",
          "id": null
        },
        {
          "type": "button",
          "label": "View",
          "id": null
        },
        {
          "type": "button",
          "label": "Renew",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Push Legal to Strategist BNCA",
          "id": null
        },
        {
          "type": "button",
          "label": "Save",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 Synthesize All \u2192 Push to BNCA",
          "id": "runBtn"
        },
        {
          "type": "button",
          "label": "\ud83d\udccb Push to Doc Engine",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 SYNTHESIZE + PUSH TO BNCA",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 ESCALATE TO EXECUTIVE",
          "id": null
        },
        {
          "type": "button",
          "label": "DISMISS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 RUN ISSUE PACK ON WAR ROOM DATA",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25c8 INJECT INTO STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        },
        {
          "type": "button",
          "label": "PROJECT MGR",
          "id": null
        },
        {
          "type": "button",
          "label": "SITE SUPERVISOR",
          "id": null
        },
        {
          "type": "button",
          "label": "EXEC",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": true,
      "decide": true,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/pm-copilot/pm-command.html",
    "vertical": "finops",
    "priority": "P0",
    "workflow": {
      "problem": "financial leakage",
      "problems": [
        "financial leakage",
        "invoice exceptions",
        "close-cycle delays",
        "spend visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "RUN ANALYSIS",
            "id": "btnAnalyze"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "RESET SAVED DATA",
            "id": "btnResetData"
          }
        ]
      },
      "reports": [
        "Financial Exception Report",
        "Spend/Leakage Report",
        "Close Readiness Report",
        "Executive Finance Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 9,
      "controls": [
        {
          "type": "button",
          "label": "LOAD SAMPLE DATA",
          "id": "btnLoadSample"
        },
        {
          "type": "button",
          "label": "RESET SAVED DATA",
          "id": "btnResetData"
        },
        {
          "type": "button",
          "label": "RUN ANALYSIS",
          "id": "btnAnalyze"
        },
        {
          "type": "button",
          "label": "RELAY TO STRATEGIST &rarr;",
          "id": "btnRelay"
        },
        {
          "type": "button",
          "label": "01 &middot; FINANCE",
          "id": null
        },
        {
          "type": "button",
          "label": "02 &middot; COMPLIANCE",
          "id": null
        },
        {
          "type": "button",
          "label": "03 &middot; MARKET",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2715",
          "id": null
        },
        {
          "type": "button",
          "label": "DISPATCH VENDOR",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/finops-main-strategist1.html",
    "vertical": "finops",
    "priority": "P0",
    "workflow": {
      "problem": "financial leakage",
      "problems": [
        "financial leakage",
        "invoice exceptions",
        "close-cycle delays",
        "spend visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u25b6 Run 1099 Outreach",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "\u25b6 Send AP Queue",
            "id": null
          },
          {
            "type": "button",
            "label": "\u25b6 Trigger Reconciliation Review",
            "id": null
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "SAVE REPORT",
            "id": null
          },
          {
            "type": "button",
            "label": "\u25b6 Send AP Queue",
            "id": null
          }
        ]
      },
      "reports": [
        "Financial Exception Report",
        "Spend/Leakage Report",
        "Close Readiness Report",
        "Executive Finance Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "BUILD ACCOUNTING OPS REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "EXPORT PDF-READY",
          "id": null
        },
        {
          "type": "button",
          "label": "SAVE REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Export Controller Report",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 14,
      "controls": [
        {
          "type": "button",
          "label": "BUILD ACCOUNTING OPS REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "EXPORT PDF-READY",
          "id": null
        },
        {
          "type": "button",
          "label": "SAVE REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN FINANCIAL COMMAND",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN COMPLIANCE",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN FINANCIAL INTEL",
          "id": null
        },
        {
          "type": "button",
          "label": "REFRESH",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN TAX PREP",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN COMPLIANCE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Send AP Queue",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Trigger Reconciliation Review",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Lock Month-End Close",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Run 1099 Outreach",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Export Controller Report",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": true,
      "decide": false,
      "execute": true,
      "report": true
    }
  },
  {
    "path": "html/finops-suite/finops-main-strategist/index1.html",
    "vertical": "finops",
    "priority": "P0",
    "workflow": {
      "problem": "financial leakage",
      "problems": [
        "financial leakage",
        "invoice exceptions",
        "close-cycle delays",
        "spend visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u25b6 Run 1099 Outreach",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "\u25b6 Send AP Queue",
            "id": null
          },
          {
            "type": "button",
            "label": "\u25b6 Trigger Reconciliation Review",
            "id": null
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "SAVE REPORT",
            "id": null
          },
          {
            "type": "button",
            "label": "\u25b6 Send AP Queue",
            "id": null
          }
        ]
      },
      "reports": [
        "Financial Exception Report",
        "Spend/Leakage Report",
        "Close Readiness Report",
        "Executive Finance Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "BUILD ACCOUNTING OPS REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "EXPORT PDF-READY",
          "id": null
        },
        {
          "type": "button",
          "label": "SAVE REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Export Controller Report",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 14,
      "controls": [
        {
          "type": "button",
          "label": "BUILD ACCOUNTING OPS REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "EXPORT PDF-READY",
          "id": null
        },
        {
          "type": "button",
          "label": "SAVE REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN FINANCIAL COMMAND",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN COMPLIANCE",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN FINANCIAL INTEL",
          "id": null
        },
        {
          "type": "button",
          "label": "REFRESH",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN TAX PREP",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN COMPLIANCE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Send AP Queue",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Trigger Reconciliation Review",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Lock Month-End Close",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Run 1099 Outreach",
          "id": null
        },
        {
          "type": "button",
          "label": "\u25b6 Export Controller Report",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": true,
      "decide": false,
      "execute": true,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/bpo-war/bpo-executive-portal.html",
    "vertical": "bpo",
    "priority": "P0",
    "workflow": {
      "problem": "processing backlog",
      "problems": [
        "processing backlog",
        "SLA misses",
        "quality variance",
        "manual processing"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": [
          {
            "type": "button",
            "label": "APPROVE STRATEGY",
            "id": null
          },
          {
            "type": "button",
            "label": "${item.status === 'approved' ? '\u2713 APPROVED' : 'APPROVE & EXECUTE'}",
            "id": "eqBtn${i}"
          }
        ]
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "\u2713 MARK EXECUTED",
            "id": "markExecutedBtn"
          },
          {
            "type": "button",
            "label": "ASSIGN OWNERS",
            "id": null
          },
          {
            "type": "button",
            "label": "\u2713 MARK EXECUTED",
            "id": "markExecutedBtnBar"
          },
          {
            "type": "button",
            "label": "${item.status === 'approved' ? '\u2713 APPROVED' : 'APPROVE & EXECUTE'}",
            "id": "eqBtn${i}"
          }
        ]
      },
      "reports": [
        "SLA Performance Report",
        "Processing Exception Report",
        "Quality/Throughput Report",
        "Client Executive Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u2b07 EXPORT EXEC BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "EXPORT BRIEF",
          "id": "dc-export-btn"
        },
        {
          "type": "button",
          "label": "\u25c8 GENERATE LIVE EXECUTIVE BRIEF \u2014 AI SYNTHESIS",
          "id": "liveBriefBtn"
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 14,
      "controls": [
        {
          "type": "button",
          "label": "\u2190 STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT EXEC BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2713 MARK EXECUTED",
          "id": "markExecutedBtn"
        },
        {
          "type": "button",
          "label": "APPROVE STRATEGY",
          "id": null
        },
        {
          "type": "button",
          "label": "ASSIGN OWNERS",
          "id": null
        },
        {
          "type": "button",
          "label": "NOTIFY STAKEHOLDERS",
          "id": null
        },
        {
          "type": "button",
          "label": "EXPORT BRIEF",
          "id": "dc-export-btn"
        },
        {
          "type": "button",
          "label": "\u25c8 GENERATE LIVE EXECUTIVE BRIEF \u2014 AI SYNTHESIS",
          "id": "liveBriefBtn"
        },
        {
          "type": "button",
          "label": "\u2190 STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2713 ACKNOWLEDGE",
          "id": "bpo-ack-btn"
        },
        {
          "type": "button",
          "label": "\u2191 ESCALATE",
          "id": "bpo-esc-btn"
        },
        {
          "type": "button",
          "label": "\u2713 MARK EXECUTED",
          "id": "markExecutedBtnBar"
        },
        {
          "type": "button",
          "label": "${item.status === 'approved' ? '\u2713 APPROVED' : 'APPROVE & EXECUTE'}",
          "id": "eqBtn${i}"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": true,
      "execute": true,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/bpo-war/bpo-strategist.html",
    "vertical": "bpo",
    "priority": "P0",
    "workflow": {
      "problem": "processing backlog",
      "problems": [
        "processing backlog",
        "SLA misses",
        "quality variance",
        "manual processing"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "SLA Performance Report",
        "Processing Exception Report",
        "Quality/Throughput Report",
        "Client Executive Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u2b07 EXPORT STRATEGY",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 GENERATE STRATEGY BRIEF",
          "id": "fireStratBtn"
        },
        {
          "type": "button",
          "label": "SLA REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "CLIENT BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT CLIENT PACKAGE",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 12,
      "controls": [
        {
          "type": "button",
          "label": "\u2190 SITUATION ROOM",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT STRATEGY",
          "id": null
        },
        {
          "type": "button",
          "label": "ESCALATE TO EXECUTIVE \u2192",
          "id": "escalateBtn"
        },
        {
          "type": "button",
          "label": "\u26a1 GENERATE STRATEGY BRIEF",
          "id": "fireStratBtn"
        },
        {
          "type": "button",
          "label": "SLA REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "CLIENT BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "ESCALATIONS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2190 SITUATION ROOM",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT CLIENT PACKAGE",
          "id": null
        },
        {
          "type": "button",
          "label": "ESCALATE TO EXECUTIVE \u2192",
          "id": "escalateBtnBar"
        },
        {
          "type": "button",
          "label": "SELECT THIS SCENARIO",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/construct-war/construction-executive-portal.html",
    "vertical": "construction",
    "priority": "P0",
    "workflow": {
      "problem": "project cost leakage",
      "problems": [
        "project cost leakage",
        "permit delays",
        "change-order exposure",
        "WIP and billing backlog"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "REVIEW",
            "id": null
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Project Risk Report",
        "WIP & Billing Report",
        "Permit/Proposal Exception Report",
        "Executive Project Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u2b07 EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 11,
      "controls": [
        {
          "type": "button",
          "label": "HUB",
          "id": null
        },
        {
          "type": "button",
          "label": "WAR ROOM",
          "id": null
        },
        {
          "type": "button",
          "label": "STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "EXECUTIVE",
          "id": null
        },
        {
          "type": "button",
          "label": "AUDITOPS",
          "id": null
        },
        {
          "type": "button",
          "label": "AUTHORIZE",
          "id": "d1-authorize-btn"
        },
        {
          "type": "button",
          "label": "OPEN",
          "id": null
        },
        {
          "type": "button",
          "label": "REVIEW",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        },
        {
          "type": "button",
          "label": "OPEN WAR ROOM",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN STRATEGIST",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": true,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/mortgage/mortgage-war-room.html",
    "vertical": "mortgage",
    "priority": "P0",
    "workflow": {
      "problem": "pipeline bottlenecks",
      "problems": [
        "pipeline bottlenecks",
        "documentation exceptions",
        "underwriting risk",
        "closing delays"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "RUN AI ANALYSIS",
            "id": "btnRunAnalysis"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "RESET SAVED DATA",
            "id": "btnResetData"
          }
        ]
      },
      "reports": [
        "Loan Pipeline Risk Report",
        "Underwriting Exception Report",
        "Closing Readiness Report",
        "Executive Mortgage Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 6,
      "controls": [
        {
          "type": "button",
          "label": "HOW-TO GUIDE",
          "id": "mtgHowtoBtn"
        },
        {
          "type": "button",
          "label": "CLOSE",
          "id": null
        },
        {
          "type": "button",
          "label": "LOAD SAMPLE DATA",
          "id": "btnLoadSample"
        },
        {
          "type": "button",
          "label": "RESET SAVED DATA",
          "id": "btnResetData"
        },
        {
          "type": "button",
          "label": "RUN AI ANALYSIS",
          "id": "btnRunAnalysis"
        },
        {
          "type": "button",
          "label": "RELAY TO STRATEGIST &rarr;",
          "id": "btnRelay"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/music-war/how-to-guide.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 1,
      "controls": [
        {
          "type": "button",
          "label": "Later",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/pm-copilot/pm-strategist.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 2,
      "controls": [
        {
          "type": "button",
          "label": "INJECT ANOMALY INTO WAR ROOM \u26a1",
          "id": null
        },
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/re-war/re-exec-portal.html",
    "vertical": "mortgage",
    "priority": "P0",
    "workflow": {
      "problem": "pipeline bottlenecks",
      "problems": [
        "pipeline bottlenecks",
        "documentation exceptions",
        "underwriting risk",
        "closing delays"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u26a1 REFRESH PIPELINE ANALYSIS",
            "id": null
          },
          {
            "type": "button",
            "label": "\u26a1 AI DEAL ANALYSIS",
            "id": null
          },
          {
            "type": "button",
            "label": "\u26a1 GENERATE MORTGAGE ANALYSIS",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "+ SAVE CURRENT OUTPUT",
            "id": null
          }
        ]
      },
      "reports": [
        "Loan Pipeline Risk Report",
        "Underwriting Exception Report",
        "Closing Readiness Report",
        "Executive Mortgage Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u26a1 GENERATE BRIEF",
          "id": "gen-btn"
        },
        {
          "type": "button",
          "label": "\u26a1 GENERATE BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 AI-GENERATE ACTION ITEMS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 GENERATE BOARD REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 GENERATE REO 60-DAY PLAN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 GENERATE MORTGAGE ANALYSIS",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 13,
      "controls": [
        {
          "type": "button",
          "label": "\u26a1 GENERATE BRIEF",
          "id": "gen-btn"
        },
        {
          "type": "button",
          "label": "\ud83d\udd34 DEAL RESCUE",
          "id": "rescue-btn"
        },
        {
          "type": "button",
          "label": "\u26a1 GENERATE BRIEF",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 AI-GENERATE ACTION ITEMS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 REFRESH PIPELINE ANALYSIS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 GENERATE BOARD REPORT",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 AI DEAL ANALYSIS",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 COMPLIANCE SWEEP AI",
          "id": null
        },
        {
          "type": "button",
          "label": "\ud83d\udd34 LAUNCH DEAL RESCUE PACK",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 GENERATE REO 60-DAY PLAN",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 GENERATE MORTGAGE ANALYSIS",
          "id": null
        },
        {
          "type": "button",
          "label": "+ SAVE CURRENT OUTPUT",
          "id": null
        },
        {
          "type": "button",
          "label": "_",
          "id": "guide-toggle-btn"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": true,
      "report": true
    }
  },
  {
    "path": "html/finops-suite/finops-war/finops-executive-portal.html",
    "vertical": "finops",
    "priority": "P0",
    "workflow": {
      "problem": "financial leakage",
      "problems": [
        "financial leakage",
        "invoice exceptions",
        "close-cycle delays",
        "spend visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "DOC ANALYSIS",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Financial Exception Report",
        "Spend/Leakage Report",
        "Close Readiness Report",
        "Executive Finance Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u2b07 EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 12,
      "controls": [
        {
          "type": "button",
          "label": "DOC ANALYSIS",
          "id": null
        },
        {
          "type": "button",
          "label": "WAR ROOM",
          "id": null
        },
        {
          "type": "button",
          "label": "STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "EXECUTIVE",
          "id": null
        },
        {
          "type": "button",
          "label": "ACCOUNTING",
          "id": null
        },
        {
          "type": "button",
          "label": "OPERATIONS",
          "id": null
        },
        {
          "type": "button",
          "label": "WAR ROOM",
          "id": null
        },
        {
          "type": "button",
          "label": "STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "COMPLIANCE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        },
        {
          "type": "button",
          "label": "OPEN WAR ROOM",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN STRATEGIST",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/legal-main-strategist.html",
    "vertical": "legal",
    "priority": "P0",
    "workflow": {
      "problem": "matter backlog",
      "problems": [
        "matter backlog",
        "deadline risk",
        "document review burden",
        "compliance exposure"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u25b6 Run Strategic Synthesis",
            "id": "synth-btn"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Matter Risk Report",
        "Deadline/Exception Report",
        "Document Intelligence Brief",
        "Executive Legal Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u2193 EXPORT FULL REPORT",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 7,
      "controls": [
        {
          "type": "button",
          "label": "\u25b6 Run Strategic Synthesis",
          "id": "synth-btn"
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2193 EXPORT FULL REPORT",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/governance/governance-executive-portal.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/governance/governance-war-room.html",
    "vertical": "legal",
    "priority": "P0",
    "workflow": {
      "problem": "matter backlog",
      "problems": [
        "matter backlog",
        "deadline risk",
        "document review burden",
        "compliance exposure"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "RUN COMPLIANCE ANALYSIS",
            "id": "btnAnalyze"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Matter Risk Report",
        "Deadline/Exception Report",
        "Document Intelligence Brief",
        "Executive Legal Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 2,
      "controls": [
        {
          "type": "button",
          "label": "RUN COMPLIANCE ANALYSIS",
          "id": "btnAnalyze"
        },
        {
          "type": "button",
          "label": "RELAY TO EXECUTIVE \u2192",
          "id": "btnRelay"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/insure-war/insurance-executive-portal.html",
    "vertical": "insurance",
    "priority": "P0",
    "workflow": {
      "problem": "claims leakage",
      "problems": [
        "claims leakage",
        "compliance exposure",
        "underwriting risk",
        "appeal backlog"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Claims Risk Report",
        "Compliance Exception Report",
        "Underwriting Risk Report",
        "Executive Insurance Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u2b07 EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 10,
      "controls": [
        {
          "type": "button",
          "label": "WAR ROOM",
          "id": null
        },
        {
          "type": "button",
          "label": "STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "EXECUTIVE",
          "id": null
        },
        {
          "type": "button",
          "label": "HUB",
          "id": null
        },
        {
          "type": "button",
          "label": "WAR ROOM",
          "id": "d1-action-btn"
        },
        {
          "type": "button",
          "label": "STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "COMPLIANCE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        },
        {
          "type": "button",
          "label": "OPEN WAR ROOM",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN STRATEGIST",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/legal-war/legal-executive-portal.html",
    "vertical": "legal",
    "priority": "P0",
    "workflow": {
      "problem": "matter backlog",
      "problems": [
        "matter backlog",
        "deadline risk",
        "document review burden",
        "compliance exposure"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": [
          {
            "type": "button",
            "label": "APPROVE",
            "id": null
          }
        ]
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Matter Risk Report",
        "Deadline/Exception Report",
        "Document Intelligence Brief",
        "Executive Legal Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u2b07 EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 9,
      "controls": [
        {
          "type": "button",
          "label": "\u2b07 EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        },
        {
          "type": "button",
          "label": "AUTHORIZE",
          "id": null
        },
        {
          "type": "button",
          "label": "SIGN",
          "id": null
        },
        {
          "type": "button",
          "label": "APPROVE",
          "id": null
        },
        {
          "type": "button",
          "label": "Cancel",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 CONFIRM AUTHORIZATION",
          "id": null
        },
        {
          "type": "button",
          "label": "AUTHORIZE",
          "id": null
        },
        {
          "type": "input",
          "label": "modal-exec",
          "id": "modal-exec"
        },
        {
          "type": "input",
          "label": "modal-note",
          "id": "modal-note"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": true,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/legal-war/legal-main-strategist.html",
    "vertical": "legal",
    "priority": "P0",
    "workflow": {
      "problem": "matter backlog",
      "problems": [
        "matter backlog",
        "deadline risk",
        "document review burden",
        "compliance exposure"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u25b6 Run Strategic Synthesis",
            "id": "synth-btn"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Matter Risk Report",
        "Deadline/Exception Report",
        "Document Intelligence Brief",
        "Executive Legal Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u2193 EXPORT FULL REPORT",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 7,
      "controls": [
        {
          "type": "button",
          "label": "\u25b6 Run Strategic Synthesis",
          "id": "synth-btn"
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "COPY",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2193 EXPORT FULL REPORT",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/mdm/mdm-strategist.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": [
          {
            "type": "button",
            "label": "ONE-CLICK APPROVE",
            "id": null
          }
        ]
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 5,
      "controls": [
        {
          "type": "button",
          "label": "KEEP ${m.recordA.id}",
          "id": null
        },
        {
          "type": "button",
          "label": "KEEP ${m.recordB.id}",
          "id": null
        },
        {
          "type": "button",
          "label": "NOT A DUPLICATE \u2014 REJECT",
          "id": null
        },
        {
          "type": "button",
          "label": "ONE-CLICK APPROVE",
          "id": null
        },
        {
          "type": "button",
          "label": "REJECT",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": true,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/mdm/mdm-war-room.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "SCAN FOR CROSS-DOMAIN RISKS",
            "id": "btnCrossDomainScan"
          },
          {
            "type": "button",
            "label": "RUN AI ANALYSIS",
            "id": "btnAnalyze"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "GENERATE CLIENT TRUST PACKAGE",
          "id": "btnTrustPackage"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 9,
      "controls": [
        {
          "type": "button",
          "label": "REFRESH",
          "id": "btnLoad"
        },
        {
          "type": "button",
          "label": "RESET DATA",
          "id": "btnReset"
        },
        {
          "type": "button",
          "label": "SCAN FOR CROSS-DOMAIN RISKS",
          "id": "btnCrossDomainScan"
        },
        {
          "type": "button",
          "label": "GENERATE CLIENT TRUST PACKAGE",
          "id": "btnTrustPackage"
        },
        {
          "type": "button",
          "label": "RUN AI ANALYSIS",
          "id": "btnAnalyze"
        },
        {
          "type": "button",
          "label": "RELAY TO STRATEGIST &rarr;",
          "id": "btnRelay"
        },
        {
          "type": "button",
          "label": "KEEP ${m.recordA.id}",
          "id": null
        },
        {
          "type": "button",
          "label": "KEEP ${m.recordB.id}",
          "id": null
        },
        {
          "type": "button",
          "label": "REJECT",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/governance/governance-strategist.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/pm-copilot/pm-exec-portal.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#8681; EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 4,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#8681; EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/l1-copilot/noc/noc-executive-portal.html",
    "vertical": "itops",
    "priority": "P0",
    "workflow": {
      "problem": "ticket backlog",
      "problems": [
        "ticket backlog",
        "incident response delays",
        "SLA risk",
        "endpoint/network issues"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Incident Summary Report",
        "Ticket/SLA Report",
        "Root-Cause Report",
        "Executive IT Operations Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#8681; EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 4,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#8681; EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/executive-portal-live.html",
    "vertical": "healthcare",
    "priority": "P0",
    "workflow": {
      "problem": "denial leakage",
      "problems": [
        "denial leakage",
        "revenue-cycle backlog",
        "documentation gaps",
        "operational exceptions"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Denial Recovery Report",
        "Revenue Leakage Report",
        "Appeal Priority Queue",
        "Executive Revenue-Cycle Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "Generate full report \u2197",
          "id": "ep-generate-btn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 7,
      "controls": [
        {
          "type": "button",
          "label": "Push relay item \u2197",
          "id": null
        },
        {
          "type": "button",
          "label": "Healthcare",
          "id": null
        },
        {
          "type": "button",
          "label": "Insurance",
          "id": null
        },
        {
          "type": "button",
          "label": "FinOps",
          "id": null
        },
        {
          "type": "button",
          "label": "Construction",
          "id": null
        },
        {
          "type": "button",
          "label": "Enterprise View",
          "id": null
        },
        {
          "type": "button",
          "label": "Generate full report \u2197",
          "id": "ep-generate-btn"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/concierge/concierge-executive-portal.html",
    "vertical": "hotel",
    "priority": "P0",
    "workflow": {
      "problem": "maintenance response",
      "problems": [
        "maintenance response",
        "guest-service coordination",
        "revenue leakage",
        "vendor coordination"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": [
          {
            "type": "button",
            "label": "\u2713 ACKNOWLEDGE &amp; CLOSE CHAIN",
            "id": "approveBtn"
          }
        ]
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Hotel Operations Report",
        "Maintenance Exception Report",
        "Guest-Service Report",
        "Executive Hotel Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 4,
      "controls": [
        {
          "type": "button",
          "label": "\u2190 STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "\u21bb REFRESH",
          "id": null
        },
        {
          "type": "button",
          "label": "GO TO STRATEGIST \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2713 ACKNOWLEDGE &amp; CLOSE CHAIN",
          "id": "approveBtn"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": true,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/business-development/tsm-outreach-command-center.html",
    "vertical": "healthcare",
    "priority": "P0",
    "workflow": {
      "problem": "denial leakage",
      "problems": [
        "denial leakage",
        "revenue-cycle backlog",
        "documentation gaps",
        "operational exceptions"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "Save Meeting Notes",
            "id": null
          }
        ]
      },
      "reports": [
        "Denial Recovery Report",
        "Revenue Leakage Report",
        "Appeal Priority Queue",
        "Executive Revenue-Cycle Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 6,
      "controls": [
        {
          "type": "button",
          "label": "Add To Pipeline",
          "id": null
        },
        {
          "type": "button",
          "label": "Update Score",
          "id": null
        },
        {
          "type": "button",
          "label": "Save Meeting Notes",
          "id": null
        },
        {
          "type": "input",
          "label": "org",
          "id": "org"
        },
        {
          "type": "input",
          "label": "contact",
          "id": "contact"
        },
        {
          "type": "input",
          "label": "role",
          "id": "role"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/tsm-wip-command-center.html",
    "vertical": "construction",
    "priority": "P0",
    "workflow": {
      "problem": "project cost leakage",
      "problems": [
        "project cost leakage",
        "permit delays",
        "change-order exposure",
        "WIP and billing backlog"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "Save readiness",
            "id": "readinessSave"
          }
        ]
      },
      "reports": [
        "Project Risk Report",
        "WIP & Billing Report",
        "Permit/Proposal Exception Report",
        "Executive Project Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 21,
      "controls": [
        {
          "type": "button",
          "label": "Save readiness",
          "id": "readinessSave"
        },
        {
          "type": "button",
          "label": "Add",
          "id": "dqAddBtn"
        },
        {
          "type": "button",
          "label": "Add",
          "id": "taskAddBtn"
        },
        {
          "type": "button",
          "label": "Add",
          "id": "decAddBtn"
        },
        {
          "type": "button",
          "label": "Add",
          "id": "trendAddBtn"
        },
        {
          "type": "button",
          "label": "${esc(v.label)}",
          "id": null
        },
        {
          "type": "button",
          "label": "\u00d7",
          "id": "${d.id}"
        },
        {
          "type": "button",
          "label": "\u00d7",
          "id": "${t.id}"
        },
        {
          "type": "input",
          "label": "dqSource",
          "id": "dqSource"
        },
        {
          "type": "input",
          "label": "taskAction",
          "id": "taskAction"
        },
        {
          "type": "input",
          "label": "taskOwner",
          "id": "taskOwner"
        },
        {
          "type": "input",
          "label": "taskDue",
          "id": "taskDue"
        },
        {
          "type": "input",
          "label": "decTitle",
          "id": "decTitle"
        },
        {
          "type": "input",
          "label": "decImpact",
          "id": "decImpact"
        },
        {
          "type": "input",
          "label": "decCost",
          "id": "decCost"
        },
        {
          "type": "input",
          "label": "decRec",
          "id": "decRec"
        },
        {
          "type": "input",
          "label": "decConf",
          "id": "decConf"
        },
        {
          "type": "input",
          "label": "trendEvent",
          "id": "trendEvent"
        },
        {
          "type": "input",
          "label": "trendDate",
          "id": "trendDate"
        },
        {
          "type": "input",
          "label": "trendHours",
          "id": "trendHours"
        },
        {
          "type": "input",
          "label": "trendNotes",
          "id": "trendNotes"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/ins-main-strategist/index.html",
    "vertical": "insurance",
    "priority": "P0",
    "workflow": {
      "problem": "claims leakage",
      "problems": [
        "claims leakage",
        "compliance exposure",
        "underwriting risk",
        "appeal backlog"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Claims Risk Report",
        "Compliance Exception Report",
        "Underwriting Risk Report",
        "Executive Insurance Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "OPEN UNIFIED EXECUTIVE PORTAL",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN P&C COMMAND",
          "id": null
        },
        {
          "type": "button",
          "label": "OPEN INS PRESENTATION",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/property-accountant/property-accountant-command.html",
    "vertical": "mortgage",
    "priority": "P0",
    "workflow": {
      "problem": "pipeline bottlenecks",
      "problems": [
        "pipeline bottlenecks",
        "documentation exceptions",
        "underwriting risk",
        "closing delays"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "RUN CLOSE ANALYSIS",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Loan Pipeline Risk Report",
        "Underwriting Exception Report",
        "Closing Readiness Report",
        "Executive Mortgage Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "RUN CLOSE ANALYSIS",
          "id": null
        },
        {
          "type": "button",
          "label": "ESCALATE TO STRATEGIST",
          "id": null
        },
        {
          "type": "button",
          "label": "BUILD EXECUTIVE CLOSE PACKAGE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/integration-hub/integration-hub.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "ANALYZE INTEGRATION HEALTH",
            "id": "btnAnalyze"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 2,
      "controls": [
        {
          "type": "button",
          "label": "ANALYZE INTEGRATION HEALTH",
          "id": "btnAnalyze"
        },
        {
          "type": "button",
          "label": "RELAY TO STRATEGIST \u2192",
          "id": "btnRelay"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/digital-twin/digital-twin.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "GENERATE EXECUTIVE BRIEF",
            "id": "btnAnalyze"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "GENERATE EXECUTIVE BRIEF",
          "id": "btnAnalyze"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 2,
      "controls": [
        {
          "type": "button",
          "label": "GENERATE EXECUTIVE BRIEF",
          "id": "btnAnalyze"
        },
        {
          "type": "button",
          "label": "RELAY TO BOARD \u2192",
          "id": "btnRelay"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/l1-copilot/noc/noc-war-room.html",
    "vertical": "itops",
    "priority": "P0",
    "workflow": {
      "problem": "ticket backlog",
      "problems": [
        "ticket backlog",
        "incident response delays",
        "SLA risk",
        "endpoint/network issues"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "RUN AI ANALYSIS",
            "id": "btnRunAnalysis"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "PARSE PREVIEW",
            "id": "btnImportPreview"
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "RESET SAVED DATA",
            "id": "btnResetData"
          }
        ]
      },
      "reports": [
        "Incident Summary Report",
        "Ticket/SLA Report",
        "Root-Cause Report",
        "Executive IT Operations Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 7,
      "controls": [
        {
          "type": "button",
          "label": "LOAD SAMPLE DATA",
          "id": "btnLoadSample"
        },
        {
          "type": "button",
          "label": "RESET SAVED DATA",
          "id": "btnResetData"
        },
        {
          "type": "button",
          "label": "PARSE PREVIEW",
          "id": "btnImportPreview"
        },
        {
          "type": "button",
          "label": "IMPORT TO WAR ROOM",
          "id": "btnImportCommit"
        },
        {
          "type": "button",
          "label": "RUN AI ANALYSIS",
          "id": "btnRunAnalysis"
        },
        {
          "type": "button",
          "label": "RELAY TO STRATEGIST &rarr;",
          "id": "btnRelay"
        },
        {
          "type": "input",
          "label": "importReplace",
          "id": "importReplace"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": true,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/o2c/o2c-war-room.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "RUN AI ANALYSIS",
            "id": "btnRunAnalysis"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 4,
      "controls": [
        {
          "type": "button",
          "label": "LOAD PASTED",
          "id": "btnLoadPaste"
        },
        {
          "type": "button",
          "label": "LOAD SAMPLES",
          "id": "btnLoadSample"
        },
        {
          "type": "button",
          "label": "RUN AI ANALYSIS",
          "id": "btnRunAnalysis"
        },
        {
          "type": "button",
          "label": "RELAY TO STRATEGIST \u2192",
          "id": "btnRelay"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/mortgage/mortgage-executive-portal.html",
    "vertical": "mortgage",
    "priority": "P0",
    "workflow": {
      "problem": "pipeline bottlenecks",
      "problems": [
        "pipeline bottlenecks",
        "documentation exceptions",
        "underwriting risk",
        "closing delays"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Loan Pipeline Risk Report",
        "Underwriting Exception Report",
        "Closing Readiness Report",
        "Executive Mortgage Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#8681; EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 4,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#8681; EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/hotelops/hotelops-executive-portal.html",
    "vertical": "hotel",
    "priority": "P0",
    "workflow": {
      "problem": "maintenance response",
      "problems": [
        "maintenance response",
        "guest-service coordination",
        "revenue leakage",
        "vendor coordination"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Hotel Operations Report",
        "Maintenance Exception Report",
        "Guest-Service Report",
        "Executive Hotel Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#8681; EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 4,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#8681; EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/honeywell-executive-portal.html",
    "vertical": "mortgage",
    "priority": "P0",
    "workflow": {
      "problem": "pipeline bottlenecks",
      "problems": [
        "pipeline bottlenecks",
        "documentation exceptions",
        "underwriting risk",
        "closing delays"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Loan Pipeline Risk Report",
        "Underwriting Exception Report",
        "Closing Readiness Report",
        "Executive Mortgage Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u2193 Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 6,
      "controls": [
        {
          "type": "button",
          "label": "\u21bb Pull Latest",
          "id": "refreshBtn"
        },
        {
          "type": "button",
          "label": "\u2193 Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "\u2b07 EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        },
        {
          "type": "button",
          "label": "\u2713 AUTHORIZE RESPONSE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2191 NOTIFY BOARD",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2190 BACK TO STRATEGIST",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/schools-command/schools-executive-portal.html",
    "vertical": "schools",
    "priority": "P0",
    "workflow": {
      "problem": "grant compliance",
      "problems": [
        "grant compliance",
        "documentation gaps",
        "administrative backlog",
        "operational exceptions"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Compliance Exception Report",
        "Grant/Documentation Risk Report",
        "Operational Exception Report",
        "Executive Schools Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#8681; EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 4,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#8681; EXPORT CLIENT PACKAGE",
          "id": "tsmk-delivery-btn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/music-war/release/marketing.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 1,
      "controls": [
        {
          "type": "button",
          "label": "Later",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/honeywell-strategist.html",
    "vertical": "bpo",
    "priority": "P0",
    "workflow": {
      "problem": "processing backlog",
      "problems": [
        "processing backlog",
        "SLA misses",
        "quality variance",
        "manual processing"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u21bb Pull Latest Analysis",
            "id": "refreshBtn"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "SLA Performance Report",
        "Processing Exception Report",
        "Quality/Throughput Report",
        "Client Executive Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u2193 Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 5,
      "controls": [
        {
          "type": "button",
          "label": "\u21bb Pull Latest Analysis",
          "id": "refreshBtn"
        },
        {
          "type": "button",
          "label": "\u2193 Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "\u2191 ESCALATE TO EXECUTIVE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2713 ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2190 BACK TO WAR ROOM",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/music-war/release/release-center.html",
    "vertical": "legal",
    "priority": "P0",
    "workflow": {
      "problem": "matter backlog",
      "problems": [
        "matter backlog",
        "deadline risk",
        "document review burden",
        "compliance exposure"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Matter Risk Report",
        "Deadline/Exception Report",
        "Document Intelligence Brief",
        "Executive Legal Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u26a1 Generate Press Bio + Pitch",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 5,
      "controls": [
        {
          "type": "button",
          "label": "\u26a1 Generate Press Bio + Pitch",
          "id": null
        },
        {
          "type": "input",
          "label": "mTitle",
          "id": "mTitle"
        },
        {
          "type": "input",
          "label": "mArtist",
          "id": "mArtist"
        },
        {
          "type": "input",
          "label": "mDate",
          "id": "mDate"
        },
        {
          "type": "input",
          "label": "mFeat",
          "id": "mFeat"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/concierge-command.html",
    "vertical": "hotel",
    "priority": "P0",
    "workflow": {
      "problem": "maintenance response",
      "problems": [
        "maintenance response",
        "guest-service coordination",
        "revenue leakage",
        "vendor coordination"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "SEND",
            "id": null
          }
        ]
      },
      "reports": [
        "Hotel Operations Report",
        "Maintenance Exception Report",
        "Guest-Service Report",
        "Executive Hotel Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 7,
      "controls": [
        {
          "type": "button",
          "label": "\u26a1 DEPLOY",
          "id": "btnDeploy"
        },
        {
          "type": "button",
          "label": "\u25c8 SYNTHESIZE",
          "id": "btnSynth"
        },
        {
          "type": "button",
          "label": "Ask",
          "id": "ai-btn"
        },
        {
          "type": "button",
          "label": "SEND",
          "id": null
        },
        {
          "type": "input",
          "label": "queryInput",
          "id": "queryInput"
        },
        {
          "type": "input",
          "label": "ai-input",
          "id": "ai-input"
        },
        {
          "type": "input",
          "label": "tsm-ai-input",
          "id": "tsm-ai-input"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/l1-copilot/noc/noc-strategist.html",
    "vertical": "itops",
    "priority": "P0",
    "workflow": {
      "problem": "ticket backlog",
      "problems": [
        "ticket backlog",
        "incident response delays",
        "SLA risk",
        "endpoint/network issues"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Incident Summary Report",
        "Ticket/SLA Report",
        "Root-Cause Report",
        "Executive IT Operations Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 1,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/approval/approval-war-room.html",
    "vertical": "healthcare",
    "priority": "P0",
    "workflow": {
      "problem": "denial leakage",
      "problems": [
        "denial leakage",
        "revenue-cycle backlog",
        "documentation gaps",
        "operational exceptions"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "RUN AI ANALYSIS",
            "id": "btnRunAnalysis"
          },
          {
            "type": "input",
            "label": "searchInput",
            "id": "searchInput"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "RESET SAVED DATA",
            "id": "btnResetData"
          }
        ]
      },
      "reports": [
        "Denial Recovery Report",
        "Revenue Leakage Report",
        "Appeal Priority Queue",
        "Executive Revenue-Cycle Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 6,
      "controls": [
        {
          "type": "button",
          "label": "LOAD SAMPLE DATA",
          "id": "btnLoadSample"
        },
        {
          "type": "button",
          "label": "RESET SAVED DATA",
          "id": "btnResetData"
        },
        {
          "type": "button",
          "label": "RUN AI ANALYSIS",
          "id": "btnRunAnalysis"
        },
        {
          "type": "button",
          "label": "RELAY TO STRATEGIST &rarr;",
          "id": "btnRelay"
        },
        {
          "type": "button",
          "label": "CHECK DELEGATION STATUS",
          "id": "btnCheckDelegation"
        },
        {
          "type": "input",
          "label": "searchInput",
          "id": "searchInput"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/cpq/cpq-war-room.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "RUN AI ANALYSIS",
            "id": "btnRunAnalysis"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "RESET SAVED DATA",
            "id": "btnResetData"
          }
        ]
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 8,
      "controls": [
        {
          "type": "button",
          "label": "LOAD SAMPLE DATA",
          "id": "btnLoadSample"
        },
        {
          "type": "button",
          "label": "RESET SAVED DATA",
          "id": "btnResetData"
        },
        {
          "type": "button",
          "label": "RUN AI ANALYSIS",
          "id": "btnRunAnalysis"
        },
        {
          "type": "button",
          "label": "RELAY TO STRATEGIST &rarr;",
          "id": "btnRelay"
        },
        {
          "type": "button",
          "label": "CHECK COMPATIBILITY + DISCOUNT",
          "id": "btnCheckRules"
        },
        {
          "type": "input",
          "label": "ruleListValue",
          "id": "ruleListValue"
        },
        {
          "type": "input",
          "label": "ruleNetValue",
          "id": "ruleNetValue"
        },
        {
          "type": "input",
          "label": "ruleCostBasis",
          "id": "ruleCostBasis"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/approval-war-room.html",
    "vertical": "healthcare",
    "priority": "P0",
    "workflow": {
      "problem": "denial leakage",
      "problems": [
        "denial leakage",
        "revenue-cycle backlog",
        "documentation gaps",
        "operational exceptions"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "RUN AI ANALYSIS",
            "id": "btnRunAnalysis"
          },
          {
            "type": "input",
            "label": "searchInput",
            "id": "searchInput"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "RESET SAVED DATA",
            "id": "btnResetData"
          }
        ]
      },
      "reports": [
        "Denial Recovery Report",
        "Revenue Leakage Report",
        "Appeal Priority Queue",
        "Executive Revenue-Cycle Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 6,
      "controls": [
        {
          "type": "button",
          "label": "LOAD SAMPLE DATA",
          "id": "btnLoadSample"
        },
        {
          "type": "button",
          "label": "RESET SAVED DATA",
          "id": "btnResetData"
        },
        {
          "type": "button",
          "label": "RUN AI ANALYSIS",
          "id": "btnRunAnalysis"
        },
        {
          "type": "button",
          "label": "RELAY TO STRATEGIST &rarr;",
          "id": "btnRelay"
        },
        {
          "type": "button",
          "label": "CHECK DELEGATION STATUS",
          "id": "btnCheckDelegation"
        },
        {
          "type": "input",
          "label": "searchInput",
          "id": "searchInput"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/cpq-war-room.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "RUN AI ANALYSIS",
            "id": "btnRunAnalysis"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "RESET SAVED DATA",
            "id": "btnResetData"
          }
        ]
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 8,
      "controls": [
        {
          "type": "button",
          "label": "LOAD SAMPLE DATA",
          "id": "btnLoadSample"
        },
        {
          "type": "button",
          "label": "RESET SAVED DATA",
          "id": "btnResetData"
        },
        {
          "type": "button",
          "label": "RUN AI ANALYSIS",
          "id": "btnRunAnalysis"
        },
        {
          "type": "button",
          "label": "RELAY TO STRATEGIST &rarr;",
          "id": "btnRelay"
        },
        {
          "type": "button",
          "label": "CHECK COMPATIBILITY + DISCOUNT",
          "id": "btnCheckRules"
        },
        {
          "type": "input",
          "label": "ruleListValue",
          "id": "ruleListValue"
        },
        {
          "type": "input",
          "label": "ruleNetValue",
          "id": "ruleNetValue"
        },
        {
          "type": "input",
          "label": "ruleCostBasis",
          "id": "ruleCostBasis"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/catalog/catalog-war-room.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "RUN AI ANALYSIS",
            "id": "btnRunAnalysis"
          },
          {
            "type": "input",
            "label": "searchInput",
            "id": "searchInput"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "RESET SAVED DATA",
            "id": "btnResetData"
          }
        ]
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 6,
      "controls": [
        {
          "type": "button",
          "label": "LOAD SAMPLE DATA",
          "id": "btnLoadSample"
        },
        {
          "type": "button",
          "label": "RESET SAVED DATA",
          "id": "btnResetData"
        },
        {
          "type": "button",
          "label": "RUN AI ANALYSIS",
          "id": "btnRunAnalysis"
        },
        {
          "type": "button",
          "label": "PUBLISH TO CPQ &rarr;",
          "id": "btnPublishCpq"
        },
        {
          "type": "button",
          "label": "RELAY TO STRATEGIST &rarr;",
          "id": "btnRelay"
        },
        {
          "type": "input",
          "label": "searchInput",
          "id": "searchInput"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/crm/crm-war-room.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "RUN AI ANALYSIS",
            "id": "btnRunAnalysis"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "RESET SAVED DATA",
            "id": "btnResetData"
          }
        ]
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 5,
      "controls": [
        {
          "type": "button",
          "label": "LOAD SAMPLE DATA",
          "id": "btnLoadSample"
        },
        {
          "type": "button",
          "label": "RESET SAVED DATA",
          "id": "btnResetData"
        },
        {
          "type": "button",
          "label": "RUN AI ANALYSIS",
          "id": "btnRunAnalysis"
        },
        {
          "type": "button",
          "label": "RELAY TO STRATEGIST &rarr;",
          "id": "btnRelay"
        },
        {
          "type": "button",
          "label": "CONVERT",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/catalog-war-room.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "RUN AI ANALYSIS",
            "id": "btnRunAnalysis"
          },
          {
            "type": "input",
            "label": "searchInput",
            "id": "searchInput"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "RESET SAVED DATA",
            "id": "btnResetData"
          }
        ]
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 6,
      "controls": [
        {
          "type": "button",
          "label": "LOAD SAMPLE DATA",
          "id": "btnLoadSample"
        },
        {
          "type": "button",
          "label": "RESET SAVED DATA",
          "id": "btnResetData"
        },
        {
          "type": "button",
          "label": "RUN AI ANALYSIS",
          "id": "btnRunAnalysis"
        },
        {
          "type": "button",
          "label": "PUBLISH TO CPQ &rarr;",
          "id": "btnPublishCpq"
        },
        {
          "type": "button",
          "label": "RELAY TO STRATEGIST &rarr;",
          "id": "btnRelay"
        },
        {
          "type": "input",
          "label": "searchInput",
          "id": "searchInput"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/concierge/concierge-strategist.html",
    "vertical": "hotel",
    "priority": "P0",
    "workflow": {
      "problem": "maintenance response",
      "problems": [
        "maintenance response",
        "guest-service coordination",
        "revenue leakage",
        "vendor coordination"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Hotel Operations Report",
        "Maintenance Exception Report",
        "Guest-Service Report",
        "Executive Hotel Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "\u2190 WAR ROOM",
          "id": null
        },
        {
          "type": "button",
          "label": "\u21bb REFRESH",
          "id": null
        },
        {
          "type": "button",
          "label": "CONFIRM &amp; ROUTE TO EXEC \u2192",
          "id": "confirmBtn"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/music-war/creation/song-builder.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "\u26a1 Generate Song",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 11,
      "controls": [
        {
          "type": "button",
          "label": "\u2190 Back",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 Generate Song",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2190 Back",
          "id": "backBtn"
        },
        {
          "type": "button",
          "label": "Next \u2192",
          "id": "nextBtn"
        },
        {
          "type": "button",
          "label": "Copy Lyrics",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Cadence Studio",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Recording Coach",
          "id": null
        },
        {
          "type": "button",
          "label": "Build New Song",
          "id": null
        },
        {
          "type": "input",
          "label": "hookInput",
          "id": "hookInput"
        },
        {
          "type": "input",
          "label": "bpmInput",
          "id": "bpmInput"
        },
        {
          "type": "input",
          "label": "keyInput",
          "id": "keyInput"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/music-war/creation/beat-workbench.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "Analyze Beat",
            "id": null
          },
          {
            "type": "button",
            "label": "Analyze New Beat",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 7,
      "controls": [
        {
          "type": "button",
          "label": "Choose File",
          "id": null
        },
        {
          "type": "button",
          "label": "Analyze Beat",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Open in Song Builder",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Open in Cadence Studio",
          "id": null
        },
        {
          "type": "button",
          "label": "Analyze New Beat",
          "id": null
        },
        {
          "type": "input",
          "label": "fileInput",
          "id": "fileInput"
        },
        {
          "type": "input",
          "label": "urlInput",
          "id": "urlInput"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/concierge/concierge-war-room.html",
    "vertical": "real_estate",
    "priority": "P0",
    "workflow": {
      "problem": "property operational leakage",
      "problems": [
        "property operational leakage",
        "maintenance backlog",
        "vendor performance",
        "turnover delays"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Property Operations Report",
        "Maintenance Exception Report",
        "Vendor Performance Report",
        "Portfolio Executive Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 16,
      "controls": [
        {
          "type": "button",
          "label": "\u2190 PLATFORM HUB",
          "id": null
        },
        {
          "type": "button",
          "label": "\u21bb REFRESH MISSIONS",
          "id": null
        },
        {
          "type": "button",
          "label": "GET QUOTES \u2192",
          "id": "quoteBtn"
        },
        {
          "type": "button",
          "label": "BOOK \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "\u21bb REFRESH",
          "id": null
        },
        {
          "type": "button",
          "label": "SIMULATE \u2192 ${next.replace(/_/g,' ').toUpperCase()}",
          "id": null
        },
        {
          "type": "button",
          "label": "CANCEL",
          "id": null
        },
        {
          "type": "input",
          "label": "qPickup",
          "id": "qPickup"
        },
        {
          "type": "input",
          "label": "qDest",
          "id": "qDest"
        },
        {
          "type": "input",
          "label": "qDate",
          "id": "qDate"
        },
        {
          "type": "input",
          "label": "qTime",
          "id": "qTime"
        },
        {
          "type": "input",
          "label": "qPax",
          "id": "qPax"
        },
        {
          "type": "input",
          "label": "qBags",
          "id": "qBags"
        },
        {
          "type": "input",
          "label": "bGuest",
          "id": "bGuest"
        },
        {
          "type": "input",
          "label": "bProperty",
          "id": "bProperty"
        },
        {
          "type": "input",
          "label": "bNotes",
          "id": "bNotes"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/music-war/demo-conductor.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 9,
      "controls": [
        {
          "type": "button",
          "label": "\u201cI already use ChatGPT.\u201d",
          "id": null
        },
        {
          "type": "button",
          "label": "\u201cI don\u2019t need this.\u201d",
          "id": null
        },
        {
          "type": "button",
          "label": "\u201cHow much is it?\u201d",
          "id": null
        },
        {
          "type": "button",
          "label": "\u201cCan AI really judge music?\u201d",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2190 Back",
          "id": null
        },
        {
          "type": "button",
          "label": "Next \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "Unlock Access Now",
          "id": null
        },
        {
          "type": "input",
          "label": "unlockName",
          "id": "unlockName"
        },
        {
          "type": "input",
          "label": "unlockEmail",
          "id": "unlockEmail"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/tsm-member-command-center.html",
    "vertical": "general",
    "priority": "P0",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": [
          {
            "type": "button",
            "label": "Create",
            "id": "createMemberBtn"
          }
        ]
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 5,
      "controls": [
        {
          "type": "button",
          "label": "+ Add Member",
          "id": "toggleAddBtn"
        },
        {
          "type": "button",
          "label": "Refresh",
          "id": "refreshBtn"
        },
        {
          "type": "button",
          "label": "Create",
          "id": "createMemberBtn"
        },
        {
          "type": "button",
          "label": "Cancel",
          "id": "cancelAddBtn"
        },
        {
          "type": "input",
          "label": "newMemberName",
          "id": "newMemberName"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": true,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/music-war/academy/daw-academy.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 2,
      "controls": [
        {
          "type": "button",
          "label": "Ask",
          "id": null
        },
        {
          "type": "input",
          "label": "chatInput",
          "id": "chatInput"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/music-war/index.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 0,
      "controls": []
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/hotelops/hotelops-strategist.html",
    "vertical": "hotel",
    "priority": "P1",
    "workflow": {
      "problem": "maintenance response",
      "problems": [
        "maintenance response",
        "guest-service coordination",
        "revenue leakage",
        "vendor coordination"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Hotel Operations Report",
        "Maintenance Exception Report",
        "Guest-Service Report",
        "Executive Hotel Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 1,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/approval/approval-executive-portal.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/integration-hub/integration-hub-executive-portal.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/mortgage/mortgage-strategist.html",
    "vertical": "mortgage",
    "priority": "P1",
    "workflow": {
      "problem": "pipeline bottlenecks",
      "problems": [
        "pipeline bottlenecks",
        "documentation exceptions",
        "underwriting risk",
        "closing delays"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Loan Pipeline Risk Report",
        "Underwriting Exception Report",
        "Closing Readiness Report",
        "Executive Mortgage Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 1,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/logistics/logistics-executive-portal.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/logistics/logistics-strategist-v2.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 1,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/supplier-vendor/supplier-vendor-executive-portal.html",
    "vertical": "bpo",
    "priority": "P1",
    "workflow": {
      "problem": "processing backlog",
      "problems": [
        "processing backlog",
        "SLA misses",
        "quality variance",
        "manual processing"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "SLA Performance Report",
        "Processing Exception Report",
        "Quality/Throughput Report",
        "Client Executive Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/supplier-vendor/supplier-vendor-strategist-v2.html",
    "vertical": "bpo",
    "priority": "P1",
    "workflow": {
      "problem": "processing backlog",
      "problems": [
        "processing backlog",
        "SLA misses",
        "quality variance",
        "manual processing"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "SLA Performance Report",
        "Processing Exception Report",
        "Quality/Throughput Report",
        "Client Executive Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 1,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/approval/approval-strategist.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/catalog/catalog-executive-portal.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/catalog/catalog-strategist.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/cpq/cpq-executive-portal.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/cpq/cpq-strategist.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/crm/crm-executive-portal.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/crm/crm-strategist.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/digital-twin/digital-twin-executive-portal.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/digital-twin/digital-twin-strategist.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/integration-hub/integration-hub-strategist.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/mdm/mdm-executive-portal.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/o2c/o2c-executive-portal.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/o2c/o2c-strategist.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        },
        {
          "type": "button",
          "label": "&#10003; ACKNOWLEDGE",
          "id": null
        },
        {
          "type": "button",
          "label": "&#8593; ESCALATE",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/war-rooms/schools-command/schools-strategist.html",
    "vertical": "schools",
    "priority": "P1",
    "workflow": {
      "problem": "grant compliance",
      "problems": [
        "grant compliance",
        "documentation gaps",
        "administrative backlog",
        "operational exceptions"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Compliance Exception Report",
        "Grant/Documentation Risk Report",
        "Operational Exception Report",
        "Executive Schools Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 1,
      "controls": [
        {
          "type": "button",
          "label": "&darr; Export",
          "id": "printBtn"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/tsm-workforce-intelligence-command-center.html",
    "vertical": "healthcare",
    "priority": "P1",
    "workflow": {
      "problem": "denial leakage",
      "problems": [
        "denial leakage",
        "revenue-cycle backlog",
        "documentation gaps",
        "operational exceptions"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Denial Recovery Report",
        "Revenue Leakage Report",
        "Appeal Priority Queue",
        "Executive Revenue-Cycle Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 3,
      "controls": [
        {
          "type": "button",
          "label": "RANDSTAD PILOT ACTIVE",
          "id": "pilot-mode-btn"
        },
        {
          "type": "button",
          "label": "Request Pilot Discussion",
          "id": null
        },
        {
          "type": "button",
          "label": "${section.id}. ${section.name} \u25bc",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/honeywell-howto.html",
    "vertical": "real_estate",
    "priority": "P1",
    "workflow": {
      "problem": "property operational leakage",
      "problems": [
        "property operational leakage",
        "maintenance backlog",
        "vendor performance",
        "turnover delays"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Property Operations Report",
        "Maintenance Exception Report",
        "Vendor Performance Report",
        "Portfolio Executive Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 0,
      "controls": []
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/tsm-insurance/insurance-ce-command.html",
    "vertical": "real_estate",
    "priority": "P1",
    "workflow": {
      "problem": "property operational leakage",
      "problems": [
        "property operational leakage",
        "maintenance backlog",
        "vendor performance",
        "turnover delays"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "Strategist Review",
            "id": null
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Property Operations Report",
        "Maintenance Exception Report",
        "Vendor Performance Report",
        "Portfolio Executive Brief"
      ],
      "report_controls": [
        {
          "type": "button",
          "label": "Generate Question",
          "id": null
        }
      ],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 8,
      "controls": [
        {
          "type": "button",
          "label": "P&C",
          "id": null
        },
        {
          "type": "button",
          "label": "Life & Health",
          "id": null
        },
        {
          "type": "button",
          "label": "AHIP",
          "id": null
        },
        {
          "type": "button",
          "label": "Arizona",
          "id": null
        },
        {
          "type": "button",
          "label": "Nationwide",
          "id": null
        },
        {
          "type": "button",
          "label": "Generate Question",
          "id": null
        },
        {
          "type": "button",
          "label": "Practice Exam",
          "id": null
        },
        {
          "type": "button",
          "label": "Strategist Review",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": true,
      "decide": false,
      "execute": false,
      "report": true
    }
  },
  {
    "path": "html/enterprise/enterprise-executive-portal.html",
    "vertical": "mortgage",
    "priority": "P1",
    "workflow": {
      "problem": "pipeline bottlenecks",
      "problems": [
        "pipeline bottlenecks",
        "documentation exceptions",
        "underwriting risk",
        "closing delays"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "&#8635; Re-run",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Loan Pipeline Risk Report",
        "Underwriting Exception Report",
        "Closing Readiness Report",
        "Executive Mortgage Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 2,
      "controls": [
        {
          "type": "button",
          "label": "&#8635; Re-run",
          "id": null
        },
        {
          "type": "button",
          "label": "${v.label} &mdash; ${v.doc}",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/music-war/analytics.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u21bb Refresh analysis",
            "id": "zay-refresh-btn"
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 1,
      "controls": [
        {
          "type": "button",
          "label": "\u21bb Refresh analysis",
          "id": "zay-refresh-btn"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/music-war/academy/music-business.html",
    "vertical": "legal",
    "priority": "P1",
    "workflow": {
      "problem": "matter backlog",
      "problems": [
        "matter backlog",
        "deadline risk",
        "document review burden",
        "compliance exposure"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Matter Risk Report",
        "Deadline/Exception Report",
        "Document Intelligence Brief",
        "Executive Legal Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 2,
      "controls": [
        {
          "type": "button",
          "label": "Ask",
          "id": null
        },
        {
          "type": "input",
          "label": "chatInput",
          "id": "chatInput"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/music-war/producer/mixing-coach.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 1,
      "controls": [
        {
          "type": "button",
          "label": "Diagnose Mix \u2192",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/music-war/cadence-builder.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": [
          {
            "type": "button",
            "label": "\u26a1 Analyze Flow",
            "id": null
          }
        ]
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 7,
      "controls": [
        {
          "type": "button",
          "label": "+ 4 Bars",
          "id": null
        },
        {
          "type": "button",
          "label": "+ 8 Bars",
          "id": null
        },
        {
          "type": "button",
          "label": "Clear All",
          "id": null
        },
        {
          "type": "button",
          "label": "\u26a1 Analyze Flow",
          "id": null
        },
        {
          "type": "button",
          "label": "Load from Song Builder",
          "id": null
        },
        {
          "type": "button",
          "label": "Copy Bars",
          "id": null
        },
        {
          "type": "input",
          "label": "bpmInput",
          "id": "bpmInput"
        }
      ]
    },
    "mappingQuality": {
      "analyze": true,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/music-war/producer/producer-ai.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": [
          {
            "type": "button",
            "label": "\u2192 Find Beats",
            "id": null
          }
        ]
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 4,
      "controls": [
        {
          "type": "button",
          "label": "Build It \u2192",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Find Beats",
          "id": null
        },
        {
          "type": "button",
          "label": "\u2192 Build Song Structure",
          "id": null
        },
        {
          "type": "button",
          "label": "Start Over",
          "id": null
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": true,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/music-war/producer/recording-coach.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 2,
      "controls": [
        {
          "type": "button",
          "label": "Ask",
          "id": null
        },
        {
          "type": "input",
          "label": "chatInput",
          "id": "chatInput"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/music-war/academy/music-theory.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 2,
      "controls": [
        {
          "type": "button",
          "label": "Ask",
          "id": null
        },
        {
          "type": "input",
          "label": "chatInput",
          "id": "chatInput"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/music-war/producer-intel-panel.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 0,
      "controls": []
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/music-war/producer/mastering-coach.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 4,
      "controls": [
        {
          "type": "button",
          "label": "Check Readiness \u2192",
          "id": null
        },
        {
          "type": "input",
          "label": "lufsInput",
          "id": "lufsInput"
        },
        {
          "type": "input",
          "label": "peakInput",
          "id": "peakInput"
        },
        {
          "type": "input",
          "label": "notesInput",
          "id": "notesInput"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/war-rooms/music-war/playback-banger.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 1,
      "controls": [
        {
          "type": "button",
          "label": "START REPLAY",
          "id": "btn"
        }
      ]
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/executive-portal-v2.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 0,
      "controls": []
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/pc-command/public/index.html",
    "vertical": "general",
    "priority": "P1",
    "workflow": {
      "problem": "manual work",
      "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 0,
      "controls": []
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  },
  {
    "path": "html/healthcare-command.html",
    "vertical": "healthcare",
    "priority": "P1",
    "workflow": {
      "problem": "denial leakage",
      "problems": [
        "denial leakage",
        "revenue-cycle backlog",
        "documentation gaps",
        "operational exceptions"
      ],
      "start": "Start with the operational mission or problem.",
      "input": "Load the relevant documents, records, or evidence.",
      "analyze": {
        "instruction": "Run the intelligence analysis.",
        "controls": []
      },
      "review": {
        "instruction": "Review findings, severity, exposure, and exceptions.",
        "controls": []
      },
      "decide": {
        "instruction": "Prioritize the action that matters most.",
        "controls": []
      },
      "execute": {
        "instruction": "Assign or execute the corrective work.",
        "controls": []
      },
      "reports": [
        "Denial Recovery Report",
        "Revenue Leakage Report",
        "Appeal Priority Queue",
        "Executive Revenue-Cycle Brief"
      ],
      "report_controls": [],
      "measure": "Compare the resulting metrics against the original problem.",
      "repeat": "Repeat the workflow as new work arrives."
    },
    "controlInventory": {
      "count": 0,
      "controls": []
    },
    "mappingQuality": {
      "analyze": false,
      "review": false,
      "decide": false,
      "execute": false,
      "report": false
    }
  }
];

function getPageWorkflow(path) {
  return PAGE_WORKFLOW_REGISTRY.find(
    entry => entry.path === path
  ) || null;
}

module.exports = {
  PAGE_WORKFLOW_REGISTRY,
  getPageWorkflow,
};
