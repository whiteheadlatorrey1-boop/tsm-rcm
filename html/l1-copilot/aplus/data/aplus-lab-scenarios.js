/* ============================================================
   TSM A+ Training Engine — Troubleshooting Lab Scenarios
   ------------------------------------------------------------
   Phase 3 data model (see html/l1-copilot/aplus/README.md).
   Original simulated tickets, not reproduced exam content.

   Each scenario is a progressive-evidence investigation, not a
   multiple-choice question: the student picks WHAT to check, in
   whatever order they want, before diagnosing — same shape as the
   "Scenario → Investigate → Hypothesis → Test → Evidence →
   Resolution → Explain" loop, and deliberately mirrors the L1
   Ticket Copilot's own troubleshooting-checklist mental model
   rather than introducing a new one.

   - evidence[]: every source the student CAN check. `relevant`
     marks whether it actually bears on the correct diagnosis —
     checking an irrelevant source isn't wrong, it's realistic
     (real L1 work involves ruling things out), but the lab tracks
     it for the after-action "investigation efficiency" note.
   - hypotheses[]: the diagnosis choices. Exactly one `correct`.
     Every hypothesis — right or wrong — carries an `explanation`
     tied to the evidence, same "don't waste a wrong answer"
     principle as the Question Coach's Answer Intelligence layer.
     `concept` feeds the shared TSMAplusEngine mastery store, same
     tagging convention as the question bank.
   ============================================================ */

const APLUS_LAB_SCENARIOS = [
  {
    id: 'lab-001',
    objective: 'troubleshooting',
    ticketNumber: 'INC-10427',
    userReport: 'My computer is extremely slow, especially right after I log in. It gets a little better after a few minutes but never feels normal.',
    evidence: [
      {
        id: 'task-manager', label: 'Check Task Manager (CPU / Memory / Disk)', relevant: true,
        reveal: 'CPU: 12%   Memory: 91%   Disk: 100%',
        note: '100% disk with high memory pressure right after login — that combination points toward something loading heavily at startup, not a raw CPU bottleneck.'
      },
      {
        id: 'startup-apps', label: 'Check Startup Applications', relevant: true,
        reveal: '14 applications set to launch at startup, including 3 separate cloud-sync clients and a legacy antivirus agent alongside the primary AV.',
        note: 'A heavy, redundant startup list is a classic cause of exactly this symptom — everything fights for disk I/O at once right after login, then settles once they finish loading.'
      },
      {
        id: 'event-viewer', label: 'Check Event Viewer', relevant: false,
        reveal: 'No critical or warning-level errors in the System or Application logs over the last 7 days.',
        note: 'Worth ruling out, but a clean Event Viewer doesn\u2019t explain this symptom — it just tells you nothing is crashing.'
      },
      {
        id: 'network-status', label: 'Check Network Status', relevant: false,
        reveal: 'Stable Wi-Fi connection, normal latency, no packet loss.',
        note: 'Rules out a network-driven cause, but this is a local resource problem, not a connectivity one — doesn\u2019t point toward the diagnosis.'
      },
      {
        id: 'installed-apps', label: 'Check Installed Applications', relevant: false,
        reveal: 'Nothing unusual — no recently installed or unrecognized software.',
        note: 'No bad install to point to here — the cause is configuration (what launches at boot), not an installed program itself.'
      },
      {
        id: 'disk-health', label: 'Check Disk Health (SMART status)', relevant: false,
        reveal: 'Drive passes its SMART self-test cleanly, no reallocated sectors.',
        note: 'Rules out a failing drive as the cause — the disk itself is healthy, it\u2019s just overloaded at a specific moment.'
      }
    ],
    hypotheses: [
      {
        id: 'h1', correct: true, concept: 'startup-io-bottleneck',
        label: 'Too many startup applications are overloading disk I/O right after login',
        explanation: 'High memory pressure plus 100% disk immediately after login, combined with 14 startup apps including redundant cloud-sync clients and a duplicate AV agent, is the signature of startup overload \u2014 everything loads at once, competes for the same disk, and it eases off once they finish.'
      },
      {
        id: 'h2', correct: false, concept: 'disk-health-vs-io-load',
        label: 'The hard drive is failing',
        explanation: 'SMART came back clean with no reallocated sectors \u2014 a failing drive usually shows SMART warnings or reallocated sectors well before this kind of symptom. This is I/O contention, not drive failure.'
      },
      {
        id: 'h3', correct: false, concept: 'network-vs-local-resource-issue',
        label: 'Malware is beaconing out over the network at login',
        explanation: 'Network status was stable with no unusual traffic pattern. Network-driven causes like beaconing would typically show up as latency or connection instability \u2014 this is purely a local disk/memory resource issue.'
      },
      {
        id: 'h4', correct: false, concept: 'installed-apps-vs-startup-config',
        label: 'A recently installed program is the cause',
        explanation: 'Installed Applications showed nothing new or unusual. The problem is what\u2019s CONFIGURED to launch at boot, not a program that was recently added \u2014 those are different things to check.'
      }
    ],
    remediation: 'Disable or stagger the non-essential startup applications \u2014 start with the redundant cloud-sync clients and the legacy antivirus agent, which likely duplicates the primary AV\u2019s real-time scanning. Re-check Task Manager after the next login to confirm disk utilization drops back to normal within the first minute.'
  },

  {
    id: 'lab-002',
    objective: 'networking',
    ticketNumber: 'INC-10488',
    userReport: 'My laptop shows connected to Wi-Fi, but I can\u2019t get to any websites. It was working fine yesterday.',
    evidence: [
      {
        id: 'ipconfig', label: 'Run ipconfig /all', relevant: true,
        reveal: 'IPv4 Address: 169.254.83.12   Subnet Mask: 255.255.0.0   Default Gateway: (none listed)',
        note: 'A 169.254.x.x address is an APIPA address \u2014 the machine never got a real lease from DHCP, so it fell back to self-assigning one. No gateway means no way out to the internet at all.'
      },
      {
        id: 'ping-gateway', label: 'Ping the default gateway', relevant: true,
        reveal: 'No gateway address is configured to ping \u2014 the request has nowhere to go.',
        note: 'Confirms there\u2019s no valid gateway on this device at all, consistent with never having received a DHCP lease.'
      },
      {
        id: 'other-devices', label: 'Check whether other devices on the same network can get online', relevant: true,
        reveal: 'A phone and another laptop on the same Wi-Fi network both browse normally with no issues.',
        note: 'This isolates the problem to THIS device \u2014 the router and ISP connection are fine, so the cause is local to this machine\u2019s network configuration.'
      },
      {
        id: 'update-history', label: 'Check recent Windows Update history', relevant: true,
        reveal: 'A network adapter driver update installed automatically overnight, timestamped a few hours before the user first noticed the issue.',
        note: 'Timing lines up closely with when the symptom started \u2014 a driver update disrupting the adapter\u2019s ability to complete DHCP is a very plausible trigger here.'
      },
      {
        id: 'nslookup', label: 'Run nslookup google.com', relevant: false,
        reveal: 'Query times out \u2014 no response from any DNS server.',
        note: 'Expected given there\u2019s no valid IP configuration at all \u2014 this is a downstream symptom of the APIPA address, not a separate DNS-specific problem to chase.'
      },
      {
        id: 'wifi-password', label: 'Re-verify the Wi-Fi password with the user', relevant: false,
        reveal: 'The device shows as connected/associated to the correct network \u2014 no authentication prompt or error.',
        note: 'The device is already associated to the access point \u2014 authentication isn\u2019t the problem, so this doesn\u2019t move the investigation forward.'
      }
    ],
    hypotheses: [
      {
        id: 'h1', correct: true, concept: 'dhcp-lease-failure',
        label: 'The device failed to obtain a DHCP lease \u2014 likely caused by the overnight driver update',
        explanation: 'The 169.254.x.x APIPA address with no gateway is the direct signature of a failed DHCP lease. Other devices getting online fine rules out the router/ISP, and the timing of the overnight driver update lines up as the likely trigger for the adapter failing to complete DHCP.'
      },
      {
        id: 'h2', correct: false, concept: 'isp-outage-vs-local-config',
        label: 'The ISP or router is down',
        explanation: 'Other devices on the same network are browsing normally \u2014 if the router or ISP connection were down, every device would be affected, not just this one.'
      },
      {
        id: 'h3', correct: false, concept: 'dns-vs-ip-configuration',
        label: 'DNS servers are misconfigured',
        explanation: 'The device never obtained a real IP configuration at all (it self-assigned an APIPA address) \u2014 DNS resolution failing is a downstream symptom of that, not a separate misconfigured-DNS-server problem to fix on its own.'
      },
      {
        id: 'h4', correct: false, concept: 'wifi-auth-vs-ip-configuration',
        label: 'The Wi-Fi password is wrong or expired',
        explanation: 'The device is already associated to the correct network with no authentication error \u2014 a bad password would prevent the device from connecting at all, not just prevent internet access after connecting.'
      }
    ],
    remediation: 'Release and renew the DHCP lease (ipconfig /release, then ipconfig /renew) and confirm with ipconfig /all that a valid, non-APIPA address and gateway come back. If the release/renew doesn\u2019t resolve it, roll back the overnight network adapter driver to the previous version, since its timing lines up with the failure, then retry DHCP.'
  },

  {
    id: 'lab-003',
    objective: 'operating-systems',
    ticketNumber: 'INC-10512',
    userReport: 'My computer restarts into a blue screen every time I turn it on. This started right after it installed an update last night.',
    evidence: [
      {
        id: 'safe-mode', label: 'Attempt to boot into Safe Mode', relevant: true,
        reveal: 'The machine boots into Safe Mode successfully with no crash.',
        note: 'Safe Mode loads only core drivers. Booting fine there while normal mode crashes strongly suggests a driver or software conflict, not a hardware failure \u2014 the same hardware works fine with fewer drivers loaded.'
      },
      {
        id: 'event-viewer-safe', label: 'Check Event Viewer from within Safe Mode', relevant: true,
        reveal: 'The most recent System log entry before each crash references the display driver file.',
        note: 'This points directly at the display driver as the component involved in the crash \u2014 a strong lead to follow.'
      },
      {
        id: 'update-history', label: 'Check Windows Update history', relevant: true,
        reveal: 'A display driver update installed automatically last night, matching the timing the user described.',
        note: 'Confirms a driver update happened at exactly the time the symptom started \u2014 corroborates the Event Viewer lead rather than being a coincidence.'
      },
      {
        id: 'memory-diagnostic', label: 'Run the Windows Memory Diagnostic tool', relevant: true,
        reveal: 'Completes with no errors detected across all passes.',
        note: 'Rules out faulty RAM as the cause \u2014 a common blue-screen suspect, but not the one here.'
      },
      {
        id: 'disk-health', label: 'Check Disk Health (SMART status)', relevant: true,
        reveal: 'Drive passes its SMART self-test cleanly.',
        note: 'Rules out a failing disk as the cause of the crash.'
      },
      {
        id: 'physical-connections', label: 'Reseat and check physical internal connections', relevant: false,
        reveal: 'No loose cables or connections found; nothing changed.',
        note: 'Not useful here \u2014 the fact that Safe Mode boots fine with the same physical hardware already argues against a physical/connection fault.'
      }
    ],
    hypotheses: [
      {
        id: 'h1', correct: true, concept: 'driver-conflict-vs-hardware-failure',
        label: 'A recently installed display driver update is incompatible or corrupted',
        explanation: 'Safe Mode boots cleanly (it doesn\u2019t load the display driver the same way), Event Viewer points at the display driver file specifically, and the timing matches an overnight driver update \u2014 memory and disk both check out clean, so this isn\u2019t a hardware fault.'
      },
      {
        id: 'h2', correct: false, concept: 'ram-failure-vs-driver-conflict',
        label: 'Faulty RAM is causing the crash',
        explanation: 'The Memory Diagnostic completed with no errors across all passes \u2014 if RAM were the cause, this test is specifically designed to catch that.'
      },
      {
        id: 'h3', correct: false, concept: 'disk-failure-vs-driver-conflict',
        label: 'The hard drive is failing',
        explanation: 'SMART status came back clean. A failing drive would typically also cause slow boots or file errors even in Safe Mode \u2014 neither is present here.'
      },
      {
        id: 'h4', correct: false, concept: 'hardware-fault-vs-driver-conflict',
        label: 'A loose internal connection or overheating hardware fault',
        explanation: 'No loose connections were found, and the machine boots fine into Safe Mode on the exact same physical hardware \u2014 a physical hardware fault wouldn\u2019t disappear just because fewer drivers loaded.'
      }
    ],
    remediation: 'Boot into Safe Mode, roll back or uninstall the display driver that updated overnight (Device Manager \u2192 Display adapters \u2192 Roll Back Driver, or uninstall and let Windows reinstall a known-good version), then reboot normally to confirm the machine boots cleanly. If rollback isn\u2019t available, download the latest stable driver directly from the GPU vendor instead of relying on the Windows Update version.'
  }
];
