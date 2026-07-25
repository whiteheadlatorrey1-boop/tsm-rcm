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
    'network:link-down': {
      title: 'Network Link Down',
      steps: [
        'Confirm link status in the network monitoring dashboard',
        'Check physical connectivity (cable, SFP, port) or carrier circuit status if WAN',
        'Fail over to a redundant path if one exists',
        'Escalate to the carrier/ISP if the link is provider-managed',
      ],
    },
    'network:latency-spike': {
      title: 'Network Latency Spike',
      steps: [
        'Check interface utilization and QoS policy on the affected link',
        'Look for a new or unexpected traffic source (backup job, bulk transfer)',
        'Reduce load or reroute traffic once the saturation source is found',
      ],
    },
    'network:packet-loss': {
      title: 'Network Packet Loss',
      steps: [
        'Run continuous ping/traceroute to isolate which hop is dropping packets',
        'Check for duplex mismatches or failing hardware on that segment',
        'Escalate to the circuit provider if loss originates outside your network',
      ],
    },
    'network:bgp-flap': {
      title: 'BGP Session Flapping',
      steps: [
        'Check BGP neighbor logs for repeated up/down transitions',
        'Verify physical link stability underneath the BGP session',
        'Apply route dampening if flapping is frequent but the link is otherwise healthy',
      ],
    },
    'vmware:host-down': {
      title: 'VMware Host Down',
      steps: [
        'Confirm the host is unreachable in vCenter; check iLO/iDRAC for power or hardware status',
        'Confirm HA has restarted affected VMs on a surviving host',
        'Investigate root cause (PSU, network, hardware) before returning the host to the cluster',
      ],
    },
    'vmware:datastore-full': {
      title: 'VMware Datastore Full',
      steps: [
        'Identify the largest consumers on the datastore (snapshots, orphaned VMDKs, logs)',
        'Clear or migrate non-essential data to free capacity',
        'Expand or add datastore capacity if this is a recurring growth issue',
      ],
    },
    'vmware:ha-failover': {
      title: 'VMware HA Failover',
      steps: [
        'Confirm which VMs were affected and their current running host',
        'Validate application health post-migration',
        'Investigate the triggering host failure once VMs are confirmed stable',
      ],
    },
    'vmware:network-partition': {
      title: 'VMware Host Network Partition',
      steps: [
        'Check management network connectivity between the host and vCenter',
        'Verify the host agent (hostd/vpxa) status on the isolated host',
        'Restore the network path before reconnecting the host to the cluster',
      ],
    },
    'device:disk-full': {
      title: 'Device Disk Full',
      steps: [
        'Identify the largest space consumers (temp files, downloads, logs)',
        'Clear or archive non-essential data, empty the recycle bin',
        'Expand storage or migrate the user profile if this recurs',
      ],
    },
    'device:bsod-crash': {
      title: 'Device BSOD Crash',
      steps: [
        'Capture and review the crash dump / stop code',
        'Check for a recently installed driver or update correlating with the crash',
        'Roll back the driver or reimage the device if crashes persist',
      ],
    },
    'device:battery-failure': {
      title: 'Device Battery Failure',
      steps: [
        'Confirm battery health via built-in hardware diagnostics',
        'Replace the battery if health is critically degraded',
        'Advise AC-only operation until the replacement arrives',
      ],
    },
    'device:driver-crash': {
      title: 'Device Driver Crash',
      steps: [
        'Identify the failing driver from Event Viewer',
        'Update or roll back to a known-stable driver version',
        'Reimage the device if crashes continue after driver remediation',
      ],
    },
    'device:patch-failure': {
      title: 'Device Patch Deployment Failure',
      steps: [
        'Review patch deployment logs for the specific failure code',
        'Retry deployment during the next maintenance window',
        'Manually install the patch if automated deployment continues to fail',
      ],
    },
    'device:printer-jam': {
      title: 'Printer Paper Jam',
      steps: [
        'Clear the physical jam and inspect rollers/feed path',
        'Run a test print to confirm the jam is resolved',
        'Schedule maintenance if jams are frequent on this unit',
      ],
    },
    'device:printer-offline': {
      title: 'Printer Offline',
      steps: [
        'Confirm network connectivity and IP assignment for the printer',
        'Restart the print spooler service on the print server',
        'Power-cycle the printer if it remains unreachable',
      ],
    },
    'vendor:vendor-outage': {
      title: 'Vendor Service Outage',
      steps: [
        'Confirm outage scope via the vendor status page or support line',
        'Communicate impact and ETA to affected internal stakeholders',
        "Track the vendor's SLA commitment against your own opened ticket",
      ],
    },
    'vendor:ticket-escalated': {
      title: 'Vendor Ticket Escalated',
      steps: [
        'Confirm the escalation was received and acknowledged by the vendor',
        'Request a named point of contact and an update cadence',
        'Document the escalation timeline for post-incident review',
      ],
    },
    'vendor:sla-breach': {
      title: 'Vendor SLA Breach',
      steps: [
        'Document the breach with timestamps for the vendor conversation',
        'Request root cause and a remediation plan from the vendor',
        'Review contract terms for applicable service credits',
      ],
    },
    'vendor:shipment-delay': {
      title: 'Vendor Shipment Delay',
      steps: [
        'Confirm the new expected delivery date with the vendor',
        'Identify a workaround (loaner/rental hardware) if the delay impacts operations',
        'Escalate if the delay exceeds the contractual delivery commitment',
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
