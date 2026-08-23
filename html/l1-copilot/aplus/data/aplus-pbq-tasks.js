/* ============================================================
   TSM A+ Training Engine — Performance-Based Question (PBQ) Tasks
   ------------------------------------------------------------
   Phase 3 data model, second piece (see html/l1-copilot/aplus/README.md).
   Original simulated tasks, not reproduced exam content.

   Two task types, both scored all-or-nothing per attempt (matches
   how real A+ PBQs are graded — partial credit isn't shown to the
   student mid-task, only in the post-check review):

   - type: 'sequence' — student places shuffled `steps[]` into the
     order they believe is correct by clicking them one at a time.
     Checked against `correctOrder` (array of step ids). Review shows
     every step's position, right or wrong, plus a `why` explaining
     what breaks if that step happens out of order.

   - type: 'match' — student assigns each shuffled `items[]` entry to
     one of `categories[]` by clicking a category chip under that
     item. Checked by comparing each item's picked category against
     its own `categoryId`. Review shows every item's correct category
     plus a `why` tying it to the category definition.

   `concept` feeds the shared TSMAplusEngine mastery store, same
   tagging convention as the question bank and the Troubleshooting
   Lab — recordAttempt() is called once per task with isCorrect =
   true only if EVERY step/item was placed correctly.
   ============================================================ */

const APLUS_PBQ_TASKS = [
  {
    id: 'pbq-001',
    type: 'sequence',
    objective: 'hardware',
    concept: 'safe-hardware-replacement-procedure',
    title: 'Safely Replace a Failing Internal Hard Drive',
    scenario: 'A workstation\u2019s internal hard drive is failing SMART checks and needs to be physically replaced. The user still has files on it that haven\u2019t been backed up anywhere else.',
    instructions: 'Click the steps below in the order you would actually perform them.',
    steps: [
      { id: 's1', text: 'Back up any accessible user data from the drive', why: 'This has to happen while the drive still powers on and is still readable \u2014 wait until after you\u2019ve started disassembly and the data may already be unreachable.' },
      { id: 's2', text: 'Power down the system and disconnect it from AC power', why: 'Never open a case or handle internal components on a live system \u2014 this has to happen before any physical work, but after the backup, since you need the system running to back up data off it.' },
      { id: 's3', text: 'Put on an ESD wrist strap and ground yourself before touching internals', why: 'Static discharge can damage components the instant you touch them \u2014 this has to happen before opening the case, not after you\u2019re already reaching inside.' },
      { id: 's4', text: 'Open the case and locate the failing drive', why: 'You need the case open and grounded first \u2014 doing this before power-down or ESD prep risks both a live-circuit mistake and a static discharge.' },
      { id: 's5', text: 'Disconnect the SATA and power cables from the drive', why: 'Cables come off before the drive is unmounted \u2014 trying to pull a still-cabled drive risks yanking a connector or damaging a port.' },
      { id: 's6', text: 'Remove the mounting screws and slide the old drive out', why: 'The drive can\u2019t be freed until its cables are already disconnected \u2014 reversing this risks stressing the cables.' },
      { id: 's7', text: 'Install the replacement drive and reconnect its cables', why: 'The new drive has to physically be in place before it can be cabled \u2014 you can\u2019t connect cables to a drive that isn\u2019t mounted yet.' },
      { id: 's8', text: 'Close the case, reconnect power, and boot to verify the new drive is recognized', why: 'Verifying recognition has to happen before you trust the replacement enough to restore data onto it.' },
      { id: 's9', text: 'Restore the backed-up data and initialize/format the new drive as needed', why: 'This is the last step \u2014 restoring onto a drive the system hasn\u2019t confirmed it can even see and use would be premature.' }
    ],
    correctOrder: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9']
  },

  {
    id: 'pbq-002',
    type: 'sequence',
    objective: 'security',
    concept: 'malware-remediation-procedure',
    title: 'Isolate and Remediate a Suspected Malware Infection',
    scenario: 'A user reports their machine is behaving strangely \u2014 unexpected pop-ups, a noticeably slower system, and browser settings that changed without them touching anything. You suspect malware.',
    instructions: 'Click the steps below in the order you would actually perform them.',
    steps: [
      { id: 's1', text: 'Identify and confirm the symptoms actually indicate an infection', why: 'Jumping straight to removal tools before confirming what you\u2019re dealing with risks chasing the wrong problem \u2014 this has to come first.' },
      { id: 's2', text: 'Quarantine the infected system by disconnecting it from the network', why: 'This has to happen right after confirming infection and before any remediation \u2014 leaving it connected risks the infection spreading or the malware phoning home while you work.' },
      { id: 's3', text: 'Disable System Restore to prevent the infection from surviving in a restore point', why: 'This must happen before you scan and clean \u2014 if it\u2019s still on, a restore point taken mid-remediation can preserve the infection and let it come back later.' },
      { id: 's4', text: 'Update anti-malware definitions and run a full scan and removal', why: 'Remediation itself only makes sense after isolation and disabling System Restore \u2014 doing it earlier risks reinfection or an incomplete clean.' },
      { id: 's5', text: 'Run additional scans or a second removal tool if anything is still flagged', why: 'This follows the first scan, not before it \u2014 you only know a second pass is needed once the first one\u2019s results are in.' },
      { id: 's6', text: 'Re-enable System Restore and create a fresh, clean restore point', why: 'This only makes sense once the system is actually clean \u2014 turning it back on any earlier risks capturing the infection in a new restore point.' },
      { id: 's7', text: 'Educate the end user on how the infection likely happened', why: 'This is the final step \u2014 it\u2019s prevention-focused and doesn\u2019t affect the technical remediation, so it comes after the system is already confirmed clean.' }
    ],
    correctOrder: ['s1', 's2', 's3', 's4', 's5', 's6', 's7']
  },

  {
    id: 'pbq-003',
    type: 'match',
    objective: 'hardware',
    concept: 'connector-cable-identification',
    title: 'Match Each Connector to Its Primary Use',
    scenario: 'You\u2019re inventorying cables and connectors pulled from a decommissioned workstation and need to sort them by what they\u2019re primarily used for.',
    instructions: 'Assign each connector below to the category it\u2019s primarily used for.',
    categories: [
      { id: 'cat-display', label: 'Display' },
      { id: 'cat-storage', label: 'Internal Storage' },
      { id: 'cat-network-peripheral', label: 'Network / Peripheral' }
    ],
    items: [
      { id: 'i1', text: 'HDMI', categoryId: 'cat-display', why: 'HDMI carries digital video (and usually audio) from a device to a display \u2014 it\u2019s a display connector, not a storage or networking one.' },
      { id: 'i2', text: 'DisplayPort', categoryId: 'cat-display', why: 'Like HDMI, DisplayPort is a digital video interface for connecting a source device to a monitor.' },
      { id: 'i3', text: 'SATA', categoryId: 'cat-storage', why: 'SATA is the standard interface for connecting internal hard drives and SSDs to a motherboard \u2014 it\u2019s a storage connector.' },
      { id: 'i4', text: 'M.2 (NVMe)', categoryId: 'cat-storage', why: 'M.2 is a form factor/interface for internal NVMe SSDs \u2014 it\u2019s internal storage, just a different physical connection than SATA.' },
      { id: 'i5', text: 'RJ45', categoryId: 'cat-network-peripheral', why: 'RJ45 is the standard wired Ethernet connector \u2014 it\u2019s networking, not display or internal storage.' },
      { id: 'i6', text: 'USB-C', categoryId: 'cat-network-peripheral', why: 'USB-C is primarily a peripheral/data connector (external drives, docks, charging) \u2014 grouped with network/peripheral here since its main job isn\u2019t driving an internal display or storage bus.' }
    ]
  },

  {
    id: 'pbq-004',
    type: 'match',
    objective: 'security',
    concept: 'security-control-categories',
    title: 'Match Each Security Control to Its Category',
    scenario: 'A client asked you to help document their existing security controls by category ahead of an audit.',
    instructions: 'Assign each control below to the category it belongs to.',
    categories: [
      { id: 'cat-physical', label: 'Physical Control' },
      { id: 'cat-technical', label: 'Technical Control' },
      { id: 'cat-administrative', label: 'Administrative Control' }
    ],
    items: [
      { id: 'i1', text: 'Badge reader on the server room door', categoryId: 'cat-physical', why: 'A badge reader restricts physical access to a space \u2014 that\u2019s a physical control by definition.' },
      { id: 'i2', text: 'Firewall ACL rules', categoryId: 'cat-technical', why: 'Firewall rules are enforced by technology (hardware/software) to control traffic \u2014 that\u2019s a technical control.' },
      { id: 'i3', text: 'Acceptable use policy', categoryId: 'cat-administrative', why: 'A policy is a documented rule governing behavior, not a physical barrier or a piece of enforcing technology \u2014 that\u2019s administrative.' },
      { id: 'i4', text: 'Biometric lock on a data center rack', categoryId: 'cat-physical', why: 'It\u2019s still restricting physical entry to hardware, just with a biometric mechanism instead of a badge \u2014 still a physical control.' },
      { id: 'i5', text: 'Full-disk encryption', categoryId: 'cat-technical', why: 'Encryption is enforced by software/hardware to protect data \u2014 a technical control.' },
      { id: 'i6', text: 'Security awareness training', categoryId: 'cat-administrative', why: 'Training is a program/process governing how people behave, not a physical barrier or an enforcing technology \u2014 administrative.' }
    ]
  }
];
