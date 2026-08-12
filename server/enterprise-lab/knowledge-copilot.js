'use strict';

function buildInitialKB() {
  return {
    'ad:account-lockout': {
      title: 'AD Account Lockout',
      steps: [
        'Confirm the lockout in Event Viewer (4740) on the PDC emulator — Event Viewer > Windows Logs > Security, filter Event ID 4740, run on the PDC emulator (netdom query fsmo to find it)',
        'Unlock the account via ADUC or Unlock-ADAccount — Active Directory Users and Computers, right-click user > Properties > Account tab, or PowerShell: Unlock-ADAccount -Identity <user>',
        'Check for a stale credential on a mobile device or mapped drive causing repeated bad password attempts — Event Viewer 4740 detail shows the Caller Computer Name; also check Credential Manager and any mapped drives/scheduled tasks storing old creds',
      ],
    },
    'ad:password-expired': {
      title: 'AD Password Expired',
      steps: [
        'Have the user reset via self-service portal or Ctrl+Alt+Del > Change Password — on a domain-joined machine, Ctrl+Alt+Del > Change a password; remotely via the org SSPR portal if enabled',
        'If remote, walk them through resetting over VPN before the session locks — confirm VPN is connected first, since a password change while disconnected won’t sync and can cause a subsequent lockout',
        'Check password policy if this is happening unusually often — ADUC > Domain > right-click > Properties, or Group Policy Management > Default Domain Policy > Password Policy, to review max age/complexity settings',
      ],
    },
    'ad:mfa-failure': {
      title: 'AD MFA Failure',
      steps: [
        'Verify the MFA provider service status — check the provider’s status page (e.g. Entra ID admin center > Health, or Duo/Okta status dashboard)',
        "Confirm the user's enrolled device/method is still valid — Entra admin center > Users > select user > Authentication methods (or equivalent in the MFA provider’s admin console)",
        'Re-enroll MFA if the method was lost or replaced — admin console: Require re-register MFA / delete and re-add the method, then have the user re-enroll',
      ],
    },
    'ad:replication-failure': {
      title: 'AD Replication Failure',
      steps: [
        'Run repadmin /replsummary on affected DCs — elevated Command Prompt on the DC (or any domain-joined admin workstation with RSAT)',
        'Check network connectivity and DNS between DCs — ping/traceroute between DCs, nslookup against each DC’s DNS, and dcdiag /test:dns for a fuller check',
        'Force replication with repadmin /syncall once the root cause is fixed — repadmin /syncall /AdeP for a full push across all partners',
      ],
    },
    'ad:gpo-corruption': {
      title: 'GPO Corruption',
      steps: [
        'Check SYSVOL replication health — dfsrmig /getglobalstate (DFSR) or check Event Viewer > Applications and Services Logs > DFS Replication for backlog/errors',
        'Restore the GPO from backup or recreate it — Group Policy Management Console, right-click the GPO > Restore from Backup (or recreate settings manually if no backup exists)',
        'Re-link and force gpupdate on affected OU — GPMC to re-link, then gpupdate /force on affected machines or Invoke-GPUpdate -Force remotely',
      ],
    },
    'm365:mailbox-full': {
      title: 'Mailbox Full',
      steps: [
        'Check mailbox size against quota in the M365 admin center — admin.microsoft.com > Users > select user > Mail tab (or Exchange admin center > Recipients > Mailboxes)',
        'Archive or delete old mail, or increase the quota/license tier — Exchange admin center to raise the mailbox quota, or upgrade the assigned license (e.g. to one with a larger mailbox)',
        'Enable an archive mailbox if this is recurring — Exchange admin center > Recipients > select mailbox > enable In-Place Archive, then set an archive policy',
      ],
    },
    'm365:license-exhausted': {
      title: 'License Pool Exhausted',
      steps: [
        'Check assigned vs total seats for the license SKU — admin.microsoft.com > Billing > Licenses, view assigned vs available count per SKU',
        'Reclaim licenses from disabled/departed users — Billing > Licenses > select SKU > Users, unassign from disabled accounts, or check Azure AD for stale accounts',
        'Purchase additional seats if usage is genuinely growing — Billing > Your products > select subscription > Add/remove licenses',
      ],
    },
    'm365:service-outage': {
      title: 'M365 Service Outage',
      steps: [
        'Check the Microsoft 365 Service Health Dashboard — admin.microsoft.com > Health > Service health',
        'Post a status update to affected users — internal status page or mass-comms channel; pull the incident ID from Service Health to reference',
        'Escalate to Microsoft support if outage exceeds SLA — open a case via admin.microsoft.com > Support > New service request, referencing the Service Health incident ID',
      ],
    },
    'm365:sync-failure': {
      title: 'Mailbox Sync Failure',
      steps: [
        'Check Outlook connectivity status (top right of Outlook) — hold Ctrl and right-click the Outlook icon in the system tray > Connection Status for detail',
        'Rebuild the OST file or recreate the profile — close Outlook, delete/rename the .ost file (Control Panel > Mail > Data Files to find its path), then let Outlook rebuild it on restart',
        'Verify no conditional access policy is blocking the client — Entra admin center > Protection > Conditional Access, check sign-in logs for the user to see if a policy is blocking or requiring compliance',
      ],
    },
    'network:link-down': {
      title: 'Network Link Down',
      steps: [
        'Confirm link status in the network monitoring dashboard — e.g. SolarWinds/PRTG/LibreNMS, or `show interface status` on the switch/router CLI',
        'Check physical connectivity (cable, SFP, port) or carrier circuit status if WAN — reseat cable/SFP, check port link LEDs, or call the carrier NOC and reference the circuit ID for WAN',
        'Fail over to a redundant path if one exists — trigger manual failover on the router/firewall (e.g. shut the primary interface) or confirm automatic failover (HSRP/VRRP/SD-WAN) has already kicked in',
        'Escalate to the carrier/ISP if the link is provider-managed — open a ticket with the carrier, include circuit ID and last-up timestamp',
      ],
    },
    'network:latency-spike': {
      title: 'Network Latency Spike',
      steps: [
        'Check interface utilization and QoS policy on the affected link — `show interface` for utilization/errors, `show policy-map interface` for QoS, or the monitoring dashboard’s bandwidth graph',
        'Look for a new or unexpected traffic source (backup job, bulk transfer) — NetFlow/sFlow analyzer (e.g. NetFlow Analyzer, ntopng) to identify top talkers during the spike window',
        'Reduce load or reroute traffic once the saturation source is found — throttle/reschedule the offending job, or adjust QoS/routing to move it off the congested path',
      ],
    },
    'network:packet-loss': {
      title: 'Network Packet Loss',
      steps: [
        'Run continuous ping/traceroute to isolate which hop is dropping packets — `ping -t` (Windows) or `ping` (Linux) alongside `tracert`/`traceroute`, or `mtr` for a combined live view',
        'Check for duplex mismatches or failing hardware on that segment — `show interface` for CRC errors/collisions on the switch port, and confirm duplex/speed settings match on both ends',
        'Escalate to the circuit provider if loss originates outside your network — traceroute results showing loss past your edge router point to the provider; open a ticket with that hop data',
      ],
    },
    'network:bgp-flap': {
      title: 'BGP Session Flapping',
      steps: [
        'Check BGP neighbor logs for repeated up/down transitions — `show bgp neighbors` or `show ip bgp neighbors` on the router, and `show logging | include BGP` for flap timestamps',
        'Verify physical link stability underneath the BGP session — `show interface` for the underlying link’s error counters and flap history',
        'Apply route dampening if flapping is frequent but the link is otherwise healthy — `bgp dampening` config on the neighbor/route-map to suppress repeated flaps',
      ],
    },
    'vmware:host-down': {
      title: 'VMware Host Down',
      steps: [
        'Confirm the host is unreachable in vCenter; check iLO/iDRAC for power or hardware status — vCenter shows the host as “not responding”/“disconnected”; log into the server’s iLO/iDRAC/BMC web console to check power state and hardware health events',
        'Confirm HA has restarted affected VMs on a surviving host — vCenter > Cluster > Monitor > vSphere HA, or check the VM list for their new “Host” column value',
        'Investigate root cause (PSU, network, hardware) before returning the host to the cluster — iLO/iDRAC event log for PSU/hardware faults, and check host management network connectivity before re-adding it to the cluster',
      ],
    },
    'vmware:datastore-full': {
      title: 'VMware Datastore Full',
      steps: [
        'Identify the largest consumers on the datastore (snapshots, orphaned VMDKs, logs) — vCenter > Datastore > Files (Datastore Browser), or SSH into the host and `du -sh` / `vmkfstools` to inspect snapshot chains',
        'Clear or migrate non-essential data to free capacity — consolidate/delete old snapshots via vCenter > VM > Snapshots > Consolidate, or Storage vMotion select VMs to another datastore',
        'Expand or add datastore capacity if this is a recurring growth issue — vCenter > Datastore > Increase Datastore Capacity (if LUN has room) or provision/present a new datastore',
      ],
    },
    'vmware:ha-failover': {
      title: 'VMware HA Failover',
      steps: [
        'Confirm which VMs were affected and their current running host — vCenter > Cluster > Monitor > vSphere HA > VM Restarts, or the Recent Tasks pane for migration/power-on events',
        'Validate application health post-migration — check the app’s own monitoring/health checks, and confirm the VM shows green/running status in vCenter',
        'Investigate the triggering host failure once VMs are confirmed stable — review the failed host’s iLO/iDRAC logs and vCenter > Host > Monitor > Events for the failure timeline',
      ],
    },
    'vmware:network-partition': {
      title: 'VMware Host Network Partition',
      steps: [
        'Check management network connectivity between the host and vCenter — ping the host’s management IP, and check vCenter > Host > Summary for connection state',
        'Verify the host agent (hostd/vpxa) status on the isolated host — SSH/DCUI into the host and run `/etc/init.d/hostd status` and `/etc/init.d/vpxa status`, restart with `services.sh restart` if hung',
        'Restore the network path before reconnecting the host to the cluster — confirm the vSwitch/uplink/VLAN config on the physical switch port before running “Connect” on the host in vCenter',
      ],
    },
    'device:disk-full': {
      title: 'Device Disk Full',
      steps: [
        'Identify the largest space consumers (temp files, downloads, logs) — Windows: Settings > System > Storage (or WinDirStat/TreeSize for a visual breakdown); macOS: About This Mac > Storage > Manage',
        'Clear or archive non-essential data, empty the recycle bin — Windows: Disk Cleanup (cleanmgr) or Storage Sense; empty Recycle Bin; move large files to OneDrive/archive share',
        'Expand storage or migrate the user profile if this recurs — swap in a larger drive, or move the user profile path via Settings > Accounts > Access work or school (or a profile-migration tool)',
      ],
    },
    'device:bsod-crash': {
      title: 'Device BSOD Crash',
      steps: [
        'Capture and review the crash dump / stop code — WinDbg or BlueScreenView against the .dmp file in C:\\Windows\\Minidump, or note the stop code shown on the BSOD screen itself',
        'Check for a recently installed driver or update correlating with the crash — Reliability Monitor (`perfmon /rel`) to correlate the crash date with recent driver/update installs; cross-check Device Manager driver dates (Properties > Driver tab) for GPU/chipset/storage/network; a stop code naming a driver file (e.g. nvlddmkm.sys) points directly to it',
        'Roll back the driver or reimage the device if crashes persist — Device Manager > device > Driver tab > Roll Back Driver (or reinstall a known-good version); reimage via your standard deployment tool if crashes continue',
      ],
    },
    'device:battery-failure': {
      title: 'Device Battery Failure',
      steps: [
        'Confirm battery health via built-in hardware diagnostics — Windows: `powercfg /batteryreport` for a health report; macOS: Option-click Apple menu > System Information > Power',
        'Replace the battery if health is critically degraded — cross-check the battery report’s Design Capacity vs Full Charge Capacity against the manufacturer’s replacement threshold',
        'Advise AC-only operation until the replacement arrives — confirm the AC adapter is the correct wattage for the device',
      ],
    },
    'device:driver-crash': {
      title: 'Device Driver Crash',
      steps: [
        'Identify the failing driver from Event Viewer — Event Viewer > Windows Logs > System, filter for Error/Critical events with Source matching the driver, or look for Event ID 219/dumped .sys file name',
        'Update or roll back to a known-stable driver version — Device Manager > device > Driver tab > Update Driver, or Roll Back Driver if the issue started after a recent update',
        'Reimage the device if crashes continue after driver remediation — use your standard deployment/imaging tool once driver fixes are exhausted',
      ],
    },
    'device:patch-failure': {
      title: 'Device Patch Deployment Failure',
      steps: [
        'Review patch deployment logs for the specific failure code — SCCM/ConfigMgr: WUAHandler.log and WindowsUpdate.log on the client; Intune: Devices > Monitor > Windows Update reports; standalone: Settings > Update history > View error details',
        'Retry deployment during the next maintenance window — re-trigger via SCCM/Intune deployment retry, or `usoclient StartScan` locally',
        'Manually install the patch if automated deployment continues to fail — download the .msu from the Microsoft Update Catalog matching the failure code, install directly with DISM or wusa.exe',
      ],
    },
    'device:printer-jam': {
      title: 'Printer Paper Jam',
      steps: [
        'Clear the physical jam and inspect rollers/feed path — open the panels indicated on the printer’s display, gently pull jammed paper in the direction of the paper path, and check rollers for debris/wear',
        'Run a test print to confirm the jam is resolved — printer’s control panel menu (Settings > Reports > Print Test Page) or print a test page from the OS',
        'Schedule maintenance if jams are frequent on this unit — log a service ticket with the vendor or MSP, referencing the printer’s page count/maintenance kit interval',
      ],
    },
    'device:printer-offline': {
      title: 'Printer Offline',
      steps: [
        'Confirm network connectivity and IP assignment for the printer — ping the printer’s IP, check the assigned IP on the printer’s control panel (Network Settings) matches DHCP/reservation',
        'Restart the print spooler service on the print server — services.msc > Print Spooler > Restart, or `net stop spooler && net start spooler` from an elevated prompt',
        'Power-cycle the printer if it remains unreachable — power off, wait ~30s, power back on, then re-ping/re-print',
      ],
    },
    'vendor:vendor-outage': {
      title: 'Vendor Service Outage',
      steps: [
        'Confirm outage scope via the vendor status page or support line — check status.<vendor>.com (or their published status URL) and cross-reference with the support line/chat for confirmation',
        'Communicate impact and ETA to affected internal stakeholders — post to your internal status page/comms channel, referencing the vendor’s incident ID and stated ETA',
        "Track the vendor's SLA commitment against your own opened ticket — open a support case with the vendor if not already tracked, note the SLA clock start time",
      ],
    },
    'vendor:ticket-escalated': {
      title: 'Vendor Ticket Escalated',
      steps: [
        'Confirm the escalation was received and acknowledged by the vendor — check the vendor portal for a status change, or call/email support referencing the ticket number for written acknowledgment',
        'Request a named point of contact and an update cadence — ask support explicitly for an assigned engineer/TAM name and a commitment on update frequency (e.g. every 4 hours)',
        'Document the escalation timeline for post-incident review — log timestamps of each contact/response in your ticketing system for the post-incident writeup',
      ],
    },
    'vendor:sla-breach': {
      title: 'Vendor SLA Breach',
      steps: [
        'Document the breach with timestamps for the vendor conversation — pull ticket open/response/resolution timestamps from your ticketing system and compare against the contracted SLA times',
        'Request root cause and a remediation plan from the vendor — formally request a root cause analysis (RCA) document via the account manager or support case',
        'Review contract terms for applicable service credits — check the MSA/SOW’s SLA remediation clause for service-credit eligibility and the claim process/deadline',
      ],
    },
    'vendor:shipment-delay': {
      title: 'Vendor Shipment Delay',
      steps: [
        'Confirm the new expected delivery date with the vendor — check the order tracking portal or call the vendor rep, get the revised date in writing',
        'Identify a workaround (loaner/rental hardware) if the delay impacts operations — check vendor loaner program availability, or source rental hardware from a local supplier',
        'Escalate if the delay exceeds the contractual delivery commitment — reference the PO/contract delivery clause when escalating to the vendor’s account manager',
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
    const missingHints = entry.steps
      .map((step, i) => (typeof step === 'string' && step.includes('—') ? null : i + 1))
      .filter((i) => i !== null);
    if (missingHints.length) {
      console.warn(
        `[knowledge-copilot] ${key}: step(s) ${missingHints.join(', ')} have no inline "how" hint ` +
          '(expected "<action> — <tool/menu path/command>"). Consider adding one.'
      );
    }
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
