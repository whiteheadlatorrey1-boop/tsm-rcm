/**
 * VMware Digital Twin
 * In-memory simulation of a small vSphere environment:
 * 2 clusters -> hosts -> VMs, plus shared datastores.
 * Supports fault injection so the Command Center can demo
 * failure/recovery scenarios without touching real infra.
 */

'use strict';

const FAULT_TYPES = ['host-down', 'datastore-full', 'ha-failover', 'network-partition', 'clear'];

function buildInitialState() {
  return {
    updatedAt: new Date().toISOString(),
    clusters: [
      {
        id: 'cluster-a',
        name: 'Cluster A (Prod)',
        haEnabled: true,
        hosts: [
          { id: 'esxi-a1', name: 'esxi-a1.local', status: 'up', cpuPct: 34, memPct: 51, vms: ['vm-web-01', 'vm-web-02'] },
          { id: 'esxi-a2', name: 'esxi-a2.local', status: 'up', cpuPct: 41, memPct: 60, vms: ['vm-app-01', 'vm-db-01'] },
        ],
      },
      {
        id: 'cluster-b',
        name: 'Cluster B (DR)',
        haEnabled: true,
        hosts: [
          { id: 'esxi-b1', name: 'esxi-b1.local', status: 'up', cpuPct: 12, memPct: 22, vms: ['vm-dr-01'] },
        ],
      },
    ],
    vms: {
      'vm-web-01': { id: 'vm-web-01', name: 'web-01', host: 'esxi-a1', status: 'running' },
      'vm-web-02': { id: 'vm-web-02', name: 'web-02', host: 'esxi-a1', status: 'running' },
      'vm-app-01': { id: 'vm-app-01', name: 'app-01', host: 'esxi-a2', status: 'running' },
      'vm-db-01':  { id: 'vm-db-01',  name: 'db-01',  host: 'esxi-a2', status: 'running' },
      'vm-dr-01':  { id: 'vm-dr-01',  name: 'dr-01',  host: 'esxi-b1', status: 'running' },
    },
    datastores: [
      { id: 'ds-prod-01', name: 'datastore-prod-01', capacityGB: 2048, usedGB: 900, status: 'healthy' },
      { id: 'ds-dr-01', name: 'datastore-dr-01', capacityGB: 1024, usedGB: 300, status: 'healthy' },
    ],
    events: [],
  };
}

class VMwareTwin {
  constructor() {
    this.state = buildInitialState();
  }

  getState() {
    return this.state;
  }

  reset() {
    this.state = buildInitialState();
    return this.state;
  }

  _findHost(hostId) {
    for (const cluster of this.state.clusters) {
      const host = cluster.hosts.find((h) => h.id === hostId);
      if (host) return { cluster, host };
    }
    return null;
  }

  _logEvent(message) {
    this.state.events.unshift({ ts: new Date().toISOString(), message });
    this.state.events = this.state.events.slice(0, 25);
  }

  /**
   * Apply a fault to the twin.
   * @param {string} type - one of FAULT_TYPES
   * @param {string} [targetId] - host id, datastore id, or cluster id depending on type
   */
  applyFault(type, targetId) {
    if (!FAULT_TYPES.includes(type)) {
      throw new Error(`Unknown fault type: ${type}`);
    }

    switch (type) {
      case 'host-down': {
        const found = this._findHost(targetId);
        if (!found) throw new Error(`Host not found: ${targetId}`);
        found.host.status = 'down';
        found.host.cpuPct = 0;
        found.host.memPct = 0;
        this._logEvent(`Host ${found.host.name} went down`);

        if (found.cluster.haEnabled) {
          const survivor = found.cluster.hosts.find((h) => h.id !== found.host.id && h.status === 'up');
          if (survivor) {
            for (const vmId of found.host.vms) {
              const vm = this.state.vms[vmId];
              if (vm) {
                vm.host = survivor.id;
                vm.status = 'running';
                survivor.vms.push(vmId);
              }
            }
            found.host.vms = [];
            this._logEvent(`HA restarted ${found.host.name}'s VMs on ${survivor.name}`);
          } else {
            for (const vmId of found.host.vms) {
              const vm = this.state.vms[vmId];
              if (vm) vm.status = 'orphaned';
            }
            this._logEvent(`HA failed: no surviving host in ${found.cluster.name}`);
          }
        }
        break;
      }

      case 'ha-failover': {
        const cluster = this.state.clusters.find((c) => c.id === targetId);
        if (!cluster) throw new Error(`Cluster not found: ${targetId}`);
        const downHost = cluster.hosts.find((h) => h.status === 'down' && h.vms.length === 0);
        this._logEvent(`Manual HA failover triggered on ${cluster.name}`);
        if (!downHost) this._logEvent(`No pending failover work for ${cluster.name}`);
        break;
      }

      case 'datastore-full': {
        const ds = this.state.datastores.find((d) => d.id === targetId);
        if (!ds) throw new Error(`Datastore not found: ${targetId}`);
        ds.usedGB = ds.capacityGB;
        ds.status = 'full';
        this._logEvent(`Datastore ${ds.name} reached capacity`);
        break;
      }

      case 'network-partition': {
        const found = this._findHost(targetId);
        if (!found) throw new Error(`Host not found: ${targetId}`);
        found.host.status = 'isolated';
        this._logEvent(`Host ${found.host.name} network-partitioned from vCenter`);
        break;
      }

      case 'clear': {
        this.reset();
        this._logEvent('Twin state reset to healthy baseline');
        break;
      }

      default:
        break;
    }

    this.state.updatedAt = new Date().toISOString();
    return this.state;
  }
}

module.exports = { VMwareTwin, FAULT_TYPES };
