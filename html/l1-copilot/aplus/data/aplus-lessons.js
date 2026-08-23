/* ============================================================
   TSM A+ Training Engine — Learn Mode content (Phase 2)
   ------------------------------------------------------------
   Conversational concept teaching, one lesson per `concept` tag
   already used in APLUS_QUESTION_BANK (data/aplus-question-bank.js).
   Keeping lessons keyed by the SAME concept ids means Learn Mode
   and the mastery/weak-concept engine are talking about the exact
   same thing — no separate taxonomy to keep in sync.

   Each lesson:
   - objective: which APLUS_OBJECTIVES domain this lives under
   - title: short concept name
   - hook: one or two sentences, plain-language framing of why a
     tech runs into this at all
   - walkthrough: array of short paragraphs, conversational,
     building the concept up step by step (not a wall of text)
   - commonMixup: the specific wrong turn people take here, named
     directly — this is what the paired practice question tests
   - takeaway: one line, the thing to remember on the job

   Original content — not reproduced exam material.
   ============================================================ */

const APLUS_LESSONS = {

  'network-diagnostic-commands': {
    objective: 'networking',
    title: 'Reading a Connection with the Right Command',
    hook: "Every networking ticket starts the same way: something can't reach something else. The fastest techs aren't smarter — they just reach for the right command first instead of guessing.",
    walkthrough: [
      "Think of it as working outward from the machine in front of you. The very first question is always \"does this computer even have a valid network identity?\" — an IP address, a subnet mask, a default gateway. That's what ipconfig answers, instantly, with zero network traffic sent anywhere.",
      "Only after you know the machine's own configuration is sane does it make sense to test reachability — that's ping, sending a packet out and seeing if anything answers.",
      "If ping to an address works but something further along fails, tracert shows you the hop-by-hop path, which is how you find where along the route things break down.",
      "nslookup is a different question entirely — not \"can I reach this,\" but \"what does this name resolve to.\" That distinction matters more than it sounds like it should."
    ],
    commonMixup: "Jumping straight to ping or tracert before confirming the local machine's own IP configuration with ipconfig. If the workstation's own address, mask, or gateway is wrong, every test after that is diagnosing a symptom of that root cause instead of the cause itself.",
    takeaway: "Start with the machine itself (ipconfig) before you start testing the network around it."
  },

  'dns-vs-connectivity': {
    objective: 'networking',
    title: 'Name Resolution vs. Actual Connectivity',
    hook: "\"The internet is down\" almost never means the internet is down. Most of the time it means one specific layer broke, and figuring out which layer is the entire job.",
    walkthrough: [
      "There are really two separate questions hiding inside \"I can't get to that server.\" One is: can this machine reach that IP address at all? The other is: does this machine know what IP address that name even points to?",
      "If pinging an IP address works but browsing to a hostname doesn't, that's the tell — raw connectivity is fine, so the failure lives specifically in name resolution: DNS settings, or a hosts file entry quietly overriding the normal lookup.",
      "That's also why scope matters so much. If it's one workstation only, and other users on the same network reach the same resource fine, the server and the network path are already proven to work — the problem has to be something local to that one machine's resolution setup.",
      "This is the difference between chasing the network (cables, firewalls, the server itself) and chasing the resolver (DNS server setting, hosts file) — and picking the wrong one wastes a lot of time confirming things that were never broken."
    ],
    commonMixup: "Treating 'it works by IP but not by name' as a general connectivity problem and reaching for cables, firewall rules, or restarting the remote server — none of which touches name resolution, which is where the actual fault is.",
    takeaway: "Works by IP, fails by name, on one machine = check DNS settings and the hosts file on that machine first."
  },

  'thermal-shutdown': {
    objective: 'hardware',
    title: 'Heat as a Root Cause, Not a Symptom',
    hook: "A system that reboots under load with the fans audibly screaming right before it happens is telling you exactly what's wrong, if you listen to the pattern instead of jumping to a part swap.",
    walkthrough: [
      "Modern CPUs have a hard thermal limit. Cross it and the system doesn't crash randomly — it protects itself by shutting down immediately, which is why this pattern shows up specifically under heavy load (gaming, rendering, compiling) rather than at idle.",
      "The fans ramping up hard right before the reboot is the hardware fighting to keep the CPU under that limit and losing. That's a very specific signature — it's not the same as a system that reboots randomly regardless of load, which points elsewhere entirely.",
      "So the first check is the thing actually managing that heat: is the cooler properly seated, is there dried-out or missing thermal paste, is a fan actually spinning, is airflow blocked by dust. You're checking the cooling path before touching anything else.",
      "Compare that to the other components on this list — RAM reseating, an antivirus scan, a power supply swap — none of which explain why load and fan noise specifically predict the reboot. They might matter in a different failure pattern, just not this one."
    ],
    commonMixup: "Treating any random reboot as a RAM, malware, or power-supply issue by default, without noticing that THIS pattern (load-triggered, fans screaming right before) is the specific signature of thermal shutdown protection kicking in.",
    takeaway: "Reboots that track with load and loud fans = check cooling (seating, paste, airflow) before anything else."
  },

  'power-delivery-diagnosis': {
    objective: 'hardware',
    title: 'No Lights, No Fans, No Response — Start at the Wall',
    hook: "A completely dead device with zero signs of life feels like it should be a big, scary internal failure. Usually it's the boring thing: power isn't actually reaching the board.",
    walkthrough: [
      "\"No lights, no fan spin, no response at all\" is a specific pattern — it means the device isn't even attempting to power on, which is different from a device that powers on and then fails partway through boot.",
      "That pattern points to the power delivery chain itself, not internal components: the outlet, the power adapter/brick, the cable, the connection at the device. Any one weak link there and nothing downstream ever gets a chance to run.",
      "The reason to check this first, even with the \"original\" adapter plugged in, is that adapters and outlets fail too — \"it's the original charger\" rules out a compatibility problem, not a failed charger or a dead outlet.",
      "Only once you've proven power is actually reaching the device with a different known-good outlet and adapter does it make sense to suspect something internal like the motherboard — jumping there first means potentially replacing an expensive part to fix what might be a five-dollar cable."
    ],
    commonMixup: "Assuming total unresponsiveness means a major internal failure (motherboard, RAM) and reaching for a component swap or OS reinstall before ruling out the much more common and much cheaper cause: the power delivery chain itself.",
    takeaway: "Completely dead with zero response = prove power is actually arriving (different outlet, different adapter) before suspecting internal components."
  },

  'explorer-shell-failure': {
    objective: 'operating-systems',
    title: 'Black Screen With a Cursor Isn\u2019t "The OS Is Gone"',
    hook: "A black screen after boot looks catastrophic. It's actually one of the more diagnosable failures in Windows, because it usually means one specific process didn't start.",
    walkthrough: [
      "The desktop you normally see — icons, taskbar, Start menu — isn't the operating system itself. It's a separate process, explorer.exe, running on top of a Windows install that's already booted successfully underneath it.",
      "A black screen with a working cursor is a strong signal that Windows itself came up fine, but that one shell process either crashed, hung, or failed to launch. That's a much narrower, much more fixable problem than \"Windows is broken.\"",
      "Booting into Safe Mode and checking whether explorer.exe is running (and can be manually restarted via Task Manager) directly tests that theory, cheaply and without touching anything else on the system.",
      "That's why the more drastic options — reinstalling Windows, replacing the hard drive, immediately rolling back the last update — jump way ahead of the evidence. They assume a bigger failure than what the symptom actually points to, and they're much more disruptive if the real fix was just restarting one process."
    ],
    commonMixup: "Treating 'black screen after an update' as proof the update itself is the culprit and immediately rolling it back, or treating it as proof the whole OS install is corrupted and reinstalling — both skip past the cheap, specific check (is explorer.exe actually running?) that the symptom is pointing you toward.",
    takeaway: "Black screen + working cursor = suspect the shell (explorer.exe), not the whole OS, and check that first."
  },

  'system-logs-tools': {
    objective: 'operating-systems',
    title: "When the User Can't Tell You What Happened, the Logs Can",
    hook: "The hardest tickets to start are the ones where the user's description is just \"it crashed\" with no other detail. That's exactly what built-in logging exists for.",
    walkthrough: [
      "Windows keeps a running record of significant system events — errors, warnings, driver failures, unexpected shutdowns — whether or not a human was watching when it happened. That record is Event Viewer.",
      "When a system has shut down unexpectedly multiple times and the user genuinely can't describe a pattern, Event Viewer is where you go looking for what actually happened at those exact timestamps: a specific error code, a specific driver, a specific hardware fault reported by the system itself.",
      "That's a fundamentally different kind of tool than the others on this list. Task Manager shows you what's happening right now, live — it has nothing to say about an event three days ago. Disk Cleanup and System Restore are maintenance/repair actions, not diagnostic tools; using them before you know the cause means you might \"fix\" the wrong thing.",
      "The general pattern worth keeping: if you need to know what happened in the past, you want a log. If you need to know what's happening right now, you want a live monitor. Confusing the two wastes a step."
    ],
    commonMixup: "Reaching for a live tool (Task Manager) or a maintenance action (Disk Cleanup, System Restore) when the actual need is historical — finding out what already happened at three separate points in the past, which only a log like Event Viewer can show you.",
    takeaway: "Unexplained past events → Event Viewer first. Live tools and repair actions come after you know what you're fixing."
  },

  'mobile-battery-diagnosis': {
    objective: 'mobile-devices',
    title: "Battery Drain Has a Cause — Find It Before You Replace Anything",
    hook: "\"My battery got bad all of a sudden\" sounds like a hardware failure. Most of the time it's software behaving badly, and there's a built-in tool that names the exact culprit.",
    walkthrough: [
      "Batteries degrade gradually over many months — that's a slow, predictable curve. A sudden drop in battery life over just a few days, with no new hardware added, doesn't match that curve at all. It matches something changing in software: an app update, a stuck background process, a setting that changed.",
      "Every modern phone tracks per-app battery usage, and it's the fastest way to find the actual cause — one app suddenly hogging far more battery than it used to is a very visible, very specific signal, and it points you straight at what to fix (force-stop it, update it, check its background permissions).",
      "Compare that to the other options: a factory reset or battery replacement are both drastic, disruptive, and — critically — don't tell you WHY it happened, so the same thing could recur. Disabling Wi-Fi treats a guess about the cause rather than checking what's actually consuming power.",
      "The pattern to notice: when a symptom appears suddenly rather than gradually, that's usually your clue that software changed, not that hardware degraded — and the fix should start by confirming that, not by replacing parts."
    ],
    commonMixup: "Treating any battery complaint as a hardware problem and jumping to replacing the battery or factory-resetting the device, instead of using the built-in per-app usage view to see if one specific app is the actual cause — which a factory reset would only accidentally fix, if at all.",
    takeaway: "Sudden battery drain, no new hardware = check per-app usage first; that's usually a software cause, not a dying battery."
  },

  'mobile-charging-hardware': {
    objective: 'mobile-devices',
    title: "Same Phone, Different Result — the Variable Is the Cable",
    hook: "When swapping one part changes the outcome and nothing else does, that part is your answer. It's one of the cleanest diagnostic patterns you'll see.",
    walkthrough: [
      "This scenario is really a controlled experiment the user already ran for you: same phone, same outlet (presumably), two different cables, two different results. The only variable that changed is the cable — so the cable is where the explanation has to live.",
      "Fast charging isn't just \"more power through any cable\" — it requires the cable (and often the adapter) to support a specific charging protocol/spec that negotiates higher power delivery. A cheaper or non-matching replacement cable often lacks that support, so charging falls back to a slower, basic rate.",
      "That's why the phone's charging port, the battery itself, or the OS aren't good explanations here — all three of those would be constants across BOTH cables. A port or battery problem doesn't explain why the original cable works fine and only the replacement struggles.",
      "This is a broader troubleshooting habit worth keeping: when one variable changes and the symptom changes with it, that variable is very likely your cause — and everything that stayed constant across both scenarios is probably not."
    ],
    commonMixup: "Suspecting the phone itself (port, battery, OS) when the phone was the one constant across both tests — the symptom only shows up with the one component that actually changed: the cable.",
    takeaway: "If swapping one part changes the result and everything else stayed the same, that part is your cause — check it first."
  },

  'hypervisor-types': {
    objective: 'virtualization-cloud',
    title: "Bare-Metal vs. Hosted — What's Actually Running Underneath",
    hook: "Every hypervisor question on this exam comes down to one thing: is there a general-purpose OS sitting between the hypervisor and the physical hardware, or not?",
    walkthrough: [
      "A Type 1 (bare-metal) hypervisor installs directly on the physical server hardware — there's no separate Windows or Linux desktop OS underneath it that the hypervisor has to share resources with. The hypervisor IS the lowest layer.",
      "A Type 2 (hosted) hypervisor runs as an application on top of a regular OS — think running virtualization software on your everyday laptop. That extra OS layer underneath adds overhead and is exactly what a dedicated server for VM performance is trying to avoid.",
      "So when a requirement explicitly says \"best possible performance\" and \"no general-purpose host OS in the way,\" that's the exam handing you the definition of Type 1 almost word for word — the phrasing IS the answer if you know what each type actually means structurally.",
      "Containers are a different technology entirely — they virtualize at the OS/application level rather than emulating full separate machines, which is a different trade-off (lighter weight, but not the same isolation model as full VMs). They don't fit a requirement specifically asking about VMs."
    ],
    commonMixup: "Not distinguishing Type 1 from Type 2 by what's structurally underneath them, and instead guessing based on which sounds more \"enterprise\" — when the actual test is simple: is there a host OS layer between the hypervisor and the hardware, or not?",
    takeaway: "No host OS underneath = Type 1 (bare-metal). Running on top of a normal OS = Type 2 (hosted)."
  },

  'cloud-service-characteristics': {
    objective: 'virtualization-cloud',
    title: "The Cloud Characteristics Are Each Answering a Different Question",
    hook: "These terms sound interchangeable until you notice each one is describing a completely different aspect of how cloud service works — and exam scenarios are built to test exactly one at a time.",
    walkthrough: [
      "Rapid elasticity is specifically about scaling automatically with demand — capacity grows and shrinks on its own as load changes, without a human placing a new order each time.",
      "Measured service is about billing/metering — you're charged based on actual consumption, tracked and reported, like a utility bill. It's about the accounting, not the scaling itself.",
      "Broad network access just means the service is reachable over standard networks from a variety of devices — it's an accessibility property, not a scaling or billing property.",
      "On-demand self-service means a customer can provision resources themselves, whenever they want, without needing a human at the provider to process a request. The key word is who initiates it — the customer, unprompted.",
      "The scenario here — capacity being added and removed automatically, with no manual customer request at all — matches rapid elasticity specifically because \"automatic\" and \"no manual request\" both point at scaling behavior, not billing, not accessibility, not who initiates the request."
    ],
    commonMixup: "Picking on-demand self-service for anything that sounds automated, when the actual distinguishing detail is who or what triggers the change. Self-service is the customer asking; elasticity is the system responding on its own to demand, with nobody asking at all.",
    takeaway: "Automatic scaling with demand, no manual request = rapid elasticity. A customer requesting resources themselves = on-demand self-service."
  },

  'printer-consumables': {
    objective: 'troubleshooting',
    title: "New Part Installed, Now It's Broken — Check the Install First",
    hook: "When a problem starts the moment a new consumable goes in, the most likely cause is something about that installation, not a coincidental unrelated failure.",
    walkthrough: [
      "Timing is the whole clue here: blank pages starting immediately after a new toner cartridge was installed, with nothing else changed. That timing strongly suggests the cause is tied to the cartridge itself or its installation, not some unrelated part that happened to fail at the same moment.",
      "New toner cartridges typically ship with a protective seal or pull-tab over the toner opening, specifically to prevent spills in shipping. If that seal never gets removed, toner can't reach the drum or page at all — which produces exactly this symptom: pages feed through fine, but nothing is actually printed on them.",
      "That's a five-second check, and it's why it comes before touching the fuser, the driver, or replacing the whole printer — all three of those were working before the cartridge swap, and nothing in the scenario suggests they suddenly stopped on their own at that exact moment.",
      "The broader habit: when a symptom starts right at a specific change (new part, new install, new update), investigate that specific change first before assuming an unrelated component picked that exact moment to fail."
    ],
    commonMixup: "Jumping to a driver reissue or hardware replacement (fuser, whole printer) when the timing points directly at the thing that just changed — the new cartridge — and a simple physical check (seal removed?) hasn't been ruled out yet.",
    takeaway: "Symptom starts right after installing a new part = check that part's installation first, before suspecting anything else."
  },

  'disk-initialization': {
    objective: 'troubleshooting',
    title: "Visible in BIOS but Not in Windows Isn't a Failure — It's a Missing Step",
    hook: "A brand-new drive not showing up in File Explorer sounds alarming, but BIOS already told you the important thing: the drive is physically fine and detected.",
    walkthrough: [
      "BIOS/UEFI detects a drive at the hardware level — it just needs to see that something responds on that connection. File Explorer, on the other hand, only shows drives that have a partition and file system Windows recognizes.",
      "A brand-new, unused drive has neither of those yet. That's not damage — it's just the normal state of a drive that has never been set up. Disk Management is where you initialize it (choose a partition style) and then create/format a volume so Windows has something it can mount and show you.",
      "That's why this scenario specifically says \"visible in BIOS\" — that detail is doing real work. It's ruling out a dead or disconnected drive (which BIOS wouldn't see either) and pointing you toward a setup step instead of a hardware fault.",
      "Replacing the cable, reinstalling the OS, or RMA'ing the drive as defective would all be reasonable moves if BIOS DIDN'T see the drive. Since it does, those are solving a problem that isn't the one in front of you."
    ],
    commonMixup: "Treating 'not visible in File Explorer' as equivalent to 'not detected at all,' and jumping to cable swaps or an RMA — when BIOS already confirmed the hardware is fine and the drive just hasn't been initialized/formatted yet.",
    takeaway: "New drive seen by BIOS but not by Windows = needs initializing/formatting in Disk Management, not a hardware fix."
  },

  'phishing-recognition': {
    objective: 'security',
    title: "Naming the Attack by What It Actually Does",
    hook: "Security exam questions aren't testing whether you've memorized definitions — they're testing whether you can match a described behavior to the term that actually fits it.",
    walkthrough: [
      "The core mechanic in this scenario is a message designed to create urgency (\"your account will be locked\") that tricks someone into voluntarily handing over credentials on a page or reply that looks legitimate but isn't. That specific mechanic — tricking a person into giving up information — is phishing, by definition.",
      "Ransomware is a different mechanic entirely: it's malicious software that encrypts a victim's files and demands payment. Nothing in this scenario describes files being locked or a ransom demand — there's no software payload doing the damage, there's a person being deceived.",
      "An on-path (man-in-the-middle) attack means an attacker is intercepting communication between two parties who both believe they're talking directly to each other. That requires positioning on the network path — nothing here describes intercepted traffic, just a deceptive message.",
      "Brute-force means repeatedly guessing credentials through automated attempts. This scenario has the opposite mechanic — the credentials weren't guessed, they were voluntarily given up by a tricked user. Matching mechanic to term is the whole skill here."
    ],
    commonMixup: "Picking whichever attack term sounds most dramatic or most familiar, rather than matching the SPECIFIC mechanic described (a person tricked into voluntarily giving up credentials) to the term that actually describes that mechanic (phishing) rather than a different one that happens to also be 'bad.'",
    takeaway: "A person tricked into voluntarily giving up information = phishing. Match the mechanic in the scenario to the term, not the general vibe of 'attack.'"
  },

  'data-at-rest-protection': {
    objective: 'security',
    title: "Protecting Data on a Drive That's No Longer in the Computer",
    hook: "The moment a laptop is stolen, most of its usual protections stop mattering — because the thief isn't logging in through Windows at all.",
    walkthrough: [
      "A login password only protects data if someone is forced to go through the operating system to access it. Pull the physical drive out and connect it to a different computer as an external disk, and that OS login screen is completely bypassed — the files are just sitting there, readable.",
      "The same logic applies to a BIOS/UEFI password: it can restrict booting that specific machine, but it doesn't do anything to protect the drive's contents once removed and read elsewhere. And antivirus software scans for malicious code — it has nothing to do with whether the raw data on a drive is readable.",
      "Full-disk encryption is different because it protects the data itself, not just the path to reach it. The entire drive's contents are unreadable without the decryption key, regardless of what machine the drive is physically connected to or what login screen (if any) stands in front of it.",
      "This is the general distinction the exam is testing: protections that guard the LOGIN PATH (passwords) versus protections that guard the DATA ITSELF (encryption). A stolen/removed drive scenario always favors the second category, because the login path is exactly what gets bypassed."
    ],
    commonMixup: "Assuming a login or BIOS password is 'good enough' security, without recognizing that removing the physical drive entirely bypasses both — they protect the path INTO the machine, not the data sitting on the disk itself.",
    takeaway: "Lost or stolen drive scenarios need full-disk encryption — passwords only protect the login path, which physical removal completely sidesteps."
  },

  'driver-crash-troubleshooting': {
    objective: 'software-troubleshooting',
    title: "A Named Driver in a Blue Screen Is Pointing Right at the Fix",
    hook: "Blue screens feel like a black box, but Windows usually tells you exactly what crashed. The skill is reading that clue instead of skipping past it.",
    walkthrough: [
      "This scenario has two strong clues stacked together: the blue screens reference the SAME driver file every time, and they started right after a new graphics card was installed. That's not a vague, random instability pattern — it's a specific, repeatable one pointing at one specific piece of software: the new GPU's driver.",
      "Booting into Safe Mode matters here because Safe Mode loads a minimal driver set — including a generic display driver instead of the potentially broken one — which lets you actually get into Windows to roll back or update the problematic driver without it crashing the session again.",
      "Reinstalling Windows entirely, replacing RAM, or running chkdsk all treat this as a much bigger, vaguer problem than the evidence supports. None of those three specifically addresses a named driver crashing right after a specific hardware change — they're solutions to different problems.",
      "The pattern worth internalizing: a crash log naming the SAME component repeatedly, right after a change involving that exact component, is about as direct a diagnostic pointer as you'll get. Follow it before escalating to a bigger, more disruptive fix."
    ],
    commonMixup: "Escalating straight to a full OS reinstall or hardware replacement when the crash log is already naming the specific culprit (a driver) and the timeline already names the specific trigger (a new GPU) — the fix is scoped exactly as narrow as the evidence.",
    takeaway: "Repeated blue screens naming the same driver, right after a hardware change = roll back/update that driver in Safe Mode first."
  },

  'missing-dependency-errors': {
    objective: 'software-troubleshooting',
    title: "A Missing DLL Is Naming Its Own Cause",
    hook: "Some error messages are vague. This one isn't — it's telling you precisely what's missing and precisely what kind of thing it is.",
    walkthrough: [
      "A DLL (dynamic-link library) is a shared file that contains code multiple programs can use, rather than every program bundling its own copy. Applications depend on specific DLLs being present and intact in order to run — that's what makes them a dependency.",
      "When Event Viewer reports an error specifically naming a missing DLL that the application needs, it's telling you the application's installation is incomplete or damaged in a very specific way: one of its required shared components isn't where the program expects it to be.",
      "That's a fundamentally different failure than a failing hard drive (which would produce read errors, not a clean \"missing file\" message naming a specific component), a malware infection (which wouldn't specifically manifest as a named missing dependency), or insufficient RAM (a resource problem, not a missing-file problem).",
      "The fix that matches this specific diagnosis is repairing or reinstalling the application itself, which restores its full set of required files — you're treating the actual named problem, not a different problem that happens to also stop programs from launching."
    ],
    commonMixup: "Treating any app-won't-launch symptom as a generic system health issue (failing drive, malware, low RAM) instead of reading what the error is actually naming — a specific missing shared file the application itself depends on.",
    takeaway: "Error names a specific missing DLL/dependency = repair or reinstall that application; it's an install-integrity problem, not a system-health one."
  },

  'esd-safety': {
    objective: 'operational-procedures',
    title: "Static Damage You Can't See Is Still Damage",
    hook: "The scariest part of electrostatic discharge is that a shock small enough for a person to never even feel it can still be large enough to destroy a component.",
    walkthrough: [
      "Carpeted rooms in particular are a well-known static risk — walking around builds up a static charge on your body, and touching internal components can discharge that static directly into sensitive electronics.",
      "An ESD wrist strap connects you to ground continuously, bleeding off static charge as it builds, and an anti-static mat does the same for the components and tools sitting on the work surface. Together, that's the standard protection before opening a case and touching anything internal.",
      "A single touch to the case to \"ground yourself\" once is a much weaker, one-time measure — it doesn't handle new static building back up as you continue working, which is exactly why continuous protection (the strap, the mat) is the actual standard rather than a one-off gesture.",
      "\"Just unplug the device\" addresses electrical shock risk to the technician, which is a real and separate concern, but does nothing about ESD risk to the components — those are two different hazards with two different mitigations, and this question is specifically about protecting the hardware, not the technician's body."
    ],
    commonMixup: "Treating unplugging the device as sufficient protection, or treating a single one-time ground touch as equivalent to continuous grounding — neither actually prevents static building back up while you continue working inside the case.",
    takeaway: "Before opening a case: wrist strap + anti-static mat, every time — not a one-time touch, and not just unplugging it."
  },

  'e-waste-disposal': {
    objective: 'operational-procedures',
    title: "Batteries and Toner Aren't Regular Trash — And It's Not Optional",
    hook: "This one isn't really a technical question at all — it's a professional-responsibility question, and the exam treats it that way.",
    walkthrough: [
      "Batteries and toner cartridges are classified as hazardous materials in most jurisdictions, because of the chemicals they contain. That classification carries real regulatory weight — improper disposal isn't just \"not ideal,\" it's often actually against local environmental law.",
      "That immediately rules out regular trash (an environmental and often legal violation) and burning (releases hazardous chemicals directly and is dangerous and illegal essentially everywhere) as acceptable options — both cause real, direct harm rather than just being 'less tidy.'",
      "Handing the problem off to the end user also isn't a real answer — proper disposal of hazardous material generated during IT work is a professional and often regulatory responsibility that belongs to the technician/organization doing the work, not something to informally delegate away.",
      "The correct approach — following local environmental regulations and using designated e-waste/recycling programs — is the only option that actually treats this as the compliance obligation it is, rather than a convenience decision."
    ],
    commonMixup: "Treating disposal of batteries/toner as a matter of personal convenience (trash, handing it off) rather than recognizing it as a regulatory/compliance obligation with real environmental and legal consequences for getting it wrong.",
    takeaway: "Batteries and toner are hazardous e-waste — designated recycling/disposal programs, following local regulations, not the regular trash and not someone else's problem."
  }

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APLUS_LESSONS };
}
