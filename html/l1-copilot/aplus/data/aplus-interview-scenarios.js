/* ============================================================
   TSM A+ Training Engine — Interview Mode Scenarios
   ------------------------------------------------------------
   Mock help-desk interview questions, scored on TWO independent
   axes per response, not one: TECHNICAL accuracy (does the answer
   reflect a correct troubleshooting approach / correct concept)
   and COMMUNICATION quality (would a real user or interviewer
   find this response clear, professional, and appropriately
   paced — not just correct on paper).

   Every response option carries both scores (0-2 each) plus a
   feedback string explaining BOTH dimensions, same "don't waste
   a wrong answer" principle as Question Coach's Answer
   Intelligence — a technically-correct-but-condescending answer
   is a real, common interview failure mode, not a null case.

   `objective` links to APLUS_OBJECTIVES (aplus-question-bank.js)
   so the TECHNICAL half of each result can feed the same shared
   TSMAplusEngine mastery store every other A+ tool uses.
   `concept` is the finer-grained tag for that same store.
   Communication scoring is tracked separately (own localStorage
   key, own report) — it is not an A+ exam domain, so it is
   deliberately never written into domain/concept mastery.

   category: 'technical' (a troubleshooting/explain-it question)
   or 'behavioral' (a customer-facing / soft-skills question).
   Behavioral items still carry a nominal `objective` +
   `operational-procedures`-style concept so a technical score
   exists to record, since real interviews grade "how you'd
   handle a difficult user" partly on procedure (documentation,
   escalation path) as well as tone.
   ============================================================ */

const APLUS_INTERVIEW_SCENARIOS = [
  {
    id: 'int-001',
    category: 'technical',
    objective: 'troubleshooting',
    prompt: 'A user calls in and says their laptop won\u2019t connect to Wi-Fi, but it worked yesterday. Walk me through how you\u2019d handle this call.',
    responses: [
      {
        id: 'a', technicalScore: 2, communicationScore: 2, concept: 'troubleshooting-methodology',
        text: 'I\u2019d start by asking what changed since yesterday \u2014 new updates, dropped/moved locations, other devices affected \u2014 then check if it\u2019s their device only or site-wide, verify Wi-Fi is toggled on and the right network is selected, and work outward from there before touching drivers or the router.',
        feedback: 'Strong on both axes. Technically this follows the identify-the-problem step correctly (question first, narrow single-device vs. site-wide before diving into fixes), and it\u2019s communicated the way an interviewer wants to hear it \u2014 as a sequence, not a guess.'
      },
      {
        id: 'b', technicalScore: 2, communicationScore: 0, concept: 'troubleshooting-methodology',
        text: 'Toggle airplane mode, forget the network and rejoin, update the Wi-Fi driver, and if that fails do a full network stack reset with netsh winsock reset.',
        feedback: 'Technically this is a legitimate fix ladder \u2014 but in an interview (and on a real call) jumping straight to commands with no discovery step reads as skipping the "identify the problem" phase entirely. An interviewer is listening for process, not just a correct command list.'
      },
      {
        id: 'c', technicalScore: 0, communicationScore: 1, concept: 'troubleshooting-methodology',
        text: 'I\u2019d just have them restart the laptop \u2014 that fixes most things.',
        feedback: 'Pleasant and calm delivery, but technically this isn\u2019t a troubleshooting methodology at all \u2014 it skips discovery entirely and treats every Wi-Fi issue as the same issue. An interviewer would follow up asking what you\u2019d do if the restart didn\u2019t work, and "I\u2019m not sure" is a bad place to be left.'
      }
    ]
  },
  {
    id: 'int-002',
    category: 'behavioral',
    objective: 'operational-procedures',
    prompt: 'You\u2019re on a call and the user is clearly frustrated \u2014 this is the third time they\u2019ve called about the same printer issue. How do you handle the call?',
    responses: [
      {
        id: 'a', technicalScore: 2, communicationScore: 2, concept: 'de-escalation-and-documentation',
        text: 'I\u2019d acknowledge it\u2019s frustrating to deal with this a third time, pull up the prior tickets myself instead of asking them to repeat everything, and be upfront that if this recurrence isn\u2019t something I can close out today I\u2019ll escalate it with the full history attached rather than reopening a fourth ticket.',
        feedback: 'This is what interviewers are actually screening for: acknowledges the emotion without over-apologizing, uses ticket history instead of making the user repeat themselves, and sets a concrete expectation (escalate with history) instead of a vague "I\u2019ll look into it."'
      },
      {
        id: 'b', technicalScore: 1, communicationScore: 2, concept: 'de-escalation-and-documentation',
        text: 'I\u2019d apologize sincerely for the trouble, really validate their frustration, and reassure them I\u2019ll personally make sure it gets fixed this time.',
        feedback: 'Warm and de-escalating, but technically thin \u2014 there\u2019s no mention of pulling the ticket history, and "I\u2019ll personally make sure" is a promise a help-desk agent often can\u2019t keep if the fix needs escalation. Good tone, missing the concrete procedure an interviewer wants alongside it.'
      },
      {
        id: 'c', technicalScore: 1, communicationScore: 0, concept: 'de-escalation-and-documentation',
        text: 'I\u2019d explain that printer issues are often caused by something on their end, and walk them through the same basic steps again to rule that out first.',
        feedback: 'Reasonable technical instinct (rule out the obvious again), but leading with "often caused by something on their end" to an already-frustrated repeat caller reads as blame-shifting \u2014 exactly the kind of answer that quietly fails a soft-skills interview even though nothing said is technically wrong.'
      }
    ]
  },
  {
    id: 'int-003',
    category: 'technical',
    objective: 'hardware',
    prompt: 'How would you explain, to a non-technical user, why their computer is running slow because of a failing hard drive?',
    responses: [
      {
        id: 'a', technicalScore: 2, communicationScore: 2, concept: 'plain-language-explanation',
        text: 'I\u2019d say the drive is like a filing cabinet that\u2019s starting to stick \u2014 the computer has to try multiple times to read or save a file, and each retry takes time, which is what shows up as slowness. I\u2019d recommend backing up important files soon since a drive in this state can fail completely without much more warning.',
        feedback: 'Correct diagnosis translated into an accurate, non-scary analogy, plus the actually-important actionable next step (back up now) stated plainly. This is the shape of answer that scores well on both axes at once.'
      },
      {
        id: 'b', technicalScore: 2, communicationScore: 0, concept: 'plain-language-explanation',
        text: 'Your S.M.A.R.T. attributes are showing reallocated sector counts climbing, which means the drive is remapping bad sectors on the fly \u2014 that\u2019s adding read/write latency.',
        feedback: 'Technically accurate and precise, but this is jargon delivered straight at a non-technical user with no translation \u2014 the prompt specifically asked how you\u2019d explain it to them, not how you\u2019d document it for another technician. In an interview this reads as failing to read the audience.'
      },
      {
        id: 'c', technicalScore: 0, communicationScore: 1, concept: 'plain-language-explanation',
        text: 'I\u2019d tell them the hard drive is just old and it happens to every computer eventually, nothing to worry about.',
        feedback: 'Calm and simple, but technically wrong in a way that matters: it downplays a drive that may be actively failing and skips the one thing the user actually needs to hear \u2014 back up your data. Reassuring the user out of a real risk is worse than an over-technical answer.'
      }
    ]
  },
  {
    id: 'int-004',
    category: 'technical',
    objective: 'security',
    prompt: 'A user emails you a screenshot of a pop-up saying their computer is infected and to call a phone number immediately. What do you tell them?',
    responses: [
      {
        id: 'a', technicalScore: 2, communicationScore: 2, concept: 'social-engineering-recognition',
        text: 'I\u2019d tell them not to call that number or click anything on the pop-up \u2014 this is a common tech-support scam pattern, not a real antivirus alert \u2014 and walk them through closing the browser via Task Manager if it won\u2019t close normally, then have IT run a real scan to confirm nothing was actually installed.',
        feedback: 'Correctly identifies the scam pattern, gives a safe concrete action (Task Manager close, not clicking through), and follows up with real verification instead of just trusting the user\u2019s device is fine \u2014 covers both the immediate risk and the follow-through.'
      },
      {
        id: 'b', technicalScore: 1, communicationScore: 1, concept: 'social-engineering-recognition',
        text: 'I\u2019d tell them to just restart the computer and the pop-up should go away.',
        feedback: 'This will often make the visible symptom disappear, but it skips naming the actual risk (a scam attempting to get them to call and grant remote access or pay money) and skips confirming nothing was already clicked or downloaded before the restart.'
      },
      {
        id: 'c', technicalScore: 0, communicationScore: 1, concept: 'social-engineering-recognition',
        text: 'I\u2019d ask them to call the number on the pop-up first to see what the technician says, then loop me in if it seems off.',
        feedback: 'This is the one response that actively makes things worse \u2014 it sends the user straight into the scam. Technically this is the wrong call, regardless of how calmly it\u2019s delivered.'
      }
    ]
  },
  {
    id: 'int-005',
    category: 'behavioral',
    objective: 'operational-procedures',
    prompt: 'A ticket comes in that\u2019s outside your ability to fix \u2014 it needs a specialist team. How do you close out your part of the interaction with the user?',
    responses: [
      {
        id: 'a', technicalScore: 2, communicationScore: 2, concept: 'escalation-communication',
        text: 'I\u2019d tell them plainly that this needs a specialist team, summarize exactly what I\u2019ve already checked and ruled out so they don\u2019t have to repeat it, give them the new ticket number and a realistic timeframe, and let them know what to expect next.',
        feedback: 'This is the full loop an interviewer wants: honest about the limit of your role, avoids the user re-explaining everything, and closes with a concrete next step instead of leaving them wondering what happens now.'
      },
      {
        id: 'b', technicalScore: 1, communicationScore: 1, concept: 'escalation-communication',
        text: 'I\u2019d let them know I\u2019m escalating this and someone will reach out soon.',
        feedback: 'Not wrong, but thin \u2014 no ticket number, no summary of what\u2019s already been ruled out, no timeframe. Technically the escalation itself is the right call; the communication around it is the part that\u2019s missing.'
      },
      {
        id: 'c', technicalScore: 0, communicationScore: 0, concept: 'escalation-communication',
        text: 'I\u2019d keep trying a few more things myself first since I don\u2019t want to pass off a ticket I couldn\u2019t solve.',
        feedback: 'This is the wrong instinct on both axes: procedurally it delays a needed escalation past the point where continuing to try is useful, and it leaves the user waiting longer with no communication at all while you keep guessing.'
      }
    ]
  },
  {
    id: 'int-006',
    category: 'technical',
    objective: 'networking',
    prompt: 'Interviewer: "Explain the difference between ipconfig, ping, and nslookup, and when you\u2019d use each on a support call."',
    responses: [
      {
        id: 'a', technicalScore: 2, communicationScore: 2, concept: 'network-command-selection',
        text: '`ipconfig` shows the local machine\u2019s own network configuration \u2014 I\u2019d start there to confirm it even has a valid IP. `ping` tests basic reachability to another host, so I\u2019d use it next to see if the problem is connectivity at all. `nslookup` checks whether a domain name resolves to an IP, so I\u2019d reach for that specifically when a site won\u2019t load by name but the connection otherwise looks fine \u2014 that pattern usually points at DNS, not connectivity.',
        feedback: 'Correctly distinguishes all three tools by what they actually check, and \u2014 more importantly for an interview \u2014 ties each one to the specific symptom pattern that would make you reach for it, which is what separates "knows the commands" from "knows when to use them."'
      },
      {
        id: 'b', technicalScore: 1, communicationScore: 2, concept: 'network-command-selection',
        text: 'They\u2019re all basic network troubleshooting commands I\u2019d run early on a connectivity call to get more information about what\u2019s going on.',
        feedback: 'Confident and clearly delivered, but technically vague \u2014 it doesn\u2019t actually distinguish what each command checks or when one would tell you something the others wouldn\u2019t. An interviewer asking "explain the difference" wants the difference, not that they\u2019re all in the same general category.'
      },
      {
        id: 'c', technicalScore: 0, communicationScore: 1, concept: 'network-command-selection',
        text: '`ipconfig` pings the router, `ping` looks up DNS records, and `nslookup` shows your MAC address.',
        feedback: 'The three descriptions are swapped/incorrect relative to what each command actually does \u2014 this is the kind of confidently-delivered wrong answer that\u2019s worse in an interview than saying "I\u2019d need to double check the exact syntax," since it signals the underlying concept isn\u2019t solid either.'
      }
    ]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APLUS_INTERVIEW_SCENARIOS };
}
