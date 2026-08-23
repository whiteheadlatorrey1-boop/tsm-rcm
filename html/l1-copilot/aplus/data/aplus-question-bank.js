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
  },

  /* ---- additional coverage for existing domains ---- */
  {
    id: 'net-diag-003',
    objective: 'networking',
    scenario: 'A user can reach the internal file server by typing its IP address, but connecting by its hostname fails. No other users report a problem.',
    question: 'What should the technician check first?',
    choices: [
      { id: 'A', text: 'This workstation\u2019s DNS server setting and hosts file', correct: true, concept: 'dns-vs-connectivity',
        whatItDoes: 'Confirms which DNS server the workstation is configured to use, and whether a stale/incorrect hosts file entry is overriding normal resolution.',
        whySomeoneMightChooseIt: 'It directly targets what\u2019s different about this one machine versus everyone else.',
        whyCorrect: 'Working by IP but not by name, on one machine only, is a classic single-workstation DNS misconfiguration or hosts-file override — not a server-wide problem.',
        whenItWouldBeCorrect: 'Any time name resolution fails for one machine while raw IP connectivity works fine there.' },
      { id: 'B', text: 'Replace the network cable', correct: false, concept: 'dns-vs-connectivity',
        whatItDoes: 'Swaps the physical cable connecting the workstation to the network.',
        whySomeoneMightChooseIt: 'Cabling is a common first guess for "can\u2019t connect" issues.',
        whyIncorrect: 'The workstation clearly has working IP connectivity (it reaches the server by address) — a bad cable would break that too, not just name resolution.',
        whenItWouldBeCorrect: 'Appropriate when the symptom is no connectivity at all, not a resolution-only failure.' },
      { id: 'C', text: 'Restart the file server', correct: false, concept: 'dns-vs-connectivity',
        whatItDoes: 'Reboots the server the user is trying to reach.',
        whySomeoneMightChooseIt: 'Restarting the target machine is a common general troubleshooting reflex.',
        whyIncorrect: 'Other users are unaffected, which rules out a server-side problem — restarting it wouldn\u2019t change anything for this one workstation.',
        whenItWouldBeCorrect: 'Reasonable if every user were reporting the same failure, pointing at the server itself.' },
      { id: 'D', text: 'Check firewall rules on the server', correct: false, concept: 'dns-vs-connectivity',
        whatItDoes: 'Reviews what inbound traffic the server\u2019s firewall allows.',
        whySomeoneMightChooseIt: 'Firewall misconfiguration is a reasonable-sounding cause for a connection failing under specific conditions.',
        whyIncorrect: 'IP-based access already works, meaning the firewall is letting this workstation through fine — the failure is isolated to name resolution, not access.',
        whenItWouldBeCorrect: 'Worth checking if IP-based access were also failing or inconsistent, not just hostname access.' }
    ]
  },
  {
    id: 'hw-002',
    objective: 'hardware',
    scenario: 'A laptop shows no lights, no fan spin, and no response at all when the power button is pressed — even with the original power adapter plugged in.',
    question: 'What should the technician verify first?',
    choices: [
      { id: 'A', text: 'The power delivery chain itself: try a different known-good outlet and adapter', correct: true, concept: 'power-delivery-diagnosis',
        whatItDoes: 'Isolates whether power is actually reaching the laptop by testing the outlet and adapter independently of the laptop itself.',
        whySomeoneMightChooseIt: 'A completely dead laptop with zero signs of life points at power before anything internal.',
        whyCorrect: 'Zero lights and zero fan spin means the machine isn\u2019t getting power at all — before assuming an internal hardware failure, rule out the cheap, common causes: a dead outlet or a failed adapter/cable.',
        whenItWouldBeCorrect: 'This is the right first check any time symptoms are "completely dead," not partial (e.g. lights on but no boot).' },
      { id: 'B', text: 'Replace the motherboard', correct: false, concept: 'power-delivery-diagnosis',
        whatItDoes: 'Swaps the laptop\u2019s main board entirely.',
        whySomeoneMightChooseIt: 'A totally unresponsive machine can feel like it must be a major internal failure.',
        whyIncorrect: 'This skips every cheaper, faster check — a dead outlet or bad adapter produces the exact same symptom and costs nothing to rule out first.',
        whenItWouldBeCorrect: 'Justified only after confirming power is actually reaching the laptop and it still won\u2019t respond.' },
      { id: 'C', text: 'Replace the RAM', correct: false, concept: 'power-delivery-diagnosis',
        whatItDoes: 'Swaps the memory modules.',
        whySomeoneMightChooseIt: 'RAM is a common general hardware suspect.',
        whyIncorrect: 'Bad RAM typically still allows some sign of life (fan spin, power light, beep codes) — zero response at all points further upstream, at power delivery.',
        whenItWouldBeCorrect: 'More appropriate for symptoms like POST beep codes or random crashes, not a machine with absolutely no signs of power.' },
      { id: 'D', text: 'Reinstall the operating system', correct: false, concept: 'power-delivery-diagnosis',
        whatItDoes: 'Wipes and reinstalls the OS.',
        whySomeoneMightChooseIt: 'Reinstalling the OS is a common general fix reflex.',
        whyIncorrect: 'A machine with no lights and no fan spin never gets far enough to load an OS — this step is irrelevant until the machine can even power on.',
        whenItWouldBeCorrect: 'Relevant only once the machine powers on but fails to boot into Windows correctly.' }
    ]
  },
  {
    id: 'os-002',
    objective: 'operating-systems',
    scenario: 'A user\u2019s Windows desktop has shut down unexpectedly three times this week. The user can\u2019t describe what was happening each time.',
    question: 'Which built-in tool should the technician check first to find the root cause?',
    choices: [
      { id: 'A', text: 'Event Viewer', correct: true, concept: 'system-logs-tools',
        whatItDoes: 'Displays detailed system, application, and security logs, including error codes and timestamps around shutdowns and crashes.',
        whySomeoneMightChooseIt: 'It directly answers "what happened right before this kept shutting down."',
        whyCorrect: 'When the user can\u2019t describe the symptoms, the system\u2019s own logs are the objective record of what happened at each shutdown — Event Viewer is built specifically to capture that.',
        whenItWouldBeCorrect: 'Any time you need a historical record of system errors, not just the current live state.' },
      { id: 'B', text: 'Task Manager', correct: false, concept: 'system-logs-tools',
        whatItDoes: 'Shows currently running processes and real-time resource usage.',
        whySomeoneMightChooseIt: 'It\u2019s the most familiar general-purpose diagnostic tool.',
        whyIncorrect: 'Task Manager only shows what\u2019s happening right now — it has no record of what happened during past shutdowns.',
        whenItWouldBeCorrect: 'Useful for diagnosing a live performance problem happening in front of you, not a historical, intermittent one.' },
      { id: 'C', text: 'Disk Cleanup', correct: false, concept: 'system-logs-tools',
        whatItDoes: 'Removes temporary files and frees up disk space.',
        whySomeoneMightChooseIt: 'It\u2019s a common general maintenance tool technicians reach for.',
        whyIncorrect: 'It has nothing to do with diagnosing a crash cause — it only manages disk space.',
        whenItWouldBeCorrect: 'Appropriate when the actual problem is low disk space, not unexplained shutdowns.' },
      { id: 'D', text: 'System Restore', correct: false, concept: 'system-logs-tools',
        whatItDoes: 'Reverts system files and settings to an earlier restore point.',
        whySomeoneMightChooseIt: 'It feels like a reasonable fix attempt for unexplained instability.',
        whyIncorrect: 'It\u2019s a fix, not a diagnostic — using it before finding the actual cause means you might "fix" the symptom without ever learning what caused it, or roll back something unrelated.',
        whenItWouldBeCorrect: 'Appropriate once Event Viewer or another diagnostic has identified a specific recent change (like a bad driver) as the cause.' }
    ]
  },

  /* ---- Mobile Devices ---- */
  {
    id: 'mobile-001',
    objective: 'mobile-devices',
    scenario: 'A user reports their phone\u2019s battery drains far faster than usual, starting a few days ago. No new hardware was added.',
    question: 'What should the technician check first?',
    choices: [
      { id: 'A', text: 'Per-app battery usage in Settings', correct: true, concept: 'mobile-battery-diagnosis',
        whatItDoes: 'Shows which installed apps have consumed the most battery over a given period.',
        whySomeoneMightChooseIt: 'It directly identifies what changed — a specific app suddenly consuming excess power — without guessing.',
        whyCorrect: 'A sudden battery-life change with no hardware change points at software behavior; per-app battery usage shows exactly which app to investigate first, before anything more drastic.',
        whenItWouldBeCorrect: 'The right first step any time battery drain is the symptom and the cause isn\u2019t already obvious.' },
      { id: 'B', text: 'Factory reset the device', correct: false, concept: 'mobile-battery-diagnosis',
        whatItDoes: 'Wipes the device back to its original out-of-box state.',
        whySomeoneMightChooseIt: 'It feels like a guaranteed fix for "something changed and now it\u2019s misbehaving."',
        whyIncorrect: 'It\u2019s destructive and skips diagnosis entirely — the actual cause (one misbehaving app) might be fixable in seconds once identified, without losing any data.',
        whenItWouldBeCorrect: 'Justified only after simpler diagnosis and fixes (checking/uninstalling the offending app) have failed.' },
      { id: 'C', text: 'Replace the battery', correct: false, concept: 'mobile-battery-diagnosis',
        whatItDoes: 'Physically swaps the battery for a new one.',
        whySomeoneMightChooseIt: 'Battery drain sounds like it should be a battery problem.',
        whyIncorrect: 'A sudden change over a few days points at software behavior, not gradual battery wear — physical battery degradation is usually slow and steady, not a sudden new symptom.',
        whenItWouldBeCorrect: 'Appropriate when battery health diagnostics show significant capacity degradation, or drain has worsened gradually over many months.' },
      { id: 'D', text: 'Disable Wi-Fi', correct: false, concept: 'mobile-battery-diagnosis',
        whatItDoes: 'Turns off the device\u2019s wireless networking radio.',
        whySomeoneMightChooseIt: 'Radios are a known battery consumer, so disabling one seems like a safe troubleshooting step.',
        whyIncorrect: 'It\u2019s a blind guess that doesn\u2019t identify the actual cause, and removes useful functionality in the process.',
        whenItWouldBeCorrect: 'Reasonable only as a temporary isolation test if per-app usage already pointed at network-heavy behavior.' }
    ]
  },
  {
    id: 'mobile-002',
    objective: 'mobile-devices',
    scenario: 'A phone charges slowly and inconsistently with a third-party replacement cable, but charges quickly and reliably with the original cable that came with the device.',
    question: 'What is the most likely cause?',
    choices: [
      { id: 'A', text: 'The replacement cable doesn\u2019t support the phone\u2019s fast-charging spec', correct: true, concept: 'mobile-charging-hardware',
        whatItDoes: 'Identifies a mismatch between the cable\u2019s power/data capability and what the phone needs for full-speed charging.',
        whySomeoneMightChooseIt: 'It directly explains why swapping only the cable changes the symptom.',
        whyCorrect: 'Since the original cable works fine and only the cable changed, the simplest explanation is the replacement cable itself — not every cable supports the same charging speed or wattage.',
        whenItWouldBeCorrect: 'Any time symptoms change specifically when the cable changes and nothing else does.' },
      { id: 'B', text: 'Damaged charging port on the phone', correct: false, concept: 'mobile-charging-hardware',
        whatItDoes: 'A physically worn or damaged port that makes poor contact with a plug.',
        whySomeoneMightChooseIt: 'Charging problems often do turn out to be a port issue.',
        whyIncorrect: 'The original cable charges quickly and reliably in the same port — that rules out the port itself as the cause.',
        whenItWouldBeCorrect: 'Likely if charging were inconsistent with every cable, including the original.' },
      { id: 'C', text: 'The battery is failing', correct: false, concept: 'mobile-charging-hardware',
        whatItDoes: 'A battery that has degraded and can\u2019t hold or accept charge normally.',
        whySomeoneMightChooseIt: 'Charging problems are a natural first association with battery health.',
        whyIncorrect: 'A failing battery would affect charging with any cable, including the original — the fact that only the replacement cable is slow points elsewhere.',
        whenItWouldBeCorrect: 'More likely if charging were slow/unreliable regardless of which cable is used.' },
      { id: 'D', text: 'An OS update is needed', correct: false, concept: 'mobile-charging-hardware',
        whatItDoes: 'Updates the phone\u2019s operating system to the latest version.',
        whySomeoneMightChooseIt: 'Software updates are a common general troubleshooting suggestion.',
        whyIncorrect: 'This is a physical charging-hardware symptom tied specifically to which cable is used — an OS update wouldn\u2019t change what a cable is physically capable of.',
        whenItWouldBeCorrect: 'Relevant if the symptom were software-driven, like the OS mismanaging charging behavior regardless of cable.' }
    ]
  },

  /* ---- Virtualization / Cloud ---- */
  {
    id: 'virt-001',
    objective: 'virtualization-cloud',
    scenario: 'A company wants to run several VMs on a dedicated server with the best possible performance and no general-purpose host OS in the way.',
    question: 'Which type of hypervisor fits this requirement?',
    choices: [
      { id: 'A', text: 'Type 1 (bare-metal) hypervisor', correct: true, concept: 'hypervisor-types',
        whatItDoes: 'Runs directly on the physical hardware, with no host operating system underneath it.',
        whySomeoneMightChooseIt: 'It directly matches "best performance, no host OS in the way."',
        whyCorrect: 'Type 1 hypervisors manage hardware directly, removing the overhead of a full host OS running underneath — exactly the performance profile this scenario asks for.',
        whenItWouldBeCorrect: 'The right choice any time the requirement is dedicated, performance-focused virtualization on server-class hardware.' },
      { id: 'B', text: 'Type 2 (hosted) hypervisor', correct: false, concept: 'hypervisor-types',
        whatItDoes: 'Runs as an application on top of an existing host operating system.',
        whySomeoneMightChooseIt: 'It\u2019s the more familiar type for anyone who\u2019s run a VM on a personal laptop.',
        whyIncorrect: 'It always runs on top of a full host OS, which is exactly the overhead this scenario says to avoid.',
        whenItWouldBeCorrect: 'A good fit for running one or two VMs on a technician\u2019s own desktop or laptop for testing, not dedicated server performance.' },
      { id: 'C', text: 'A container platform', correct: false, concept: 'hypervisor-types',
        whatItDoes: 'Packages and runs applications with their dependencies, sharing the host OS kernel rather than virtualizing full hardware.',
        whySomeoneMightChooseIt: 'Containers are another common way to run isolated workloads, so it\u2019s a reasonable-sounding alternative.',
        whyIncorrect: 'The scenario specifically asks about running VMs, not lightweight application containers — containers solve a different problem.',
        whenItWouldBeCorrect: 'A better fit when the goal is fast, lightweight app deployment rather than full OS-level virtualization.' },
      { id: 'D', text: 'No hypervisor is needed', correct: false, concept: 'hypervisor-types',
        whatItDoes: 'Runs workloads directly on the OS with no virtualization layer at all.',
        whySomeoneMightChooseIt: 'It could seem like the "fastest" option since there\u2019s no virtualization overhead at all.',
        whyIncorrect: 'The scenario explicitly requires running several VMs, which requires a hypervisor of some kind by definition.',
        whenItWouldBeCorrect: 'Only if the requirement didn\u2019t involve VMs at all — running a single OS directly on hardware.' }
    ]
  },
  {
    id: 'virt-002',
    objective: 'virtualization-cloud',
    scenario: 'A cloud provider automatically adds and removes server capacity in a customer\u2019s environment as demand spikes and drops, with no manual request from the customer.',
    question: 'Which cloud characteristic does this describe?',
    choices: [
      { id: 'A', text: 'Rapid elasticity', correct: true, concept: 'cloud-service-characteristics',
        whatItDoes: 'The ability of a cloud environment to automatically scale resources up or down to match real-time demand.',
        whySomeoneMightChooseIt: 'It directly matches the "scales automatically with demand, no manual request" description.',
        whyCorrect: 'Automatic scaling in response to demand — without the customer requesting it each time — is the definition of rapid elasticity.',
        whenItWouldBeCorrect: 'Any scenario describing resources automatically growing or shrinking to match load.' },
      { id: 'B', text: 'Measured service', correct: false, concept: 'cloud-service-characteristics',
        whatItDoes: 'The cloud provider tracks and reports resource usage, typically for billing purposes.',
        whySomeoneMightChooseIt: 'It\u2019s another common cloud vocabulary term that can feel related to "automatic" behavior.',
        whyIncorrect: 'Measured service is about tracking and billing usage — it doesn\u2019t describe automatically scaling capacity.',
        whenItWouldBeCorrect: 'Correct when the scenario describes usage being metered and billed based on consumption.' },
      { id: 'C', text: 'Broad network access', correct: false, concept: 'cloud-service-characteristics',
        whatItDoes: 'Resources are accessible over the network through standard mechanisms from a variety of devices.',
        whySomeoneMightChooseIt: 'It\u2019s a foundational cloud term, so it can feel like a safe general answer.',
        whyIncorrect: 'It\u2019s about accessibility across devices and locations — it has nothing to do with automatically scaling capacity.',
        whenItWouldBeCorrect: 'Correct when the scenario is about accessing cloud resources from many device types or locations.' },
      { id: 'D', text: 'On-demand self-service', correct: false, concept: 'cloud-service-characteristics',
        whatItDoes: 'A customer can provision resources themselves, without needing a person at the provider to act.',
        whySomeoneMightChooseIt: 'It sounds close because it also involves getting resources without waiting on a human — an easy mix-up with elasticity.',
        whyIncorrect: 'On-demand self-service is about the customer manually requesting resources without human intervention from the provider — this scenario is about automatic scaling with no request at all.',
        whenItWouldBeCorrect: 'Correct when a customer provisions a new resource themselves through a portal or API, without a scaling trigger involved.' }
    ]
  },

  /* ---- Hardware & Network Troubleshooting ---- */
  {
    id: 'trbl-001',
    objective: 'troubleshooting',
    scenario: 'A printer prints completely blank pages immediately after a new toner cartridge was installed.',
    question: 'What should the technician check first?',
    choices: [
      { id: 'A', text: 'Whether the protective seal/tab was removed from the new cartridge', correct: true, concept: 'printer-consumables',
        whatItDoes: 'Confirms the manufacturer\u2019s shipping seal, which blocks toner from reaching the drum, has actually been pulled out.',
        whySomeoneMightChooseIt: 'It directly matches "blank pages right after a cartridge swap," the single most common cause of that exact symptom.',
        whyCorrect: 'Blank pages immediately following a cartridge change is the textbook sign of a still-sealed cartridge — it\u2019s the fastest, cheapest thing to check before assuming anything is actually broken.',
        whenItWouldBeCorrect: 'The first check any time blank-page printing starts right after installing a new toner cartridge.' },
      { id: 'B', text: 'Replace the fuser', correct: false, concept: 'printer-consumables',
        whatItDoes: 'Swaps the component that heat-fuses toner onto the page.',
        whySomeoneMightChooseIt: 'A fuser problem is a real cause of print-quality issues, so it\u2019s not an unreasonable guess.',
        whyIncorrect: 'A fuser problem usually causes smearing or fading, not a completely blank page right at the moment a cartridge was swapped — that timing points at the cartridge itself.',
        whenItWouldBeCorrect: 'Worth investigating if print quality issues (smearing, flaking toner) appear unrelated to a recent cartridge change.' },
      { id: 'C', text: 'Reinstall the printer driver', correct: false, concept: 'printer-consumables',
        whatItDoes: 'Removes and reinstalls the software that lets the OS communicate with the printer.',
        whySomeoneMightChooseIt: 'Driver issues are a common general printing-problem suspect.',
        whyIncorrect: 'A driver problem would typically produce garbled output, failed jobs, or errors — not physically blank pages tied to the exact moment a cartridge was replaced.',
        whenItWouldBeCorrect: 'Reasonable if print jobs fail, produce garbled text, or won\u2019t send at all — not for physically blank output.' },
      { id: 'D', text: 'Replace the printer', correct: false, concept: 'printer-consumables',
        whatItDoes: 'Swaps out the entire device.',
        whySomeoneMightChooseIt: 'It can feel like the surest fix when printing looks completely broken.',
        whyIncorrect: 'This skips the cheapest, most likely cause entirely — a sealed cartridge — and is a costly, unnecessary step before that\u2019s even been ruled out.',
        whenItWouldBeCorrect: 'Justified only after consumables, connections, and driver have all been confirmed fine and the problem persists.' }
    ]
  },
  {
    id: 'trbl-002',
    objective: 'troubleshooting',
    scenario: 'A newly installed SSD is visible in BIOS/UEFI but does not appear in File Explorer.',
    question: 'What does the drive need before it will show up and be usable?',
    choices: [
      { id: 'A', text: 'Initialize and format the disk in Disk Management', correct: true, concept: 'disk-initialization',
        whatItDoes: 'Initializes a new, unformatted drive with a partition style, then creates a formatted volume the OS can mount and assign a letter to.',
        whySomeoneMightChooseIt: 'It directly explains why BIOS sees the hardware but Windows doesn\u2019t show it as a usable drive.',
        whyCorrect: 'BIOS detecting the drive confirms the hardware connection is fine — a brand-new drive simply has no partition or file system yet, so Disk Management is where it gets initialized and formatted before Windows will show it.',
        whenItWouldBeCorrect: 'The expected next step any time a new, unused drive is detected by BIOS but missing from the OS.' },
      { id: 'B', text: 'Replace the SATA cable', correct: false, concept: 'disk-initialization',
        whatItDoes: 'Swaps the physical data cable connecting the drive.',
        whySomeoneMightChooseIt: 'Cable issues are a common cause of drives not being detected at all.',
        whyIncorrect: 'BIOS already sees the drive, which confirms the physical connection is working — a cable problem would prevent BIOS detection too.',
        whenItWouldBeCorrect: 'Appropriate if BIOS itself didn\u2019t detect the drive at all.' },
      { id: 'C', text: 'Reinstall the operating system', correct: false, concept: 'disk-initialization',
        whatItDoes: 'Wipes and reinstalls Windows.',
        whySomeoneMightChooseIt: 'It can feel like a broad, safe fix when a drive "isn\u2019t working right."',
        whyIncorrect: 'This is unrelated to a brand-new secondary drive needing initialization — it doesn\u2019t touch the drive\u2019s partition/format state at all.',
        whenItWouldBeCorrect: 'Relevant only if the OS itself were corrupted — unrelated to a new drive not appearing.' },
      { id: 'D', text: 'RMA the drive as defective', correct: false, concept: 'disk-initialization',
        whatItDoes: 'Returns the drive to the manufacturer as faulty.',
        whySomeoneMightChooseIt: 'Not appearing in File Explorer can look like a hardware defect at first glance.',
        whyIncorrect: 'A drive that BIOS can see and identify correctly is functioning — the missing step is a routine one (initialize/format), not a hardware fault.',
        whenItWouldBeCorrect: 'Justified only if BIOS also fails to detect the drive, or it fails after being properly initialized.' }
    ]
  },

  /* ---- Security ---- */
  {
    id: 'sec-001',
    objective: 'security',
    scenario: 'An employee clicks a link in an urgent-sounding email claiming their account will be locked unless they "verify" their password immediately. Their email account is compromised shortly after.',
    question: 'What type of attack does this describe?',
    choices: [
      { id: 'A', text: 'Phishing', correct: true, concept: 'phishing-recognition',
        whatItDoes: 'A social-engineering attack that uses a deceptive message to trick someone into revealing credentials or taking a harmful action.',
        whySomeoneMightChooseIt: 'It directly matches the described tactic: a fake urgent message tricking someone into handing over a password.',
        whyCorrect: 'Manufactured urgency plus a fake "verify your password" request is the classic phishing pattern — deceiving the user directly rather than attacking a system.',
        whenItWouldBeCorrect: 'Any scenario involving a deceptive message convincing someone to voluntarily hand over credentials or click something harmful.' },
      { id: 'B', text: 'Ransomware', correct: false, concept: 'phishing-recognition',
        whatItDoes: 'Malicious software that encrypts a victim\u2019s files and demands payment to restore access.',
        whySomeoneMightChooseIt: 'Both are common "attack" answer choices and can blur together as generic cyberattacks.',
        whyIncorrect: 'There\u2019s no mention of files being encrypted or a ransom demand here — this scenario is about tricking someone into giving up a password, not locking their files.',
        whenItWouldBeCorrect: 'Correct if the scenario described files becoming encrypted with a payment demand to unlock them.' },
      { id: 'C', text: 'On-path (man-in-the-middle) attack', correct: false, concept: 'phishing-recognition',
        whatItDoes: 'An attacker secretly intercepts and possibly alters communication between two parties who believe they\u2019re talking directly to each other.',
        whySomeoneMightChooseIt: 'It\u2019s another security term involving compromised credentials, so it can seem plausible.',
        whyIncorrect: 'This scenario is about the user being deceived directly by a fake message — nothing here describes an attacker secretly intercepting existing communication.',
        whenItWouldBeCorrect: 'Correct if traffic between the user and a legitimate service were being silently intercepted or altered in transit.' },
      { id: 'D', text: 'Brute-force attack', correct: false, concept: 'phishing-recognition',
        whatItDoes: 'Repeatedly guessing passwords systematically until one works.',
        whySomeoneMightChooseIt: 'It\u2019s a familiar password-related attack, easy to associate with "account got compromised."',
        whyIncorrect: 'The password here was voluntarily given away by the user through deception — no repeated guessing was involved.',
        whenItWouldBeCorrect: 'Correct if the account were compromised by an attacker systematically trying many password combinations.' }
    ]
  },
  {
    id: 'sec-002',
    objective: 'security',
    scenario: 'A company wants to ensure that if an employee\u2019s laptop is lost or stolen, the data on its drive can\u2019t be read even if the drive is removed and connected to another computer.',
    question: 'Which mitigation actually addresses this?',
    choices: [
      { id: 'A', text: 'Full-disk encryption', correct: true, concept: 'data-at-rest-protection',
        whatItDoes: 'Encrypts the entire contents of the drive so the data is unreadable without the correct decryption key, regardless of how the drive is accessed.',
        whySomeoneMightChooseIt: 'It directly addresses the specific threat: reading data by pulling the drive out entirely.',
        whyCorrect: 'Since the drive could be physically removed and read on another machine, the login screen alone provides no protection — only encrypting the data itself keeps it unreadable no matter how it\u2019s accessed.',
        whenItWouldBeCorrect: 'The right control any time the concern is protecting data at rest against physical theft of the device or drive.' },
      { id: 'B', text: 'A strong login password only', correct: false, concept: 'data-at-rest-protection',
        whatItDoes: 'Requires a password to log into the operating system on that machine.',
        whySomeoneMightChooseIt: 'It feels like reasonable protection since it stops casual access to the laptop.',
        whyIncorrect: 'A login password only protects access through the OS itself — it does nothing once the drive is removed and connected to a different computer, which bypasses it entirely.',
        whenItWouldBeCorrect: 'Reasonable as a basic access control, but not sufficient for the specific "drive removed and read elsewhere" threat described here.' },
      { id: 'C', text: 'A BIOS/UEFI password only', correct: false, concept: 'data-at-rest-protection',
        whatItDoes: 'Requires a password to access BIOS/UEFI settings or, in some configurations, to boot the machine at all.',
        whySomeoneMightChooseIt: 'It sounds like a deeper layer of protection than a login password, so it can seem sufficient.',
        whyIncorrect: 'It protects the boot process on that specific machine, but does nothing to protect data once the physical drive is removed and connected elsewhere.',
        whenItWouldBeCorrect: 'Useful as one layer of defense against unauthorized boot attempts, but not a substitute for encrypting the data itself.' },
      { id: 'D', text: 'Antivirus software', correct: false, concept: 'data-at-rest-protection',
        whatItDoes: 'Detects and removes malicious software on a running system.',
        whySomeoneMightChooseIt: 'It\u2019s a very common general security answer.',
        whyIncorrect: 'Antivirus protects against malware on a running system — it has no bearing on data readable directly off a physically removed drive.',
        whenItWouldBeCorrect: 'Relevant to protecting against malware infection, not physical data theft from a removed drive.' }
    ]
  },

  /* ---- Software Troubleshooting ---- */
  {
    id: 'swtbl-001',
    objective: 'software-troubleshooting',
    scenario: 'A Windows PC started showing repeated blue screens referencing the same driver file, starting right after a new graphics card was installed.',
    question: 'What is the most appropriate first troubleshooting step?',
    choices: [
      { id: 'A', text: 'Boot into Safe Mode and roll back or update the graphics driver', correct: true, concept: 'driver-crash-troubleshooting',
        whatItDoes: 'Loads Windows with minimal drivers so the technician can safely update or revert the specific driver named in the crash.',
        whySomeoneMightChooseIt: 'It directly targets the named cause (the specific driver file) with the least disruptive fix available.',
        whyCorrect: 'The crash references a specific driver and the timing lines up exactly with new hardware — Safe Mode lets you address that driver directly without the faulty one loading and crashing the system again.',
        whenItWouldBeCorrect: 'The right first move any time a crash log names a specific driver and the timing matches a recent hardware/driver change.' },
      { id: 'B', text: 'Reinstall Windows entirely', correct: false, concept: 'driver-crash-troubleshooting',
        whatItDoes: 'Wipes and reinstalls the operating system from scratch.',
        whySomeoneMightChooseIt: 'Repeated BSODs can feel severe enough to justify starting over completely.',
        whyIncorrect: 'The crash log already names the specific cause — reinstalling the whole OS skips a far faster, far less disruptive fix that\u2019s already been identified.',
        whenItWouldBeCorrect: 'Justified only if driver-level fixes fail to resolve it and deeper OS corruption is suspected.' },
      { id: 'C', text: 'Replace the RAM', correct: false, concept: 'driver-crash-troubleshooting',
        whatItDoes: 'Swaps the memory modules.',
        whySomeoneMightChooseIt: 'RAM issues are a common generic cause of BSODs, so it\u2019s not an unreasonable guess in isolation.',
        whyIncorrect: 'The crash consistently names the same driver file and started right after a GPU install — that\u2019s a specific, identified cause, not the more random pattern typical of failing RAM.',
        whenItWouldBeCorrect: 'More appropriate when BSODs reference varying/random memory-related errors with no clear driver or hardware-change correlation.' },
      { id: 'D', text: 'Run chkdsk on the system drive', correct: false, concept: 'driver-crash-troubleshooting',
        whatItDoes: 'Scans the drive\u2019s file system for errors and bad sectors.',
        whySomeoneMightChooseIt: 'It\u2019s a common general Windows troubleshooting step.',
        whyIncorrect: 'The crash points at a driver, not disk corruption — chkdsk addresses file-system issues, not a graphics driver conflict.',
        whenItWouldBeCorrect: 'Appropriate if symptoms pointed at file/disk corruption rather than a specific driver crash.' }
    ]
  },
  {
    id: 'swtbl-002',
    objective: 'software-troubleshooting',
    scenario: 'An application fails to launch, and Event Viewer shows an error referencing a missing DLL file needed by the program.',
    question: 'What does this error most likely indicate?',
    choices: [
      { id: 'A', text: 'A required shared library/dependency is missing or corrupted — repair or reinstall the application', correct: true, concept: 'missing-dependency-errors',
        whatItDoes: 'Identifies that the application relies on an external shared component that isn\u2019t present or has been damaged, and that reinstalling/repairing typically restores it.',
        whySomeoneMightChooseIt: 'It directly matches the specific error described — a named missing file the app depends on.',
        whyCorrect: 'A missing-DLL error specifically means the application can\u2019t find a required piece it depends on to run — repairing or reinstalling the application (or its runtime) restores that missing component.',
        whenItWouldBeCorrect: 'The expected explanation any time an application-launch failure names a specific missing library file.' },
      { id: 'B', text: 'The hard drive is failing', correct: false, concept: 'missing-dependency-errors',
        whatItDoes: 'A physically degrading drive that can cause read/write errors across the system.',
        whySomeoneMightChooseIt: 'Missing-file errors can superficially resemble the kind of issue a failing drive might cause.',
        whyIncorrect: 'A specific, consistent, named missing DLL points at a software dependency problem, not the more random, spreading corruption pattern typical of failing storage hardware.',
        whenItWouldBeCorrect: 'More likely if errors were inconsistent, affected multiple unrelated files/apps, or came with other failure signs like slow reads or SMART warnings.' },
      { id: 'C', text: 'A malware infection', correct: false, concept: 'missing-dependency-errors',
        whatItDoes: 'Malicious software interfering with normal system or application behavior.',
        whySomeoneMightChooseIt: 'Unexplained software errors are sometimes (understandably) blamed on malware first.',
        whyIncorrect: 'A specific, named missing dependency is the ordinary, mundane explanation here — nothing in the symptom points at malicious interference specifically.',
        whenItWouldBeCorrect: 'Worth investigating if the missing/altered files were unexpected system files, or accompanied by other suspicious behavior.' },
      { id: 'D', text: 'Insufficient RAM', correct: false, concept: 'missing-dependency-errors',
        whatItDoes: 'Not enough available memory to run the application.',
        whySomeoneMightChooseIt: 'Apps failing to launch is sometimes genuinely a memory problem.',
        whyIncorrect: 'A missing-DLL error is specific and unrelated to available memory — a RAM shortage produces different symptoms (slowness, out-of-memory errors), not a named missing file.',
        whenItWouldBeCorrect: 'Relevant if the error specifically referenced insufficient memory rather than naming a missing file.' }
    ]
  },

  /* ---- Operational Procedures ---- */
  {
    id: 'opproc-001',
    objective: 'operational-procedures',
    scenario: 'A technician is about to open a desktop case to work on internal components, in an office with carpeted floors.',
    question: 'What should the technician do first?',
    choices: [
      { id: 'A', text: 'Put on an ESD wrist strap and use an anti-static mat', correct: true, concept: 'esd-safety',
        whatItDoes: 'Safely grounds the technician and the work surface to prevent a static discharge from damaging sensitive internal components.',
        whySomeoneMightChooseIt: 'It directly addresses the elevated static-discharge risk that carpet specifically introduces.',
        whyCorrect: 'Carpet significantly increases static buildup — proper ESD protection before touching internal components is the standard safety step to prevent invisible but real component damage.',
        whenItWouldBeCorrect: 'Standard practice any time internal components will be handled, and especially important in a carpeted environment.' },
      { id: 'B', text: 'Unplug the device and nothing else', correct: false, concept: 'esd-safety',
        whatItDoes: 'Disconnects the power cable before opening the case.',
        whySomeoneMightChooseIt: 'Unplugging the device is a real and necessary safety step, so it can feel sufficient on its own.',
        whyIncorrect: 'Unplugging protects against electrical shock, but does nothing about static discharge — the two are separate risks, and this scenario specifically calls out a carpeted environment where static is the concern.',
        whenItWouldBeCorrect: 'Necessary as one step among several, but insufficient on its own when ESD-sensitive components will be handled.' },
      { id: 'C', text: 'Ground the case once by touching it, then proceed normally', correct: false, concept: 'esd-safety',
        whatItDoes: 'A single momentary discharge of static by touching an unpainted metal surface before starting work.',
        whySomeoneMightChooseIt: 'It\u2019s a commonly known quick habit, so it can feel like "enough."',
        whyIncorrect: 'A single touch only discharges static built up at that moment — continued movement (especially on carpet) keeps regenerating static charge throughout the work, which an ongoing wrist strap connection prevents.',
        whenItWouldBeCorrect: 'Better than nothing as a minimal precaution, but not a substitute for proper ESD protection during extended work on sensitive components.' },
      { id: 'D', text: 'Work near a space heater for comfort', correct: false, concept: 'esd-safety',
        whatItDoes: 'Adds a heat source to the work area.',
        whySomeoneMightChooseIt: 'Comfort while working is a reasonable general consideration.',
        whyIncorrect: 'This is irrelevant to component safety and can actually worsen static buildup by lowering humidity further — the opposite of what\u2019s needed here.',
        whenItWouldBeCorrect: 'Never the correct answer to an ESD-safety question — it doesn\u2019t address the risk at all.' }
    ]
  },
  {
    id: 'opproc-002',
    objective: 'operational-procedures',
    scenario: 'A technician has a box of old laptop batteries and used toner cartridges that need to be disposed of.',
    question: 'What is the proper disposal method?',
    choices: [
      { id: 'A', text: 'Follow local environmental regulations and use designated e-waste/recycling programs', correct: true, concept: 'e-waste-disposal',
        whatItDoes: 'Routes batteries and toner cartridges through proper hazardous-material recycling channels required by local environmental law.',
        whySomeoneMightChooseIt: 'It directly matches the correct, compliant way to handle materials that regulations classify as hazardous.',
        whyCorrect: 'Batteries and toner both contain materials regulated as hazardous waste in most jurisdictions — proper disposal means routing them through designated e-waste/recycling programs, not general trash.',
        whenItWouldBeCorrect: 'The correct answer any time disposal of batteries, toner, or similar regulated materials comes up.' },
      { id: 'B', text: 'Put them in the regular trash', correct: false, concept: 'e-waste-disposal',
        whatItDoes: 'Disposes of items through standard, unsorted waste collection.',
        whySomeoneMightChooseIt: 'It\u2019s the easiest, most convenient option.',
        whyIncorrect: 'Batteries and toner are typically classified as hazardous materials — putting them in regular trash is both an environmental hazard and, in most places, against local regulations.',
        whenItWouldBeCorrect: 'Never appropriate for batteries or toner cartridges specifically.' },
      { id: 'C', text: 'Burn them', correct: false, concept: 'e-waste-disposal',
        whatItDoes: 'Destroys the items through incineration.',
        whySomeoneMightChooseIt: 'It might seem like a way to "get rid of it completely."',
        whyIncorrect: 'Burning batteries or toner releases hazardous chemicals and is dangerous and illegal in virtually every jurisdiction.',
        whenItWouldBeCorrect: 'Never an appropriate disposal method for this material.' },
      { id: 'D', text: 'Leave it for the end user to handle', correct: false, concept: 'e-waste-disposal',
        whatItDoes: 'Passes disposal responsibility to whoever originally used the equipment.',
        whySomeoneMightChooseIt: 'It avoids the technician having to deal with it directly.',
        whyIncorrect: 'Proper disposal of hazardous materials generated during IT work is a professional and often regulatory responsibility of the technician/organization, not something to informally hand off.',
        whenItWouldBeCorrect: 'Not an appropriate answer here — this is the technician\u2019s responsibility to handle correctly.' }
    ]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APLUS_OBJECTIVES, APLUS_QUESTION_BANK };
}
