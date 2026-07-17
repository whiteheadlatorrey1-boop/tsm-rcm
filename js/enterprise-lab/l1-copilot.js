/**
 * TSM Enterprise Lab - L1 Ticket Copilot Engine
 * 
 * Orchestrates:
 * 1. Live eventBus telemetry integration (NOC Alerts -> L1 Auto-Drafting)
 * 2. Cross-UI sync (Clicking NOC Assets -> Populating L1 Ticket Intake Fields)
 * 3. Step-by-Step L1 Workspace Tab Navigation & Tracking State
 * 4. Automatic Scratchpad Accumulation & Auto-Format Resolution Engine
 */

import eventBus from './event-bus.js';

class L1CopilotController {
  constructor() {
    // Current Active Workspace State
    this.state = {
      selectedAsset: null,
      notes: [],
      troubleshootingSteps: {
        verifyUser: false,
        verifyPower: false,
        verifyHardware: false,
        verifyOS: false
      }
    };

    // Cache DOM Elements for L1 Workspace
    this.dom = {
      // Navigation Tabs
      tabs: document.querySelectorAll('.l1-tab-btn'),
      tabContents: document.querySelectorAll('.l1-tab-content'),

      // Ticket Intake Fields
      ticketIncidentId: document.getElementById('ticket-incident-id'),
      ticketRequester: document.getElementById('ticket-requester'),
      ticketAsset: document.getElementById('ticket-asset'),
      ticketIp: document.getElementById('ticket-ip'),
      ticketOs: document.getElementById('ticket-os'),
      ticketPriority: document.getElementById('ticket-priority'),
      ticketDescription: document.getElementById('ticket-description'),
      btnRunAi: document.getElementById('btn-run-ai'),

      // AI Analysis Display
      aiConfidence: document.getElementById('ai-confidence'),
      aiSeverity: document.getElementById('ai-severity'),
      aiAffectedSystem: document.getElementById('ai-affected-system'),
      aiImpact: document.getElementById('ai-impact'),

      // Troubleshooting Checklist Elements
      checkVerifyUser: document.getElementById('check-verify-user'),
      checkVerifyPower: document.getElementById('check-verify-power'),
      checkVerifyHardware: document.getElementById('check-verify-hardware'),
      checkVerifyOS: document.getElementById('check-verify-os'),

      // Live Notes Scratchpad
      scratchpadNotes: document.getElementById('l1-scratchpad-notes'),

      // Resolution Panel
      btnGenerateResolution: document.getElementById('btn-generate-resolution'),
      resolutionOutput: document.getElementById('resolution-output'),
      btnCopyResolution: document.getElementById('btn-copy-resolution'),

      // Handoff Panel
      escalationTarget: document.getElementById('escalation-target'),
      btnGenerateHandoff: document.getElementById('btn-generate-handoff'),
      handoffOutput: document.getElementById('handoff-output')
    };

    this.init();
  }

  init() {
    this.setupTabNavigation();
    this.registerEventBindings();
    this.setupTroubleshootingTracker();
    this.setupResolutionAndEscalation();
    this.loadCachedState();
  }

  /**
   * 1. Handling Tab Navigation & UI Views
   */
  setupTabNavigation() {
    this.dom.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');

        // Toggle button active classes
        this.dom.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Show matching content panel
        this.dom.tabContents.forEach(content => {
          if (content.id === `tab-${targetTab}`) {
            content.classList.remove('hidden');
          } else {
            content.classList.add('hidden');
          }
        });
      });
    });
  }

  /**
   * 2. Event Stream Hooking: Connects directly to the NOC's event-bus
   */
  registerEventBindings() {
    // A. Intercept real-time warnings/failures to auto-draft logs into the scratchpad
    eventBus.on('system:log', (logData) => {
      if (logData.type === 'danger' || logData.type === 'warning' || logData.type === 'warn') {
        this.appendSystemAlertToScratchpad(logData);
      }
    });

    // B. Catch direct click selections from NOC Dashboard to Auto-Fill L1 Intake Fields
    // (Ensure your NOC device click emitter fires 'noc:device-selected' or we hook it)
    eventBus.on('noc:device-selected', (device) => {
      this.populateTicketFromNocAsset(device);
    });

    // Hack an event bridge into your global window space so dashboard.js can easily signal clicks
    window.addEventListener('noc-asset-selected', (e) => {
      if (e.detail) {
        this.populateTicketFromNocAsset(e.detail);
      }
    });

    // AI Intake button analysis simulator
    if (this.dom.btnRunAi) {
      this.dom.btnRunAi.addEventListener('click', () => this.runAiTriageAnalysis());
    }
  }

  /**
   * 3. Handle Auto-Population when NOC Device is selected
   */
  populateTicketFromNocAsset(device) {
    this.state.selectedAsset = device;

    // Direct binding into input fields
    if (this.dom.ticketIncidentId) this.dom.ticketIncidentId.value = `INC-${Math.floor(100000 + Math.random() * 900000)}`;
    if (this.dom.ticketRequester) this.dom.ticketRequester.value = "NOC Command Center Event";
    if (this.dom.ticketAsset) this.dom.ticketAsset.value = device.name || '';
    if (this.dom.ticketIp) this.dom.ticketIp.value = device.ip || 'Local Network';
    if (this.dom.ticketOs) this.dom.ticketOs.value = device.os || 'Firmware';
    if (this.dom.ticketPriority) this.dom.ticketPriority.value = device.status === 'offline' ? 'High' : 'Medium';
    
    if (this.dom.ticketDescription) {
      this.dom.ticketDescription.value = `NOC Monitor detected node "${device.name}" status: ${device.status.toUpperCase()}.\nRole: ${device.role || 'Unassigned'}\nIP Address: ${device.ip || 'N/A'}`;
    }

    this.appendSystemAlertToScratchpad({
      type: 'info',
      message: `Pulled asset context for: ${device.name} (IP: ${device.ip})`
    });

    // Automatically navigate to Ticket tab to show user the changes
    const ticketTabBtn = document.querySelector('.l1-tab-btn[data-tab="ticket"]');
    if (ticketTabBtn) ticketTabBtn.click();
  }

  /**
   * AI Analysis parsing engine (Simulated L1 LLM Interface)
   */
  runAiTriageAnalysis() {
    if (!this.dom.ticketDescription || !this.dom.ticketDescription.value.trim()) {
      alert("Please provide a ticket description or choose a NOC device first!");
      return;
    }

    const desc = this.dom.ticketDescription.value.toLowerCase();
    let confidence = "85%";
    let severity = this.dom.ticketPriority ? this.dom.ticketPriority.value : "Medium";
    let affected = "Operating System / Application";
    let impact = "Local asset degraded, user work-stoppage potential.";

    if (desc.includes('offline') || desc.includes('failed')) {
      confidence = "98%";
      severity = "High";
      affected = "Network / System Hardware Layer";
      impact = "Services stopped. System unreachable on local subnet.";
    }

    // Populate UI Metrics
    if (this.dom.aiConfidence) this.dom.aiConfidence.textContent = confidence;
    if (this.dom.aiSeverity) this.dom.aiSeverity.textContent = severity;
    if (this.dom.aiAffectedSystem) this.dom.aiAffectedSystem.textContent = affected;
    if (this.dom.aiImpact) this.dom.aiImpact.textContent = impact;

    this.appendSystemAlertToScratchpad({
      type: 'success',
      message: `AI analysis execution complete. Path Identified: [${affected}]`
    });

    // Auto-navigate to AI Analysis page to review results
    const aiTabBtn = document.querySelector('.l1-tab-btn[data-tab="ai-analysis"]');
    if (aiTabBtn) aiTabBtn.click();
  }

  /**
   * 4. Guided Checklist Troubleshooting Engine 
   */
  setupTroubleshootingTracker() {
    const steps = [
      { element: this.dom.checkVerifyUser, key: 'verifyUser', label: 'User Verification Check' },
      { element: this.dom.checkVerifyPower, key: 'verifyPower', label: 'Hardware Physical Power Check' },
      { element: this.dom.checkVerifyHardware, key: 'verifyHardware', label: 'Component Connectivity Diagnostics' },
      { element: this.dom.checkVerifyOS, key: 'verifyOS', label: 'OS Integrity & Service Validation' }
    ];

    steps.forEach(step => {
      if (step.element) {
        step.element.addEventListener('change', (e) => {
          this.state.troubleshootingSteps[step.key] = e.target.checked;
          const statusText = e.target.checked ? 'PASSED / VERIFIED' : 'PENDING';
          this.appendSystemAlertToScratchpad({
            type: e.target.checked ? 'success' : 'warn',
            message: `Troubleshooting checklist updated: [${step.label}] changed to [${statusText}]`
          });
        });
      }
    });
  }

  /**
   * 5. Outputs: Copyable Resolution Summaries & Escalation Packets
   */
  setupResolutionAndEscalation() {
    // Generate Final Support Ticket Summary
    if (this.dom.btnGenerateResolution) {
      this.dom.btnGenerateResolution.addEventListener('click', () => {
        const incidentId = this.dom.ticketIncidentId ? this.dom.ticketIncidentId.value : 'N/A';
        const asset = this.dom.ticketAsset ? this.dom.ticketAsset.value : 'N/A';
        const notesValue = this.dom.scratchpadNotes ? this.dom.scratchpadNotes.value : '';

        const summary = `
=========================================
TSM SYSTEM RESOLUTION REPORT
=========================================
INCIDENT ID : ${incidentId}
TARGET ASSET: ${asset}
TIMESTAMP   : ${new Date().toLocaleString()}

SUMMARY OF TROUBLESHOOTING ACTIONS:
${Object.entries(this.state.troubleshootingSteps)
  .map(([k, v]) => `* [${v ? 'X' : ' '}] ${k.replace(/([A-Z])/g, ' $1').toUpperCase()}`)
  .join('\n')}

DIAGNOSTIC LOG ENTRIES:
${notesValue ? notesValue : "No supplementary notes logged during troubleshooting workflow."}

STATUS      : Resolved / Validated
=========================================
`;
        if (this.dom.resolutionOutput) this.dom.resolutionOutput.value = summary.trim();
      });
    }

    // Auto-Copy Feature
    if (this.dom.btnCopyResolution) {
      this.dom.btnCopyResolution.addEventListener('click', () => {
        if (this.dom.resolutionOutput && this.dom.resolutionOutput.value) {
          navigator.clipboard.writeText(this.dom.resolutionOutput.value);
          this.dom.btnCopyResolution.textContent = "COPIED TO CLIPBOARD!";
          setTimeout(() => {
            this.dom.btnCopyResolution.textContent = "Copy To Clipboard";
          }, 2000);
        }
      });
    }

    // Run Escalation Packaging
    if (this.dom.btnGenerateHandoff) {
      this.dom.btnGenerateHandoff.addEventListener('click', () => {
        const target = this.dom.escalationTarget ? this.dom.escalationTarget.value : 'L2 Desktop';
        const incident = this.dom.ticketIncidentId ? this.dom.ticketIncidentId.value : 'N/A';
        const desc = this.dom.ticketDescription ? this.dom.ticketDescription.value : 'N/A';
        
        const handoffBlock = `
=== L1 TO ${target.toUpperCase()} ESCALATION PACKET ===
INCIDENT NUM: ${incident}
SOURCE ASSET: ${this.dom.ticketAsset?.value || 'Unknown'}
DESCRIPTION : ${desc}

COMPLETED L1 RUNBOOK STEPS:
${Object.entries(this.state.troubleshootingSteps)
  .map(([k, v]) => `  - ${k.replace(/([A-Z])/g, ' $1')}: ${v ? 'VERIFIED/PASS' : 'UNABLE TO CONCLUDE'}`)
  .join('\n')}

L1 SCRATCHPAD EVIDENCE LOG:
${this.dom.scratchpadNotes?.value || 'No triage logs gathered.'}
`;
        if (this.dom.handoffOutput) this.dom.handoffOutput.value = handoffBlock.trim();
      });
    }
  }

  /**
   * Append events/logs natively into the persistent Live Scratchpad
   */
  appendSystemAlertToScratchpad(log) {
    if (!this.dom.scratchpadNotes) return;
    const time = new Date().toLocaleTimeString();
    const currentNotes = this.dom.scratchpadNotes.value;
    
    this.dom.scratchpadNotes.value = `[${time}] (${log.type.toUpperCase()}) ${log.message}\n` + currentNotes;
    
    // Backup current scratchpad inputs locally
    localStorage.setItem('tsm_l1_scratchpad_cache', this.dom.scratchpadNotes.value);
  }

  loadCachedState() {
    const cachedNotes = localStorage.getItem('tsm_l1_scratchpad_cache');
    if (cachedNotes && this.dom.scratchpadNotes) {
      this.dom.scratchpadNotes.value = cachedNotes;
    }
  }
}

// Automatically instantiate the workspace module
document.addEventListener('DOMContentLoaded', () => {
  window.L1Copilot = new L1CopilotController();
});