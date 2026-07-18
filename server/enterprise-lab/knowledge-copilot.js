'use strict';

function buildInitialKB() {
  return {
    'ad:account-lockout': {
      title: 'AD Account Lockout',
      steps: [
        'Confirm the lockout in Event Viewer (4740) on the PDC emulator',
        'Unlock the account via ADUC or Unlock-ADAccount',
        'Check for a stale credential on a mobile device or mapped drive causing repeated bad password attempts',
      ],
    },
    'ad:password-expired': {
      title: 'AD Password Expired',
      steps: [
        'Have the user reset via self-service portal or Ctrl+Alt+Del > Change Password',
        'If remote, walk them through resetting over VPN before the session locks',
        'Check password policy if this is happening unusually often',
      ],
    },
    'ad:mfa-failure': {
      title: 'AD MFA Failure',
      steps: [
        'Verify the MFA provider service status',
        "Confirm the user's enrolled device/method is still valid",
        'Re-enroll MFA if the method was lost or replaced',
      ],
    },
    'ad:replication-failure': {
      title: 'AD Replication Failure',
      steps: [
        'Run repadmin /replsummary on affected DCs',
        'Check network connectivity and DNS between DCs',
        'Force replication with repadmin /syncall once the root cause is fixed',
      ],
    },
    'ad:gpo-corruption': {
      title: 'GPO Corruption',
      steps: [
        'Check SYSVOL replication health',
        'Restore the GPO from backup or recreate it',
        'Re-link and force gpupdate on affected OU',
      ],
    },
    'm365:mailbox-full': {
      title: 'Mailbox Full',
      steps: [
        'Check mailbox size against quota in the M365 admin center',
        'Archive or delete old mail, or increase the quota/license tier',
        'Enable an archive mailbox if this is recurring',
      ],
    },
    'm365:license-exhausted': {
      title: 'License Pool Exhausted',
      steps: [
        'Check assigned vs total seats for the license SKU',
        'Reclaim licenses from disabled/departed users',
        'Purchase additional seats if usage is genuinely growing',
      ],
    },
    'm365:service-outage': {
      title: 'M365 Service Outage',
      steps: [
        'Check the Microsoft 365 Service Health Dashboard',
        'Post a status update to affected users',
        'Escalate to Microsoft support if outage exceeds SLA',
      ],
    },
    'm365:sync-failure': {
      title: 'Mailbox Sync Failure',
      steps: [
        'Check Outlook connectivity status (top right of Outlook)',
        'Rebuild the OST file or recreate the profile',
        'Verify no conditional access policy is blocking the client',
      ],
    },
  };
}

class KnowledgeCopilot {
  constructor() {
    this.kb = buildInitialKB();
    this.updatedAt = new Date().toISOString();
  }

  lookup(twinType, faultType) {
    const key = `${twinType}:${faultType}`;
    return this.kb[key] || null;
  }

  listEntries() {
    return Object.keys(this.kb).map((key) => {
      const [twinType, faultType] = key.split(':');
      return { twinType, faultType, title: this.kb[key].title };
    });
  }

  upsertEntry(twinType, faultType, entry) {
    if (!twinType || !faultType || !entry || !entry.title || !Array.isArray(entry.steps)) {
      throw new Error('Entry requires twinType, faultType, entry.title, and entry.steps[]');
    }
    const key = `${twinType}:${faultType}`;
    this.kb[key] = { title: entry.title, steps: entry.steps };
    this.updatedAt = new Date().toISOString();
    return this.kb[key];
  }

  reset() {
    this.kb = buildInitialKB();
    this.updatedAt = new Date().toISOString();
    return this.listEntries();
  }

  getState() {
    return { updatedAt: this.updatedAt, entries: this.listEntries() };
  }
}

module.exports = { KnowledgeCopilot };
