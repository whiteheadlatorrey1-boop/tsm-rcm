/* ============================================================
   TSM A+ Training Engine — Objective Map + Question Bank
   ------------------------------------------------------------
   Phase 1 data model (see html/l1-copilot/aplus/README.md).
   Original scenarios/questions mapped to CompTIA A+ Core 1/Core 2
   domain areas — not reproduced exam content. Curriculum should be
   re-checked against the current official exam objectives when
   CompTIA revises them; this file only needs its domain labels
   updated, not its structure.

   Every question's `choices` array is the "Answer Intelligence
   Layer": each choice — right or wrong — carries enough to teach
   from, not just a correct/incorrect flag.
   ============================================================ */

const APLUS_OBJECTIVES = {
  core1: [
    { id: 'mobile-devices', label: 'Mobile Devices' },
    { id: 'networking', label: 'Networking' },
    { id: 'hardware', label: 'Hardware' },
    { id: 'virtualization-cloud', label: 'Virtualization / Cloud' },
    { id: 'troubleshooting', label: 'Hardware & Network Troubleshooting' }
  ],
  core2: [
    { id: 'operating-systems', label: 'Operating Systems' },
    { id: 'security', label: 'Security' },
    { id: 'software-troubleshooting', label: 'Software Troubleshooting' },
    { id: 'operational-procedures', label: 'Operational Procedures' }
  ]
};

/* Each choice:
   - id, text, correct
   - whatItDoes: plain technical definition
   - whySomeoneMightChooseIt: the tempting reasoning, even for correct picks
   - whyCorrect / whyIncorrect: exam-reasoning tied to THIS question's wording
   - whenItWouldBeCorrect: the question that WOULD make this choice right
     (present on every choice, correct or not, per the "why is this here" rule)
   - concept: short tag used by the mastery/remediation engine to group
     related wrong answers (e.g. several ping/ipconfig mix-ups all tag
     'network-diagnostic-commands') */
const APLUS_QUESTION_BANK = [
  {
    id: 'net-diag-001',
    objective: 'networking',
    scenario: 'A technician needs to determine a workstation\u2019s current IP address, subnet mask, and default gateway.',
    question: 'Which command should the technician run first?',
    choices: [
      { id: 'A', text: 'ping', correct: false, concept: 'network-diagnostic-commands',
        whatItDoes: 'Sends ICMP echo requests to test whether a destination is reachable over IP.',
        whySomeoneMightChooseIt: 'It\u2019s the most familiar network troubleshooting command, so it feels like a safe first move.',
        whyIncorrect: 'ping tells you whether you can reach a destination — it doesn\u2019t display your own IP configuration.',
        whenItWouldBeCorrect: 'This would be right if the question asked how to test connectivity to the gateway or another host.' },
      { id: 'B', text: 'ipconfig', correct: true, concept: 'network-diagnostic-commands',
        whatItDoes: 'Displays the workstation\u2019s IP address, subnet mask, default gateway, and adapter details.',
        whySomeoneMightChooseIt: 'It directly matches what the question is asking for.',
        whyCorrect: 'The question asks specifically for the current IP configuration — that\u2019s exactly what ipconfig reports.',
        whenItWouldBeCorrect: 'Any question asking "what is my current network configuration" points here.' },
      { id: 'C', text: 'tracert', correct: false, concept: 'network-diagnostic-commands',
        whatItDoes: 'Shows the hop-by-hop route packets take to a destination.',
        whySomeoneMightChooseIt: 'It\u2019s a common network troubleshooting tool, so it can feel relevant by association.',
        whyIncorrect: 'tracert maps a path to a remote destination — it says nothing about this machine\u2019s own configuration.',
        whenItWouldBeCorrect: 'Use this when the question is about where a connection is failing along its route.' },
      { id: 'D', text: 'nslookup', correct: false, concept: 'network-diagnostic-commands',
        whatItDoes: 'Queries DNS to resolve a hostname to an IP address (or vice versa).',
        whySomeoneMightChooseIt: 'It\u2019s another common networking command, easy to reach for when the exact tool isn\u2019t obvious.',
        whyIncorrect: 'nslookup is about DNS resolution, not local IP configuration.',
        whenItWouldBeCorrect: 'This is correct when the question is about whether a hostname resolves correctly.' }
    ]
  },
  {
    id: 'net-diag-002',
    objective: 'networking',
    scenario: 'A user can ping 8.8.8.8 successfully but typing google.com in a browser fails to load.',
    question: 'Which command would confirm the specific cause?',
    choices: [
      { id: 'A', text: 'ipconfig /release', correct: false, concept: 'dns-vs-connectivity',
        whatItDoes: 'Releases the workstation\u2019s current DHCP-assigned IP address.',
        whySomeoneMightChooseIt: 'It sounds like a reasonable "reset" step when something network-related is broken.',
        whyIncorrect: 'This changes the machine\u2019s own addressing — it doesn\u2019t diagnose anything, and could disrupt a connection that\u2019s otherwise fine.',
        whenItWouldBeCorrect: 'Appropriate when you specifically suspect a bad or stale DHCP lease, not a resolution failure.' },
      { id: 'B', text: 'nslookup google.com', correct: true, concept: 'dns-vs-connectivity',
        whatItDoes: 'Queries DNS directly to see whether google.com resolves to an IP address.',
        whySomeoneMightChooseIt: 'It matches the symptom pattern: IP connectivity works, name resolution is the suspect.',
        whyCorrect: 'Reaching a raw IP but failing on a domain name is the textbook DNS-resolution-failure signature — nslookup checks that directly.',
        whenItWouldBeCorrect: 'Any time raw IP connectivity works but name-based access doesn\u2019t.' },
      { id: 'C', text: 'tracert google.com', correct: false, concept: 'dns-vs-connectivity',
        whatItDoes: 'Traces the route to google.com, resolving the name as a side effect.',
        whySomeoneMightChooseIt: 'It touches both routing and resolution, so it feels thorough.',
        whyIncorrect: 'It can hint at a resolution problem if it fails immediately, but it\u2019s built for path/routing diagnosis, not confirming DNS as the root cause.',
        whenItWouldBeCorrect: 'Better suited to "where does the connection stop working along the path" questions.' },
      { id: 'D', text: 'ping google.com', correct: false, concept: 'dns-vs-connectivity',
        whatItDoes: 'Sends ICMP echo requests to whatever google.com resolves to.',
        whySomeoneMightChooseIt: 'It re-uses the tool from the first step of the scenario, which feels consistent.',
        whyIncorrect: 'If DNS is broken, this just fails too — it doesn\u2019t isolate resolution as the specific cause the way a direct DNS query does.',
        whenItWouldBeCorrect: 'Useful as a first symptom check, but not the confirming step once DNS is already the suspect.' }
    ]
  },
  {
    id: 'hw-001',
    objective: 'hardware',
    scenario: 'A desktop intermittently reboots under heavy load. Fans are audibly ramping up right before each reboot.',
    question: 'What should the technician check first?',
    choices: [
      { id: 'A', text: 'CPU temperature and cooler seating', correct: true, concept: 'thermal-shutdown',
        whatItDoes: 'Checks whether the CPU is hitting a thermal shutdown threshold and whether the cooler is properly seated/making contact.',
        whySomeoneMightChooseIt: 'Fans ramping up right before a reboot is the classic audible signature of a thermal event.',
        whyCorrect: 'Load-triggered reboots preceded by fan ramp-up point straight at thermal shutdown — checking temps and cooler contact addresses the likely root cause directly.',
        whenItWouldBeCorrect: 'This is the first check any time symptoms are load-triggered plus audible fan escalation.' },
      { id: 'B', text: 'Reseat the RAM', correct: false, concept: 'thermal-shutdown',
        whatItDoes: 'Confirms the memory modules are fully and correctly seated in their slots.',
        whySomeoneMightChooseIt: 'RAM issues are a common general hardware suspect for instability.',
        whyIncorrect: 'Bad RAM more often causes random crashes/BSODs unrelated to load or audible fan ramp-up — it doesn\u2019t match this specific symptom pattern.',
        whenItWouldBeCorrect: 'Reasonable first step for random crashes or failed POST, not load-correlated shutdowns with a fan symptom.' },
      { id: 'C', text: 'Run a full antivirus scan', correct: false, concept: 'thermal-shutdown',
        whatItDoes: 'Scans the system for malware that could be consuming resources or causing instability.',
        whySomeoneMightChooseIt: 'It\u2019s a reasonable general troubleshooting step for "something is wrong with this computer."',
        whyIncorrect: 'Malware doesn\u2019t typically produce an audible fan ramp-up immediately before a hard reboot — that\u2019s a hardware/thermal signature, not a software one.',
        whenItWouldBeCorrect: 'Appropriate when symptoms are sluggishness, pop-ups, or unexplained network activity — not thermal-pattern reboots.' },
      { id: 'D', text: 'Replace the power supply', correct: false, concept: 'thermal-shutdown',
        whatItDoes: 'Swaps the PSU on the theory that it can\u2019t sustain the system under load.',
        whySomeoneMightChooseIt: 'Reboots under load can also be a power delivery problem, so this isn\u2019t an unreasonable guess.',
        whyIncorrect: 'It\u2019s a valid possibility eventually, but the audible fan-ramp detail specifically points to thermal first — replacing a part before confirming the cause skips a cheaper, faster check.',
        whenItWouldBeCorrect: 'Correct next step if temps check out fine and the reboots still happen under load with no thermal signature.' }
    ]
  },
  {
    id: 'os-001',
    objective: 'operating-systems',
    scenario: 'A user\u2019s Windows machine boots to a black screen with a cursor, no desktop icons or taskbar, after a recent update.',
    question: 'Which of these is the most appropriate first troubleshooting step?',
    choices: [
      { id: 'A', text: 'Reinstall Windows', correct: false, concept: 'explorer-shell-failure',
        whatItDoes: 'Wipes and reinstalls the operating system from scratch.',
        whySomeoneMightChooseIt: 'It feels like a guaranteed fix when something looks this broken.',
        whyIncorrect: 'It\u2019s the most destructive option and skips every cheaper diagnostic step — a black screen with a live cursor is very often just explorer.exe failing to start, not a corrupted OS.',
        whenItWouldBeCorrect: 'Justified only after simpler recovery steps (safe mode, startup repair, restarting explorer.exe) have been tried and failed.' },
      { id: 'B', text: 'Boot into Safe Mode and check if explorer.exe is running', correct: true, concept: 'explorer-shell-failure',
        whatItDoes: 'Loads Windows with a minimal driver/service set and lets the technician check Task Manager for the shell process.',
        whySomeoneMightChooseIt: 'It directly targets the most common cause of this exact symptom.',
        whyCorrect: 'A live cursor with no desktop is the textbook sign that the Explorer shell isn\u2019t starting — Safe Mode isolates whether it\u2019s a shell problem versus a deeper OS/driver fault, before anything destructive is tried.',
        whenItWouldBeCorrect: 'This is the right first move any time symptoms are "cursor but no desktop" after a change like an update or driver install.' },
      { id: 'C', text: 'Replace the hard drive', correct: false, concept: 'explorer-shell-failure',
        whatItDoes: 'Swaps the storage device on the theory that it has failed.',
        whySomeoneMightChooseIt: 'A machine that won\u2019t show a desktop can look like a failed-drive symptom at a glance.',
        whyIncorrect: 'A live, responsive cursor means the OS is loading and the drive is readable — a failed drive usually can\u2019t even get this far.',
        whenItWouldBeCorrect: 'Appropriate when the machine won\u2019t boot at all, or SMART diagnostics/boot logs point to drive failure — not when the desktop simply isn\u2019t rendering.' },
      { id: 'D', text: 'Roll back the most recent Windows Update immediately', correct: false, concept: 'explorer-shell-failure',
        whatItDoes: 'Uninstalls the most recently applied update package.',
        whySomeoneMightChooseIt: 'The timing (right after an update) makes the update a reasonable first suspect.',
        whyIncorrect: 'It\u2019s a fair hypothesis, but jumping straight to a rollback skips confirming the actual cause first — if it\u2019s just an explorer.exe crash, a rollback wouldn\u2019t even be needed.',
        whenItWouldBeCorrect: 'This becomes the right next step once Safe Mode confirms the issue tracks to the update rather than a one-off shell crash.' }
    ]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APLUS_OBJECTIVES, APLUS_QUESTION_BANK };
}
