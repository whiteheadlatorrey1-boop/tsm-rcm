(function(){
  if (window.__TSM_SECTOR_INTELLIGENCE__) return;
  window.__TSM_SECTOR_INTELLIGENCE__ = true;

  const APP_REGISTRY = {
    healthcare: {
      "HC Financial": {
        id: "hc-financial",
        label: "HC Financial",
        url: "/html/healthcare/hc-financial/index.html",
        type: "recovery"
      },
      "HC Billing": {
        id: "hc-billing",
        label: "HC Billing",
        url: "/html/healthcare/hc-billing/index.html",
        type: "recovery"
      },
      "HC Compliance": {
        id: "hc-compliance",
        label: "HC Compliance",
        url: "/html/healthcare/hc-compliance/index.html",
        type: "compliance"
      },
      "Eligibility Verification": {
        id: "hc-eligibility",
        label: "Eligibility Verification",
        url: "/html/healthcare/hc-financial/index.html?mode=eligibility",
        type: "verification"
      },
      "Patient Recovery": {
        id: "hc-patient-recovery",
        label: "Patient Recovery",
        url: "/html/healthcare/hc-billing/index.html?mode=patient-recovery",
        type: "recovery"
      },
      "Appeals Workbench": {
        id: "hc-appeals",
        label: "Appeals Workbench",
        url: "/html/healthcare/hc-financial/index.html?mode=appeals",
        type: "appeals"
      },
      "HC Strategist": {
        id: "hc-strategist",
        label: "HC Strategist",
        url: "/html/healthcare/strategist/index.html",
        type: "strategist"
      }
    },

    insurance: {
      "Claims Review": {
        id: "ins-claims-review",
        label: "Claims Review",
        url: "/html/tsm-insurance/insurance-war-room.html?mode=claims-review",
        type: "claims"
      },
      "Coverage Verification": {
        id: "ins-coverage-verification",
        label: "Coverage Verification",
        url: "/html/tsm-insurance/insurance-war-room.html?mode=coverage",
        type: "verification"
      },
      "Insurance Strategist": {
        id: "ins-strategist",
        label: "Insurance Strategist",
        url: "/html/tsm-insurance/insurance-war-room.html?mode=strategist",
        type: "strategist"
      }
    },

    finops: {
      "AP Review": {
        id: "finops-ap-review",
        label: "AP Review",
        url: "/html/finops-suite/finops-war-room.html?mode=ap",
        type: "ap"
      },
      "AR Recovery": {
        id: "finops-ar-recovery",
        label: "AR Recovery",
        url: "/html/finops-suite/finops-war-room.html?mode=ar",
        type: "ar"
      },
      "FinOps Strategist": {
        id: "finops-strategist",
        label: "FinOps Strategist",
        url: "/html/finops-suite/finops-war-room.html?mode=strategist",
        type: "strategist"
      },
      "Close Readiness": {
        id: "finops-close",
        label: "Close Readiness",
        url: "/html/finops-suite/finops-war-room.html?mode=close",
        type: "close"
      }
    },

    reo: {
      "Title Review": {
        id: "reo-title-review",
        label: "Title Review",
        url: "/html/reo-pro/re-war-room.html?mode=title",
        type: "title"
      },
      "Occupancy Verification": {
        id: "reo-occupancy",
        label: "Occupancy Verification",
        url: "/html/reo-pro/re-war-room.html?mode=occupancy",
        type: "occupancy"
      },
      "Valuation Review": {
        id: "reo-valuation",
        label: "Valuation Review",
        url: "/html/reo-pro/re-war-room.html?mode=valuation",
        type: "valuation"
      },
      "REO Strategist": {
        id: "reo-strategist",
        label: "REO Strategist",
        url: "/html/reo-pro/re-war-room.html?mode=strategist",
        type: "strategist"
      }
    },

    bpo: {
      "BPO Operations": {
        id: "bpo-ops",
        label: "BPO Operations",
        url: "/html/bpo/bpo-situation-room.html?mode=operations",
        type: "operations"
      },
      "Staffing Queue Manager": {
        id: "bpo-staffing",
        label: "Staffing Queue Manager",
        url: "/html/bpo/bpo-situation-room.html?mode=staffing",
        type: "staffing"
      },
      "BPO Strategist": {
        id: "bpo-strategist",
        label: "BPO Strategist",
        url: "/html/bpo/bpo-situation-room.html?mode=strategist",
        type: "strategist"
      }
    },

    legal: {
      "Legal Review": {
        id: "legal-review",
        label: "Legal Review",
        url: "/html/legal-pro/legal-war-room.html?mode=review",
        type: "review"
      },
      "Contract Intake": {
        id: "legal-contract-intake",
        label: "Contract Intake",
        url: "/html/legal-pro/legal-war-room.html?mode=contracts",
        type: "contracts"
      },
      "Legal Strategist": {
        id: "legal-strategist",
        label: "Legal Strategist",
        url: "/html/legal-pro/legal-war-room.html?mode=strategist",
        type: "strategist"
      }
    },

    tax: {
      "Tax Evidence Review": {
        id: "tax-evidence-review",
        label: "Tax Evidence Review",
        url: "/html/tax/tax-war-room.html?mode=evidence",
        type: "evidence"
      },
      "Tax Filing Recovery": {
        id: "tax-filing-recovery",
        label: "Tax Filing Recovery",
        url: "/html/tax/tax-war-room.html?mode=recovery",
        type: "recovery"
      },
      "Tax Strategist": {
        id: "tax-strategist",
        label: "Tax Strategist",
        url: "/html/tax/tax-war-room.html?mode=strategist",
        type: "strategist"
      }
    },

    construction: {
      "Permit Review": {
        id: "construction-permit-review",
        label: "Permit Review",
        url: "/html/construction/construction-war-room.html?mode=permit",
        type: "permit"
      },
      "Project Recovery": {
        id: "construction-project-recovery",
        label: "Project Recovery",
        url: "/html/construction/construction-war-room.html?mode=recovery",
        type: "recovery"
      },
      "Construction Strategist": {
        id: "construction-strategist",
        label: "Construction Strategist",
        url: "/html/construction/construction-war-room.html?mode=strategist",
        type: "strategist"
      }
    }
  };

  const INTELLIGENCE = {
    healthcare: {
      __meta: {
        label: "Healthcare",
        warRoom: "/html/healthcare/hc-denial-war-room.html",
        defaultOwner: "Revenue Integrity",
        executiveAudience: ["strategist", "rcm", "cfo"],
        continuityNarrative:
          "Denial pressure, payer delays, and missing patient/authorization data can materially impact reimbursement timing and clean-claim performance."
      },

      MISSING_AUTHORIZATION: {
        label: "Missing Authorization",
        owner: "Revenue Integrity",
        pressure: "HIGH",
        severity: 92,
        baseExposure: 12000,
        exposureModel: "claim_reimbursement_risk",
        documentTypes: ["claim", "ub04", "cms1500", "payer_notice"],
        requiredFields: ["authorizationNumber", "payerPlan", "serviceDate"],
        recoveryFields: ["authorizationNumber", "authorizationStart", "authorizationEnd", "payerPlan", "serviceDate"],
        fieldAliases: {
          authorizationNumber: ["auth_number", "prior_auth", "authorization_id"],
          payerPlan: ["payer", "plan_name", "coverage_plan"],
          serviceDate: ["dos", "date_of_service"]
        },
        recommendedApps: ["HC Financial", "Eligibility Verification", "Appeals Workbench", "HC Strategist"],
        recommendedActions: [
          "Verify authorization number against payer record",
          "Validate payer plan and date of service",
          "Generate appeal package if authorization is expired or absent"
        ],
        bestAction: "Escalate payer lane and validate authorization before claim submission or appeal.",
        relayTargets: ["strategist", "rcm", "cfo"],
        executiveSummary:
          "Authorization gap is putting reimbursement at risk and should be resolved before submission or appealed immediately if already denied."
      },

      MISSING_PATIENT_DOB: {
        label: "Missing Patient DOB",
        owner: "Patient Access",
        pressure: "HIGH",
        severity: 88,
        baseExposure: 6500,
        exposureModel: "clean_claim_risk",
        documentTypes: ["claim", "facesheet", "registration"],
        requiredFields: ["patientDOB"],
        recoveryFields: ["patientDOB", "patientFirstName", "patientLastName"],
        fieldAliases: {
          patientDOB: ["dob", "date_of_birth", "birth_date"]
        },
        recommendedApps: ["Patient Recovery", "HC Billing", "HC Strategist"],
        recommendedActions: [
          "Locate DOB from prior patient records or registration source",
          "Validate demographic match before updating claim payload",
          "Re-run claim readiness after demographic completion"
        ],
        bestAction: "Recover patient DOB from prior records and update the claim before submission.",
        relayTargets: ["strategist"],
        executiveSummary:
          "Missing patient demographic data is preventing clean-claim readiness and should be corrected before billing progression."
      },

      MISSING_POLICY_ID: {
        label: "Missing Policy ID",
        owner: "Eligibility Team",
        pressure: "HIGH",
        severity: 90,
        baseExposure: 9800,
        exposureModel: "coverage_validation_risk",
        documentTypes: ["claim", "eligibility_response", "insurance_card"],
        requiredFields: ["policyId", "payerPlan"],
        recoveryFields: ["policyId", "groupNumber", "memberId", "payerPlan"],
        fieldAliases: {
          policyId: ["policy_number", "member_id", "subscriber_id"]
        },
        recommendedApps: ["Eligibility Verification", "HC Financial", "HC Strategist"],
        recommendedActions: [
          "Validate policy ID and member eligibility",
          "Confirm payer plan and group number",
          "Update claim with verified coverage identifiers"
        ],
        bestAction: "Verify coverage identifiers and update the claim before submission.",
        relayTargets: ["strategist", "rcm"],
        executiveSummary:
          "Coverage identifiers are incomplete, increasing denial probability and delaying reimbursement."
      },

      DENIED_CLAIM_NO_AUTH: {
        label: "Denied Claim - No Authorization",
        owner: "Denials Team",
        pressure: "CRITICAL",
        severity: 96,
        baseExposure: 24000,
        exposureModel: "denial_recovery_risk",
        documentTypes: ["denial_letter", "payer_notice", "appeal_packet"],
        requiredFields: ["authorizationNumber", "denialReasonCode", "appealDueDate"],
        recoveryFields: ["authorizationNumber", "denialReasonCode", "appealDueDate", "payerPlan"],
        recommendedApps: ["Appeals Workbench", "HC Financial", "HC Strategist"],
        recommendedActions: [
          "Draft appeal package with supporting authorization evidence",
          "Validate denial reason and filing deadline",
          "Escalate high-dollar denial to strategist / RCM lane"
        ],
        bestAction: "Open Appeals Workbench and generate the appeal package immediately.",
        relayTargets: ["strategist", "rcm", "cfo"],
        executiveSummary:
          "A denied claim tied to missing authorization requires immediate appeal handling to protect recoverable revenue."
      }
    },

    insurance: {
      __meta: {
        label: "Insurance",
        warRoom: "/html/tsm-insurance/insurance-war-room.html",
        defaultOwner: "Claims Ops",
        executiveAudience: ["strategist", "claims-director", "finance"],
        continuityNarrative:
          "Claims throughput, policy validation, and outage-driven backlog pressure can quickly escalate exposure across claims and reimbursement operations."
      },

      MISSING_POLICY_DATA: {
        label: "Missing Policy Data",
        owner: "Claims Ops",
        pressure: "HIGH",
        severity: 89,
        baseExposure: 11000,
        exposureModel: "coverage_risk",
        documentTypes: ["claim", "policy_extract", "insurance_card"],
        requiredFields: ["policyNumber", "coverageStart", "coverageEnd"],
        recoveryFields: ["policyNumber", "coverageStart", "coverageEnd", "memberName"],
        fieldAliases: {
          policyNumber: ["policy_id", "member_policy", "policy_no"]
        },
        recommendedApps: ["Claims Review", "Coverage Verification", "Insurance Strategist"],
        recommendedActions: [
          "Validate policy record against source coverage data",
          "Confirm coverage start and end dates",
          "Update claim or intake record with verified policy data"
        ],
        bestAction: "Validate policy coverage and repair the claim intake record before adjudication.",
        relayTargets: ["strategist", "claims-director"],
        executiveSummary:
          "Missing policy data is slowing claims throughput and increasing avoidable rework."
      },

      COVERAGE_GAP_DETECTED: {
        label: "Coverage Gap Detected",
        owner: "Coverage Verification",
        pressure: "HIGH",
        severity: 91,
        baseExposure: 18000,
        exposureModel: "claim_denial_risk",
        documentTypes: ["claim", "coverage_notice", "eligibility_result"],
        requiredFields: ["coverageStart", "coverageEnd", "serviceDate"],
        recoveryFields: ["coverageStart", "coverageEnd", "serviceDate", "policyNumber"],
        recommendedApps: ["Coverage Verification", "Claims Review", "Insurance Strategist"],
        recommendedActions: [
          "Verify whether service date falls outside active coverage",
          "Check for COB or policy transition issue",
          "Escalate if coverage gap creates denial risk"
        ],
        bestAction: "Resolve the coverage gap before the claim advances further.",
        relayTargets: ["strategist", "claims-director", "finance"],
        executiveSummary:
          "Coverage timing misalignment is creating claim denial exposure and should be resolved before downstream processing."
      },

      CLAIMS_BACKLOG_SPIKE: {
        label: "Claims Backlog Spike",
        owner: "Claims Ops",
        pressure: "CRITICAL",
        severity: 94,
        baseExposure: 145000,
        exposureModel: "backlog_exposure",
        documentTypes: ["ops_dashboard", "claims_extract"],
        requiredFields: ["queueName", "backlogCount", "slaDate"],
        recoveryFields: ["queueName", "backlogCount", "slaDate", "agingBucket"],
        recommendedApps: ["Claims Review", "Insurance Strategist"],
        recommendedActions: [
          "Prioritize high-dollar claims within the backlog",
          "Route queue escalation to strategist",
          "Assess outage, staffing, or intake disruption as root cause"
        ],
        bestAction: "Escalate the backlog and rebalance queue ownership immediately.",
        relayTargets: ["strategist", "claims-director", "executive"],
        executiveSummary:
          "Claims backlog growth is creating SLA and revenue exposure and requires queue-level intervention."
      },

      CYBER_CLAIMS_OUTAGE: {
        label: "Cyber / Claims Outage",
        owner: "Claims Continuity",
        pressure: "CRITICAL",
        severity: 98,
        baseExposure: 1300000,
        exposureModel: "continuity_revenue_risk",
        documentTypes: ["incident_report", "claims_dashboard", "executive_alert"],
        requiredFields: ["outageWindowHours", "affectedQueue", "revenueAtRisk"],
        recoveryFields: ["outageWindowHours", "affectedQueue", "revenueAtRisk", "restorationETA"],
        recommendedApps: ["Claims Review", "Insurance Strategist"],
        recommendedActions: [
          "Switch impacted queues to continuity workflow",
          "Notify claims leadership and finance immediately",
          "Prioritize restoration lane and revenue-critical claims"
        ],
        bestAction: "Activate continuity workflow and escalate to strategist + finance immediately.",
        relayTargets: ["strategist", "claims-director", "finance", "executive"],
        executiveSummary:
          "System disruption is halting claims operations and requires immediate continuity and executive response."
      }
    },

    finops: {
      __meta: {
        label: "FinOps",
        warRoom: "/html/finops-suite/finops-war-room.html",
        defaultOwner: "Finance Controller",
        executiveAudience: ["strategist", "controller", "cfo"],
        continuityNarrative:
          "Invoice exceptions, AP/AR delays, and close-readiness issues directly affect cash visibility, working capital, and executive forecasting confidence."
      },

      INVOICE_EXCEPTION: {
        label: "Invoice Exception",
        owner: "Accounts Payable",
        pressure: "MEDIUM",
        severity: 82,
        baseExposure: 9000,
        exposureModel: "ap_exception_risk",
        documentTypes: ["invoice", "po", "vendor_statement"],
        requiredFields: ["vendorId", "poNumber", "invoiceDate"],
        recoveryFields: ["vendorId", "poNumber", "invoiceDate", "invoiceAmount"],
        recommendedApps: ["AP Review", "FinOps Strategist"],
        recommendedActions: [
          "Validate vendor ID and PO match",
          "Resolve invoice-date or amount mismatch",
          "Route unresolved exceptions to strategist lane"
        ],
        bestAction: "Open AP Review and resolve the invoice / PO mismatch before approval.",
        relayTargets: ["strategist", "finance-lead"],
        executiveSummary:
          "Invoice exception is blocking payment accuracy and can distort AP visibility if unresolved."
      },

      MISSING_PO: {
        label: "Missing Purchase Order",
        owner: "Procurement Finance",
        pressure: "HIGH",
        severity: 87,
        baseExposure: 16000,
        exposureModel: "payment_hold_risk",
        documentTypes: ["invoice", "vendor_bill", "po_exception"],
        requiredFields: ["poNumber", "vendorId"],
        recoveryFields: ["poNumber", "vendorId", "invoiceDate", "invoiceAmount"],
        recommendedApps: ["AP Review", "FinOps Strategist"],
        recommendedActions: [
          "Locate or validate PO record",
          "Match vendor invoice to approved procurement lane",
          "Escalate if spend is at risk of aging out of SLA"
        ],
        bestAction: "Locate the PO and validate procurement approval before payment release.",
        relayTargets: ["strategist", "controller"],
        executiveSummary:
          "Missing PO data is blocking payment flow and increasing reconciliation effort."
      },

      CASH_FLOW_RISK: {
        label: "Cash Flow Risk",
        owner: "Finance Controller",
        pressure: "CRITICAL",
        severity: 95,
        baseExposure: 480000,
        exposureModel: "cash_flow_visibility_risk",
        documentTypes: ["cash_report", "ar_aging", "forecast"],
        requiredFields: ["forecastPeriod", "varianceAmount", "riskDriver"],
        recoveryFields: ["forecastPeriod", "varianceAmount", "riskDriver", "owner"],
        recommendedApps: ["AR Recovery", "FinOps Strategist", "Close Readiness"],
        recommendedActions: [
          "Identify the primary AR/AP driver behind the variance",
          "Escalate large exposure to controller / CFO lane",
          "Generate recovery actions for delayed collections or blocked payments"
        ],
        bestAction: "Escalate the cash-flow variance and open AR recovery / close readiness actions.",
        relayTargets: ["strategist", "controller", "cfo"],
        executiveSummary:
          "Cash-flow pressure is materially affecting executive financial visibility and requires immediate intervention."
      },

      CLOSE_READINESS_BLOCKER: {
        label: "Close Readiness Blocker",
        owner: "Accounting Close Team",
        pressure: "HIGH",
        severity: 90,
        baseExposure: 210000,
        exposureModel: "close_delay_risk",
        documentTypes: ["close_checklist", "recon_report", "finance_dashboard"],
        requiredFields: ["closeTask", "dueDate", "owner"],
        recoveryFields: ["closeTask", "dueDate", "owner", "dependency"],
        recommendedApps: ["Close Readiness", "FinOps Strategist"],
        recommendedActions: [
          "Identify blocker preventing close completion",
          "Assign owner and due date immediately",
          "Escalate blocker if financial reporting timeline is at risk"
        ],
        bestAction: "Resolve the close blocker and escalate timeline risk to finance leadership.",
        relayTargets: ["strategist", "controller", "cfo"],
        executiveSummary:
          "Close-readiness blocker is threatening reporting timelines and should be escalated immediately."
      }
    },

    reo: {
      __meta: {
        label: "REO",
        warRoom: "/html/reo-pro/re-war-room.html",
        defaultOwner: "Asset Operations",
        executiveAudience: ["strategist", "asset-manager", "finance"],
        continuityNarrative:
          "Title, occupancy, and valuation issues directly affect asset disposition timing, revenue recovery, and downstream operational risk."
      },

      TITLE_EXCEPTION: {
        label: "Title Exception",
        owner: "Title Ops",
        pressure: "HIGH",
        severity: 90,
        baseExposure: 22000,
        exposureModel: "asset_disposition_risk",
        documentTypes: ["title_report", "closing_packet", "asset_file"],
        requiredFields: ["parcelId", "titleStatus"],
        recoveryFields: ["parcelId", "titleStatus", "exceptionType", "lienStatus"],
        recommendedApps: ["Title Review", "REO Strategist"],
        recommendedActions: [
          "Review title exception and lien status",
          "Escalate unresolved encumbrances delaying disposition",
          "Route material title risk to strategist lane"
        ],
        bestAction: "Open Title Review and resolve the title exception before disposition proceeds.",
        relayTargets: ["strategist", "asset-manager"],
        executiveSummary:
          "Title exception is delaying asset movement and increasing operational risk."
      },

      OCCUPANCY_MISMATCH: {
        label: "Occupancy Mismatch",
        owner: "Field Operations",
        pressure: "HIGH",
        severity: 86,
        baseExposure: 17000,
        exposureModel: "occupancy_resolution_risk",
        documentTypes: ["inspection", "occupancy_report", "field_note"],
        requiredFields: ["occupancyStatus", "inspectionDate"],
        recoveryFields: ["occupancyStatus", "inspectionDate", "propertyAddress"],
        recommendedApps: ["Occupancy Verification", "REO Strategist"],
        recommendedActions: [
          "Validate occupancy status with latest inspection evidence",
          "Resolve mismatch before downstream asset action",
          "Escalate if occupancy risk affects disposition timeline"
        ],
        bestAction: "Verify occupancy status and reconcile the asset record.",
        relayTargets: ["strategist", "asset-manager"],
        executiveSummary:
          "Occupancy inconsistency is creating asset handling and timeline risk."
      },

      VALUATION_GAP: {
        label: "Valuation Gap",
        owner: "Valuation Ops",
        pressure: "MEDIUM",
        severity: 84,
        baseExposure: 46000,
        exposureModel: "asset_value_risk",
        documentTypes: ["valuation_report", "bpo", "appraisal"],
        requiredFields: ["valuationAmount", "valuationDate"],
        recoveryFields: ["valuationAmount", "valuationDate", "propertyAddress", "comparableSet"],
        recommendedApps: ["Valuation Review", "REO Strategist"],
        recommendedActions: [
          "Review valuation discrepancy against latest appraisal or BPO",
          "Confirm whether valuation drift changes asset strategy",
          "Escalate if gap materially affects recovery or disposition timing"
        ],
        bestAction: "Open Valuation Review and reconcile the valuation discrepancy.",
        relayTargets: ["strategist", "asset-manager", "finance"],
        executiveSummary:
          "Valuation drift may affect asset recovery assumptions and should be reviewed."
      }
    },

    bpo: {
      __meta: {
        label: "BPO",
        warRoom: "/html/bpo/bpo-situation-room.html",
        defaultOwner: "Operations Lead",
        executiveAudience: ["strategist", "ops-director", "executive"],
        continuityNarrative:
          "Backlog pressure, SLA breaches, throughput constraints, and cross-client operational disruptions can quickly create revenue and service risk."
      },

      SLA_BREACH_RISK: {
        label: "SLA Breach Risk",
        owner: "Operations Lead",
        pressure: "HIGH",
        severity: 90,
        baseExposure: 85000,
        exposureModel: "sla_exposure",
        documentTypes: ["ops_dashboard", "client_queue", "sla_report"],
        requiredFields: ["clientName", "backlogCount", "slaDueDate"],
        recoveryFields: ["clientName", "backlogCount", "slaDueDate", "owner"],
        recommendedApps: ["BPO Operations", "BPO Strategist"],
        recommendedActions: [
          "Rebalance queue ownership and prioritize expiring work",
          "Escalate high-risk backlog to strategist",
          "Identify whether staffing or intake bottlenecks are driving SLA pressure"
        ],
        bestAction: "Rebalance the queue immediately and escalate the backlog risk.",
        relayTargets: ["strategist", "ops-director", "executive"],
        executiveSummary:
          "SLA pressure is creating service and revenue risk that requires immediate operational intervention."
      },

      CLIENT_BACKLOG_SPIKE: {
        label: "Client Backlog Spike",
        owner: "Client Operations",
        pressure: "CRITICAL",
        severity: 94,
        baseExposure: 210000,
        exposureModel: "client_backlog_exposure",
        documentTypes: ["client_queue", "ops_report"],
        requiredFields: ["clientName", "backlogCount", "agingBucket"],
        recoveryFields: ["clientName", "backlogCount", "agingBucket", "owner"],
        recommendedApps: ["BPO Operations", "Staffing Queue Manager", "BPO Strategist"],
        recommendedActions: [
          "Prioritize high-value client backlog items",
          "Assess staffing imbalance or intake disruption",
          "Escalate backlog growth to strategist / executive lane"
        ],
        bestAction: "Escalate the client backlog and open staffing / queue recovery actions.",
        relayTargets: ["strategist", "ops-director", "executive"],
        executiveSummary:
          "Backlog growth is threatening client SLA performance and revenue predictability."
      },

      SUPPLIER_SHUTDOWN: {
        label: "Supplier Shutdown",
        owner: "Operations Continuity",
        pressure: "CRITICAL",
        severity: 97,
        baseExposure: 2900000,
        exposureModel: "supplier_disruption_risk",
        documentTypes: ["incident_report", "vendor_alert", "ops_dashboard"],
        requiredFields: ["supplierName", "affectedFacilities", "revenueAtRisk"],
        recoveryFields: ["supplierName", "affectedFacilities", "revenueAtRisk", "alternateSupplier"],
        recommendedApps: ["BPO Operations", "BPO Strategist"],
        recommendedActions: [
          "Move work or spend to alternate supplier lane",
          "Pause noncritical orders impacted by the disruption",
          "Notify finance and operations leadership immediately"
        ],
        bestAction: "Activate supplier continuity workflow and escalate the disruption to leadership.",
        relayTargets: ["strategist", "ops-director", "executive", "finance"],
        executiveSummary:
          "Supplier disruption is threatening revenue continuity and requires immediate operational response."
      },

      PLANT_FAILURE: {
        label: "Plant Failure / Production Incident",
        owner: "Operations Continuity",
        pressure: "CRITICAL",
        severity: 98,
        baseExposure: 4700000,
        exposureModel: "downtime_revenue_risk",
        documentTypes: ["incident_report", "ops_alert", "plant_dashboard"],
        requiredFields: ["plantName", "downtimeWindow", "revenueAtRisk"],
        recoveryFields: ["plantName", "downtimeWindow", "revenueAtRisk", "alternateFacility"],
        recommendedApps: ["BPO Operations", "BPO Strategist"],
        recommendedActions: [
          "Reroute production or workflow to alternate facility",
          "Expedite supplier and maintenance recovery lanes",
          "Escalate downtime risk to operations and executive leadership"
        ],
        bestAction: "Activate downtime continuity actions and reroute operations immediately.",
        relayTargets: ["strategist", "ops-director", "executive", "finance"],
        executiveSummary:
          "Plant disruption is creating immediate downtime and revenue exposure requiring continuity action."
      }
    },

    legal: {
      __meta: {
        label: "Legal",
        warRoom: "/html/legal-pro/legal-war-room.html",
        defaultOwner: "Legal Ops",
        executiveAudience: ["strategist", "general-counsel", "executive"],
        continuityNarrative:
          "Contract backlogs, filing dependencies, and review bottlenecks can create vendor, revenue, and compliance risk across the business."
      },

      CONTRACT_BACKLOG: {
        label: "Contract Review Backlog",
        owner: "Legal Ops",
        pressure: "HIGH",
        severity: 87,
        baseExposure: 45000,
        exposureModel: "contract_delay_risk",
        documentTypes: ["contract", "intake", "review_queue"],
        requiredFields: ["contractType", "requestDate", "owner"],
        recoveryFields: ["contractType", "requestDate", "owner", "counterparty"],
        recommendedApps: ["Legal Review", "Contract Intake", "Legal Strategist"],
        recommendedActions: [
          "Prioritize contract queue by business impact",
          "Assign legal owner and due date",
          "Escalate backlog if vendor or revenue timing is at risk"
        ],
        bestAction: "Prioritize and assign the contract queue immediately.",
        relayTargets: ["strategist", "general-counsel", "executive"],
        executiveSummary:
          "Contract backlog is creating operational delay and should be escalated when it affects revenue or vendor timing."
      },

      MISSING_SIGNATURE: {
        label: "Missing Signature",
        owner: "Legal Intake",
        pressure: "MEDIUM",
        severity: 78,
        baseExposure: 12000,
        exposureModel: "execution_delay_risk",
        documentTypes: ["contract", "agreement"],
        requiredFields: ["signatoryName", "signatureDate"],
        recoveryFields: ["signatoryName", "signatureDate", "counterparty"],
        recommendedApps: ["Contract Intake", "Legal Review"],
        recommendedActions: [
          "Validate signatory completeness",
          "Route agreement for execution follow-up",
          "Hold downstream action until execution is complete"
        ],
        bestAction: "Complete the missing signature workflow before proceeding.",
        relayTargets: ["strategist"],
        executiveSummary:
          "Incomplete execution is blocking legal completion and downstream business action."
      }
    },

    tax: {
      __meta: {
        label: "Tax",
        warRoom: "/html/tax/tax-war-room.html",
        defaultOwner: "Tax Operations",
        executiveAudience: ["strategist", "tax-lead", "finance"],
        continuityNarrative:
          "Missing tax evidence, filing blockers, and reconciliation issues can delay filings and increase compliance exposure."
      },

      MISSING_TAX_EVIDENCE: {
        label: "Missing Tax Evidence",
        owner: "Tax Operations",
        pressure: "HIGH",
        severity: 85,
        baseExposure: 22000,
        exposureModel: "filing_support_risk",
        documentTypes: ["tax_packet", "workpaper", "supporting_doc"],
        requiredFields: ["taxYear", "evidenceType", "owner"],
        recoveryFields: ["taxYear", "evidenceType", "owner", "jurisdiction"],
        recommendedApps: ["Tax Evidence Review", "Tax Strategist"],
        recommendedActions: [
          "Locate missing supporting evidence",
          "Validate evidence sufficiency before filing",
          "Escalate if missing evidence delays filing readiness"
        ],
        bestAction: "Recover missing tax support and re-check filing readiness.",
        relayTargets: ["strategist", "tax-lead"],
        executiveSummary:
          "Missing support is slowing filing readiness and increasing compliance risk."
      },

      FILING_READINESS_BLOCKER: {
        label: "Filing Readiness Blocker",
        owner: "Tax Filing Lead",
        pressure: "HIGH",
        severity: 88,
        baseExposure: 39000,
        exposureModel: "filing_delay_risk",
        documentTypes: ["filing_checklist", "tax_workflow"],
        requiredFields: ["returnType", "dueDate", "blocker"],
        recoveryFields: ["returnType", "dueDate", "blocker", "owner"],
        recommendedApps: ["Tax Filing Recovery", "Tax Strategist"],
        recommendedActions: [
          "Resolve the filing blocker and assign an owner",
          "Escalate if statutory due date is threatened",
          "Track readiness until the blocker is closed"
        ],
        bestAction: "Resolve the blocker and escalate if due date exposure exists.",
        relayTargets: ["strategist", "tax-lead", "finance"],
        executiveSummary:
          "A filing blocker is threatening timely completion and should be managed as a readiness issue."
      }
    },

    construction: {
      __meta: {
        label: "Construction",
        warRoom: "/html/construction/construction-war-room.html",
        defaultOwner: "Project Engineering",
        executiveAudience: ["strategist", "project-exec", "finance"],
        continuityNarrative:
          "Permit delays, subcontractor issues, and project dependencies can create schedule slippage, billing delays, and cost exposure."
      },

      PERMIT_DELAY: {
        label: "Permit Delay",
        owner: "Project Engineering",
        pressure: "HIGH",
        severity: 89,
        baseExposure: 182000,
        exposureModel: "schedule_billing_risk",
        documentTypes: ["permit", "project_log", "municipal_notice"],
        requiredFields: ["permitType", "projectName", "dueDate"],
        recoveryFields: ["permitType", "projectName", "dueDate", "jurisdiction"],
        recommendedApps: ["Permit Review", "Construction Strategist"],
        recommendedActions: [
          "Validate permit blocker and jurisdiction dependency",
          "Escalate project schedule impact immediately",
          "Coordinate project recovery if billing timing is threatened"
        ],
        bestAction: "Escalate the permit blocker and coordinate project recovery.",
        relayTargets: ["strategist", "project-exec", "finance"],
        executiveSummary:
          "Permit delay is threatening schedule timing and downstream billing / operational readiness."
      },

      SUBCONTRACTOR_EXPOSURE: {
        label: "Subcontractor Exposure",
        owner: "Project Controls",
        pressure: "HIGH",
        severity: 86,
        baseExposure: 145000,
        exposureModel: "delivery_dependency_risk",
        documentTypes: ["project_log", "vendor_issue", "field_report"],
        requiredFields: ["subcontractorName", "projectName", "issueType"],
        recoveryFields: ["subcontractorName", "projectName", "issueType", "owner"],
        recommendedApps: ["Project Recovery", "Construction Strategist"],
        recommendedActions: [
          "Assess schedule / cost impact from subcontractor issue",
          "Route mitigation plan to project leadership",
          "Escalate if dependency threatens milestone or billing timeline"
        ],
        bestAction: "Open project recovery and escalate the subcontractor dependency risk.",
        relayTargets: ["strategist", "project-exec", "finance"],
        executiveSummary:
          "Subcontractor dependency is creating schedule and cost risk that requires project recovery action."
      }
    }
  };

  function normalizeSector(sector){
    const s = String(sector || "").toLowerCase();
    if (["hc", "healthcare"].includes(s)) return "healthcare";
    if (["insurance", "ins"].includes(s)) return "insurance";
    if (["finops", "finance", "financial"].includes(s)) return "finops";
    if (["reo", "realestate", "real_estate"].includes(s)) return "reo";
    if (["bpo"].includes(s)) return "bpo";
    if (["legal"].includes(s)) return "legal";
    if (["tax"].includes(s)) return "tax";
    if (["construction"].includes(s)) return "construction";
    return s || "healthcare";
  }

  function deepClone(obj){
    return JSON.parse(JSON.stringify(obj));
  }

  function getSectorPack(sector){
    const key = normalizeSector(sector);
    return INTELLIGENCE[key] || null;
  }

  function getRule(sector, anomalyType){
    const pack = getSectorPack(sector);
    if (!pack) return null;
    return pack[anomalyType] || null;
  }

  function getMeta(sector){
    const pack = getSectorPack(sector);
    return pack?.__meta || null;
  }

  function getApps(sector, anomalyType){
    const rule = getRule(sector, anomalyType);
    const sectorKey = normalizeSector(sector);
    if (!rule) return [];
    return (rule.recommendedApps || [])
      .map(name => APP_REGISTRY[sectorKey]?.[name])
      .filter(Boolean);
  }

  function estimateExposure(sector, anomalyType, payload = {}){
    const rule = getRule(sector, anomalyType);
    if (!rule) return 0;

    const base = Number(rule.baseExposure || 0);
    const count = Number(payload.count || 1);
    const multiplier = Number(payload.multiplier || 1);

    if (payload.revenueAtRisk) return Number(payload.revenueAtRisk);
    return Math.round(base * count * multiplier);
  }

  function bestAction(sector, anomalyType, payload = {}){
    const rule = getRule(sector, anomalyType);
    if (!rule) return "Review anomaly and determine corrective action.";
    if (payload.overrideBestAction) return payload.overrideBestAction;
    return rule.bestAction || (rule.recommendedActions?.[0] || "Review anomaly and determine corrective action.");
  }

  function buildCaseTemplate(sector, anomalyType, payload = {}){
    const sectorKey = normalizeSector(sector);
    const rule = getRule(sectorKey, anomalyType);
    const meta = getMeta(sectorKey);

    if (!rule) {
      return {
        sector: sectorKey,
        anomalyType,
        owner: meta?.defaultOwner || "TSM Operations",
        pressure: "MEDIUM",
        exposure: 0,
        requiredFields: [],
        recoveryFields: [],
        recommendedApps: [],
        recommendedActions: [],
        relayTargets: ["strategist"],
        bestAction: "Review anomaly and determine corrective action."
      };
    }

    return {
      sector: sectorKey,
      anomalyType,
      label: rule.label || anomalyType,
      owner: payload.owner || rule.owner || meta?.defaultOwner || "TSM Operations",
      pressure: payload.pressure || rule.pressure || "MEDIUM",
      severity: rule.severity || 75,
      exposure: estimateExposure(sectorKey, anomalyType, payload),
      exposureModel: rule.exposureModel || null,
      requiredFields: deepClone(rule.requiredFields || []),
      recoveryFields: deepClone(rule.recoveryFields || rule.requiredFields || []),
      fieldAliases: deepClone(rule.fieldAliases || {}),
      recommendedApps: deepClone(rule.recommendedApps || []),
      appConfigs: deepClone(getApps(sectorKey, anomalyType)),
      recommendedActions: deepClone(rule.recommendedActions || []),
      relayTargets: deepClone(rule.relayTargets || meta?.executiveAudience || ["strategist"]),
      bestAction: bestAction(sectorKey, anomalyType, payload),
      executiveSummary: rule.executiveSummary || "",
      continuityNarrative: meta?.continuityNarrative || "",
      documentTypes: deepClone(rule.documentTypes || []),
      warRoom: meta?.warRoom || "",
      metadata: {
        sectorLabel: meta?.label || sectorKey,
        generatedAt: new Date().toISOString()
      }
    };
  }

  function matchAnomalyFromFields(sector, fields = []){
    const pack = getSectorPack(sector);
    if (!pack) return null;

    const normalizedFields = fields.map(f => String(f).toLowerCase());
    let best = null;

    Object.entries(pack).forEach(([key, rule]) => {
      if (key === "__meta") return;
      const req = (rule.requiredFields || []).map(x => String(x).toLowerCase());
      const hits = req.filter(r => normalizedFields.includes(r)).length;
      if (!best || hits > best.hits) {
        best = { anomalyType: key, hits };
      }
    });

    return best?.hits ? best.anomalyType : null;
  }

  function buildSuggestedAppPayload(sector, anomalyType, casePayload = {}){
    const template = buildCaseTemplate(sector, anomalyType, casePayload);

    return {
      caseId: casePayload.caseId || `CASE-${Date.now()}`,
      sector: template.sector,
      anomalyType: template.anomalyType,
      title: casePayload.title || template.label,
      owner: template.owner,
      pressure: template.pressure,
      exposure: template.exposure,
      requiredFields: template.requiredFields,
      recoveryFields: template.recoveryFields,
      fieldAliases: template.fieldAliases,
      bestAction: template.bestAction,
      recommendedActions: template.recommendedActions,
      relayTargets: template.relayTargets,
      executiveSummary: template.executiveSummary,
      sourceDocument: casePayload.sourceDocument || null,
      sourceFields: casePayload.sourceFields || {},
      missingFields: casePayload.missingFields || template.requiredFields,
      prefill: casePayload.prefill || {}
    };
  }

  window.TSMSectorIntelligence = {
    version: "1.0.0",
    APP_REGISTRY,
    packs: INTELLIGENCE,

    normalizeSector,
    getSectorPack,
    getMeta,
    getRule,
    getApps,
    estimateExposure,
    bestAction,
    buildCaseTemplate,
    matchAnomalyFromFields,
    buildSuggestedAppPayload
  };
})();
