const fs = require('fs');
const path = require('path');

const FILE_L1 = path.join(__dirname, 'html/l1-copilot/l1-ticket-copilot.html');
const FILE_VM = path.join(__dirname, 'html/l1-copilot/vmware-copilot.html');

console.log('🚀 Starting Quick 15 Playbooks integration patch...');

// --- 1. PATCH L1 TICKET COPILOT ---
if (fs.existsSync(FILE_L1)) {
  let html = fs.readFileSync(FILE_L1, 'utf8');

  // Backup original file
  fs.writeFileSync(FILE_L1 + '.bak', html);
  console.log(`📦 Created backup: ${FILE_L1}.bak`);

  // A. Inject CSS rules before </style>
  const cssInject = `
/* Quick 15 Component Styles */
.main .section { display: none; }
.main .section.active { display: block !important; }
.q15-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 10px;
}
.q15-card {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all .15s ease;
  font-size: 11px;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
}
.q15-card:hover {
  border-color: var(--cyan);
  background: rgba(0,229,255,.06);
  color: var(--cyan);
  transform: translateY(-1px);
}
.q15-card.active {
  border-color: var(--cyan);
  background: rgba(0,229,255,.12);
  color: var(--cyan);
  font-weight: 700;
}
`;
  if (!html.includes('.q15-grid')) {
    html = html.replace('</style>', cssInject + '\n</style>');
  }

  // B. Inject Sidebar Item
  const sidebarNavTarget = '<div class="sb-item" data-section="sccm">';
  const sidebarNavInject = '<div class="sb-item" data-section="quick15"><span class="sb-dot"></span>Quick 15 Playbooks</div>\n    ';
  if (!html.includes('data-section="quick15"')) {
    html = html.replace(sidebarNavTarget, sidebarNavInject + sidebarNavTarget);
  }

  // C. Inject Section HTML Container
  const sectionTarget = '</section>\n\n    <!-- ONBOARDING -->';
  const sectionInject = `</section>

    <!-- QUICK 15 PLAYBOOKS SECTION -->
    <section class="section" id="sec-quick15">
      <div class="card" id="q15AutoMatchCard" style="display:none; border-color:var(--cyan); background:rgba(0,229,255,.03)">
        <div class="card-head" style="color:var(--cyan)">
          <span>MATCHED SCENARIO DETECTED</span>
          <span class="kb-conf high" id="q15MatchConf">94% CONFIDENCE</span>
        </div>
        <div class="card-body" style="display:flex; justify-content:space-between; align-items:center; gap:16px;">
          <div style="flex:1">
            <h3 id="q15MatchTitle" style="color:var(--cyan); font-size:14px; margin-bottom:4px">🔐 Account Lockout</h3>
            <p id="q15MatchMeta" style="color:var(--text-dim); font-size:10px">System: Active Directory | Severity: Medium | Category: Identity</p>
          </div>
          <div class="btn-row" style="margin-top:0">
            <button class="btn btn-cyan" id="btnApplyAutoMatch">APPLY TO TICKET</button>
            <button class="btn btn-outline" id="btnViewAutoMatch">VIEW PLAYBOOK</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <span>L1 QUICK REFERENCE — TOP 15 SCENARIOS</span>
          <span style="font-size:9px; color:var(--text-dim)">INSTANT OPERATIONAL PLAYBOOKS</span>
        </div>
        <div class="card-body">
          <div class="q15-grid" id="q15Grid"></div>
        </div>
      </div>

      <div class="card" id="q15PlaybookPanel" style="display:none;">
        <div class="card-head">
          <span id="q15PlaybookTitle">PLAYBOOK PREVIEW</span>
          <span id="q15PlaybookSev" class="tag tag-medium">MEDIUM</span>
        </div>
        <div class="card-body">
          <div class="analysis-grid">
            <div>
              <h4 style="color:var(--cyan); font-size:10px; margin-bottom:8px; text-transform:uppercase">First Response Checklist</h4>
              <ol id="q15PlaybookSteps" class="kb-match-steps" style="margin-bottom:16px"></ol>
              <h4 style="color:var(--amber); font-size:10px; margin-bottom:8px; text-transform:uppercase">Escalate When</h4>
              <ul id="q15PlaybookEscalate" style="color:var(--text-dim); font-size:11px; margin-left:18px; margin-bottom:16px"></ul>
            </div>
            <div>
              <div class="kpi-card" style="margin-bottom:8px">
                <div class="kpi-label">Affected System</div>
                <div class="kpi-value" id="q15PlaybookSystem" style="font-size:12px">Active Directory</div>
              </div>
              <div class="kpi-card" style="margin-bottom:8px">
                <div class="kpi-label">Knowledge Base Ref</div>
                <div class="kpi-value" id="q15PlaybookKb" style="font-size:12px">KB-AD-001</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Target Escalation Team</div>
                <div class="kpi-value" id="q15PlaybookTeam" style="font-size:12px">Identity / AD SME</div>
              </div>
            </div>
          </div>
          <div class="btn-row" style="margin-top:16px; border-top:1px solid var(--border); padding-top:12px">
            <button class="btn btn-cyan" id="btnApplyQ15ToTicket">APPLY TO TICKET WORKFLOW</button>
            <button class="btn btn-ghost" onclick="window.open('/l1-copilot/enterprise-command-center.html', '_blank')">OPEN DIGITAL TWIN</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ONBOARDING -->`;

  if (!html.includes('id="sec-quick15"')) {
    html = html.replace(sectionTarget, sectionInject);
  }

  // D. Inject JavaScript Engine before </body>
  const jsInject = `
<script>
const SCENARIO_LIBRARY = [
  { id: "scen-01", name: "Account Lockout", icon: "🔐", system: "Active Directory", category: "Account / Authentication", severity: "Medium", kb: "KB-AD-001", team: "Identity / AD SME", keywords: ["lockout", "locked out", "account locked", "bad password"], steps: ["Verify user identity.", "Inspect AD lockout source IP.", "Identify cached credentials.", "Unlock account.", "Re-authenticate."], escalate: ["Repeated lockouts.", "Subnet-wide lockouts.", "DC replication failure."] },
  { id: "scen-02", name: "Password Expired", icon: "🔑", system: "Active Directory", category: "Account / Authentication", severity: "Low", kb: "KB-AD-002", team: "Identity / Helpdesk L1", keywords: ["password expired", "expire", "change password", "reset password"], steps: ["Verify user identity.", "Verify expiration flag in AD.", "Trigger SSPR reset.", "Sync across mobile/VPN."], escalate: ["SSPR unreachable.", "Replication failure."] },
  { id: "scen-03", name: "MFA Failure", icon: "🔒", system: "Identity Platform", category: "Identity / Security", severity: "Medium", kb: "KB-SEC-008", team: "Identity / SecOps SME", keywords: ["mfa", "authenticator", "duo", "2fa", "push notification"], steps: ["Check mobile device time sync.", "Verify IdP gateway health.", "Check registered auth method.", "Issue temporary bypass code."], escalate: ["Unverified device loss.", "CA Policy block."] },
  { id: "scen-04", name: "VPN Failure", icon: "⚙️", system: "Network / Gateway", category: "Network Connectivity", severity: "Medium", kb: "KB-NET-014", team: "Network Operations Center", keywords: ["vpn", "tunnel", "anyconnect", "globalprotect"], steps: ["Check local internet.", "Verify VPN portal status.", "Clear connection profiles.", "Test fallback gateway."], escalate: ["Concentrator gateway unreachable.", "RADIUS timeout."] },
  { id: "scen-05", name: "Network Connectivity Failure", icon: "📡", system: "Network", category: "Infrastructure", severity: "High", kb: "KB-NET-003", team: "Network Operations Center", keywords: ["no internet", "unreachable", "disconnected", "packet loss"], steps: ["Check ipconfig.", "Ping loopback & gateway.", "Flush DNS.", "Verify link speed."], escalate: ["Office subnet down.", "Switch port failure."] },
  { id: "scen-06", name: "Slow Network / Latency", icon: "🌐", system: "Network", category: "Infrastructure", severity: "Low", kb: "KB-NET-009", team: "Network Operations Center", keywords: ["slow", "lag", "high ping", "latency"], steps: ["Run tracert.", "Check workstation bandwidth.", "Verify gateway QoS.", "Test without proxy."], escalate: ["WAN link saturated.", "Regional packet drops."] },
  { id: "scen-07", name: "Printer Offline", icon: "🖨", system: "Device / Print Server", category: "Hardware", severity: "Low", kb: "KB-DEV-021", team: "Desktop Support L2", keywords: ["printer offline", "print queue", "can't print", "spooler"], steps: ["Restart Print Spooler (\`net stop spooler && net start spooler\`).", "Ping printer IP.", "Check server print queue.", "Re-map printer."], escalate: ["Print server down.", "Printer IP offline."] },
  { id: "scen-08", name: "Printer Jam", icon: "🖨", system: "Device", category: "Hardware", severity: "Low", kb: "KB-DEV-022", team: "Facilities / Field Support", keywords: ["printer jam", "paper jam", "roller error"], steps: ["Inspect paper trays 1-3.", "Verify paper weight.", "Power cycle hardware."], escalate: ["Roller damage.", "Mechanical breakdown."] },
  { id: "scen-09", name: "Disk Full", icon: "💾", system: "Device Storage", category: "System / OS", severity: "Medium", kb: "KB-DEV-005", team: "Desktop Support L1", keywords: ["disk full", "low disk space", "c: drive"], steps: ["Run \`cleanmgr.exe\`.", "Flush \`SoftwareDistribution\`.", "Clean temp files.", "Empty Recycle Bin."], escalate: ["Bloated system file.", "Encryption log growth."] },
  { id: "scen-10", name: "BSOD / Device Crash", icon: "💻", system: "Device OS", category: "Hardware / Driver", severity: "High", kb: "KB-DEV-099", team: "Desktop Support L2", keywords: ["bsod", "blue screen", "crash", "stop code"], steps: ["Note Stop Code.", "Check recent driver/update pushes.", "Run \`sfc /scannow\` in Safe Mode.", "Check crash dumps."], escalate: ["Hardware failure (RAM/NVMe).", "Unrecoverable boot loop."] },
  { id: "scen-11", name: "Black Screen / No Display", icon: "🖥", system: "Device Hardware", category: "Hardware", severity: "Medium", kb: "KB-DEV-012", team: "Desktop Support L1", keywords: ["black screen", "no display", "monitor dark"], steps: ["Press \`Win + Ctrl + Shift + B\`.", "Verify DP/HDMI/USB-C cables.", "Test docking bypass.", "Check BIOS output."], escalate: ["GPU failure.", "Internal video chip defect."] },
  { id: "scen-12", name: "Application Crash", icon: "🪟", system: "Device Software", category: "Software", severity: "Low", kb: "KB-SW-044", team: "Desktop Support L1", keywords: ["app crash", "stopped working", "event id 1000"], steps: ["Inspect Event Viewer Application log.", "Repair app binaries.", "Clear \`%localappdata%\` cache.", "Check .NET runtimes."], escalate: ["App bug.", "Database server drop."] },
  { id: "scen-13", name: "Patch Failure", icon: "🔄", system: "SCCM / Intune", category: "Patching", severity: "Medium", kb: "KB-SEC-019", team: "Endpoint Engineering", keywords: ["patch fail", "update error", "0x80070002"], steps: ["Run Windows Update Troubleshooter.", "Reset WU components.", "Force SCCM cycle.", "Check \`WUAHandler.log\`."], escalate: ["Distribution Point down.", "WMI corruption."] },
  { id: "scen-14", name: "VMware VM Down", icon: "☁️", system: "VMware Infrastructure", category: "Virtualization", severity: "High", kb: "KB-VMW-010", team: "VMware SME", keywords: ["vm down", "vcenter", "esxi", "unresponsive vm"], steps: ["Check vCenter power state.", "Check ESXi host heartbeats.", "Restart VM via vSphere.", "Inspect HA logs."], escalate: ["Host PSOD.", "Storage APD condition."] },
  { id: "scen-15", name: "VMware Datastore Full", icon: "🗄", system: "VMware Infrastructure", category: "Storage", severity: "High", kb: "KB-VMW-033", team: "VMware SME", keywords: ["datastore full", "vmfs full", "snapshot storage"], steps: ["Locate open VM snapshots.", "Consolidate stale delta disks.", "Storage vMotion non-critical VMs.", "Audit vDK growth."], escalate: ["Capacity >98%.", "SAN LUN expansion required."] }
];

const copilotChannel = new BroadcastChannel('tsm_copilot_relay');
let activeSelectedScenario = null;

function renderQ15Grid() {
  const container = document.getElementById("q15Grid");
  if (!container) return;
  container.innerHTML = SCENARIO_LIBRARY.map(s => \`
    <div class="q15-card" data-id="\${s.id}" onclick="selectQ15Scenario('\${s.id}')">
      <span>\${s.icon}</span>
      <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis">\${s.name}</span>
    </div>
  \`).join('');
}

function selectQ15Scenario(id) {
  const scenario = SCENARIO_LIBRARY.find(s => s.id === id);
  if (!scenario) return;
  activeSelectedScenario = scenario;
  document.querySelectorAll('.q15-card').forEach(c => c.classList.toggle('active', c.getAttribute('data-id') === id));

  document.getElementById("q15PlaybookTitle").innerText = \`\${scenario.icon} \${scenario.name.toUpperCase()} PLAYBOOK\`;
  document.getElementById("q15PlaybookSev").innerText = scenario.severity.toUpperCase();
  document.getElementById("q15PlaybookSystem").innerText = scenario.system;
  document.getElementById("q15PlaybookKb").innerText = scenario.kb;
  document.getElementById("q15PlaybookTeam").innerText = scenario.team;
  document.getElementById("q15PlaybookSteps").innerHTML = scenario.steps.map(st => \`<li>\${st}</li>\`).join('');
  document.getElementById("q15PlaybookEscalate").innerHTML = scenario.escalate.map(e => \`<li>\${e}</li>\`).join('');
  document.getElementById("q15PlaybookPanel").style.display = "block";
}

function evaluateTicketAutoMatch() {
  const desc = document.getElementById("tkDescription")?.value.toLowerCase() || "";
  if (desc.length < 10) {
    document.getElementById("q15AutoMatchCard").style.display = "none";
    return;
  }
  let bestMatch = null, maxScore = 0;
  SCENARIO_LIBRARY.forEach(s => {
    let score = 0;
    s.keywords.forEach(kw => { if (desc.includes(kw)) score += 1; });
    if (score > maxScore) { maxScore = score; bestMatch = s; }
  });

  if (bestMatch && maxScore > 0) {
    const card = document.getElementById("q15AutoMatchCard");
    document.getElementById("q15MatchTitle").innerText = \`\${bestMatch.icon} \${bestMatch.name}\`;
    document.getElementById("q15MatchMeta").innerText = \`System: \${bestMatch.system} | Severity: \${bestMatch.severity} | Category: \${bestMatch.category}\`;
    card.style.display = "block";

    document.getElementById("btnApplyAutoMatch").onclick = () => applyScenarioToTicket(bestMatch);
    document.getElementById("btnViewAutoMatch").onclick = () => {
      document.querySelector('[data-section="quick15"]')?.click();
      selectQ15Scenario(bestMatch.id);
    };
  } else {
    document.getElementById("q15AutoMatchCard").style.display = "none";
  }
}

function applyScenarioToTicket(scenario = activeSelectedScenario) {
  if (!scenario) return;
  const groupInput = document.getElementById("tkGroup");
  if (groupInput) groupInput.value = scenario.team;

  const fixBanner = document.getElementById("fixValidatedBanner");
  if (fixBanner) {
    fixBanner.innerHTML = \`PLAYBOOK ATTACHED: [\${scenario.kb}] \${scenario.name} — Recommended Team: \${scenario.team}\`;
    fixBanner.classList.add("show");
  }

  if (scenario.system.includes("VMware") || scenario.id === "scen-14" || scenario.id === "scen-15") {
    const payload = {
      type: 'VMWARE_SCENARIO_TRIGGER',
      scenarioId: scenario.id,
      name: scenario.name,
      severity: scenario.severity,
      kb: scenario.kb,
      steps: scenario.steps,
      escalate: scenario.escalate,
      incidentId: document.getElementById("tkIncident")?.value || "INC-PENDING",
      asset: document.getElementById("tkAsset")?.value || "ESXI-HOST-01"
    };
    copilotChannel.postMessage(payload);

    if (confirm(\`VMware scenario '\${scenario.name}' engaged. Switch to VMware SME view?\`)) {
      window.location.href = \`/html/l1-copilot/vmware-copilot.html?scenario=\${scenario.id}&inc=\${encodeURIComponent(payload.incidentId)}\`;
    }
  } else {
    alert(\`Applied '\${scenario.name}' Playbook to ticket!\`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderQ15Grid();

  const navItems = document.querySelectorAll('#sideNav .sb-item');
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      navItems.forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.main .section').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
      });
      
      this.classList.add('active');
      const targetSec = document.getElementById('sec-' + this.getAttribute('data-section'));
      if (targetSec) {
        targetSec.classList.add('active');
        targetSec.style.display = 'block';
      }
    });
  });

  const tkDesc = document.getElementById("tkDescription");
  if (tkDesc) tkDesc.addEventListener("input", evaluateTicketAutoMatch);

  const applyBtn = document.getElementById("btnApplyQ15ToTicket");
  if (applyBtn) applyBtn.addEventListener("click", () => applyScenarioToTicket());
});
</script>
`;

  if (!html.includes('const SCENARIO_LIBRARY =')) {
    html = html.replace('</body>', jsInject + '\n</body>');
  }

  fs.writeFileSync(FILE_L1, html);
  console.log(`✅ Applied fixes to ${FILE_L1}`);
} else {
  console.error(`❌ Could not find file: ${FILE_L1}`);
}

// --- 2. PATCH VMWARE COPILOT ---
if (fs.existsSync(FILE_VM)) {
  let vmHtml = fs.readFileSync(FILE_VM, 'utf8');

  fs.writeFileSync(FILE_VM + '.bak', vmHtml);
  console.log(`📦 Created backup: ${FILE_VM}.bak`);

  const vmJsInject = `
<!-- VMWARE COPILOT QUICK 15 OPERATIONAL BRIDGE -->
<script>
(function() {
  const copilotChannel = new BroadcastChannel('tsm_copilot_relay');

  const VMWARE_WORKFLOWS = {
    'scen-14': {
      title: 'VMware VM Down / Host Unresponsive',
      kb: 'KB-VMW-010',
      prefillNotes: 'Automated trigger: VM Down detected. Inspecting vCenter HA events and ESXi host heartbeats...',
      kpis: { status: 'CRITICAL', haTriggered: 'YES', latency: '12ms' },
      steps: ['Inspect vCenter HA Events', 'Verify ESXi Management Network', 'Check Guest OS Heartbeat', 'Restart Guest OS']
    },
    'scen-15': {
      title: 'VMware Datastore Capacity Critical',
      kb: 'KB-VMW-033',
      prefillNotes: 'Automated trigger: Datastore capacity high. Scanning for stale snapshots...',
      kpis: { status: 'WARNING', haTriggered: 'NO', latency: '148ms' },
      steps: ['Scan for Orphaned Snapshots (>7 days)', 'Consolidate Stale Delta Disks', 'Storage vMotion Non-Critical VMs', 'Request SAN LUN Expansion']
    }
  };

  function executeVmwareWorkflow(data) {
    const wf = VMWARE_WORKFLOWS[data.scenarioId] || {
      title: data.name,
      kb: data.kb,
      prefillNotes: \`Triggered \${data.name} for \${data.incidentId}.\`,
      kpis: { status: 'EVALUATING', haTriggered: 'N/A', latency: '--' },
      steps: data.steps || []
    };

    let banner = document.getElementById('vmwareAlertBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'vmwareAlertBanner';
      const main = document.querySelector('.main') || document.body;
      main.insertBefore(banner, main.firstChild);
    }
    banner.style.display = 'block';
    banner.innerHTML = \`
      <div style="padding:10px 14px; background:rgba(0,229,255,.08); border:1px solid var(--cyan); border-radius:6px; margin-bottom:16px; color:var(--cyan); font-size:11px;">
        <strong>OPERATIONAL BRIDGE ACTIVE:</strong> Handled \${wf.title} [\${wf.kb}] for Target Asset: <u>\${data.asset || 'ESXI-CLUSTER-01'}</u>
      </div>
    \`;

    const notesBox = document.getElementById('vmwareDiagNotes') || document.querySelector('textarea');
    if (notesBox) {
      notesBox.value = \`[\${new Date().toISOString()}] TRIGGER: \${data.incidentId || 'INC-L1'}\\n\` +
                       \`Scenario: \${wf.title}\\n\` +
                       \`KB Reference: \${wf.kb}\\n\\n\` +
                       \`EXECUTION STEPS:\\n\` +
                       wf.steps.map((s, i) => \` [ ] Step \${i+1}: \${s}\`).join('\\n');
    }
  }

  copilotChannel.onmessage = function(e) {
    if (e.data && e.data.type === 'VMWARE_SCENARIO_TRIGGER') executeVmwareWorkflow(e.data);
  };

  document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const scen = urlParams.get('scenario');
    if (scen) {
      executeVmwareWorkflow({
        scenarioId: scen,
        incidentId: urlParams.get('inc') || 'INC-AUTO',
        name: scen === 'scen-14' ? 'VMware VM Down' : 'VMware Datastore Full',
        kb: scen === 'scen-14' ? 'KB-VMW-010' : 'KB-VMW-033'
      });
    }
  });
})();
</script>
`;

  if (!vmHtml.includes('VMWARE_SCENARIO_TRIGGER')) {
    vmHtml = vmHtml.replace('</body>', vmJsInject + '\n</body>');
  }

  fs.writeFileSync(FILE_VM, vmHtml);
  console.log(`✅ Applied fixes to ${FILE_VM}`);
} else {
  console.error(`❌ Could not find file: ${FILE_VM}`);
}

console.log('🎉 Patch complete!');