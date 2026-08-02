/**
 * Network Digital Twin
 * In-memory simulation of a small enterprise network:
 * core/dist/access switches, a router pair, and the links between them.
 * Supports fault injection for demoing outages/degradation scenarios.
 */

'use strict';

const FAULT_TYPES = ['link-down', 'latency-spike', 'packet-loss', 'bgp-flap', 'clear'];

function buildInitialState() {
  return {
    updatedAt: new Date().toISOString(),
    nodes: [
      { id: 'rtr-core-1', name: 'Core Router 1', type: 'router', status: 'up', role: 'primary' },
      { id: 'rtr-core-2', name: 'Core Router 2', type: 'router', status: 'up', role: 'standby' },
      { id: 'sw-dist-1', name: 'Dist Switch 1', type: 'switch', status: 'up', role: 'distribution' },
      { id: 'sw-dist-2', name: 'Dist Switch 2', type: 'switch', status: 'up', role: 'distribution' },
      { id: 'sw-acc-1', name: 'Access Switch 1', type: 'switch', status: 'up', role: 'access' },
      { id: 'sw-acc-2', name: 'Access Switch 2', type: 'switch', status: 'up', role: 'access' },
    ],
    links: [
      { id: 'link-core1-core2', from: 'rtr-core-1', to: 'rtr-core-2', status: 'up', latencyMs: 1, lossPct: 0, bandwidthMbps: 10000, bgpSession: 'established' },
      { id: 'link-core1-dist1', from: 'rtr-core-1', to: 'sw-dist-1', status: 'up', latencyMs: 2, lossPct: 0, bandwidthMbps: 10000 },
      { id: 'link-core2-dist2', from: 'rtr-core-2', to: 'sw-dist-2', status: 'up', latencyMs: 2, lossPct: 0, bandwidthMbps: 10000 },
      { id: 'link-dist1-acc1', from: 'sw-dist-1', to: 'sw-acc-1', status: 'up', latencyMs: 3, lossPct: 0, bandwidthMbps: 1000 },
      { id: 'link-dist2-acc2', from: 'sw-dist-2', to: 'sw-acc-2', status: 'up', latencyMs: 3, lossPct: 0, bandwidthMbps: 1000 },
    ],
    events: [],
  };
}

class NetworkTwin {
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

  _findLink(linkId) {
    return this.state.links.find((l) => l.id === linkId) || null;
  }

  _findNode(nodeId) {
    return this.state.nodes.find((n) => n.id === nodeId) || null;
  }

  _logEvent(message) {
    this.state.events.unshift({ ts: new Date().toISOString(), message });
    this.state.events = this.state.events.slice(0, 25);
  }

  /**
   * Apply a fault to the twin.
   * @param {string} type - one of FAULT_TYPES
   * @param {string} [targetId] - link id (or node id for bgp-flap)
   */
  applyFault(type, targetId) {
    if (!FAULT_TYPES.includes(type)) {
      throw new Error(`Unknown fault type: ${type}`);
    }

    switch (type) {
      case 'link-down': {
        const link = this._findLink(targetId);
        if (!link) throw new Error(`Link not found: ${targetId}`);
        link.status = 'down';
        link.latencyMs = null;
        this._logEvent(`Link ${link.id} (${link.from} <-> ${link.to}) went down`);

        // Mark downstream node as unreachable if this was its only up link.
        const downstream = this._findNode(link.to);
        const stillReachable = this.state.links.some(
          (l) => l.id !== link.id && l.status === 'up' && (l.from === link.to || l.to === link.to)
        );
        if (downstream && !stillReachable) {
          downstream.status = 'unreachable';
          this._logEvent(`${downstream.name} is now unreachable`);
        }
        break;
      }

      case 'latency-spike': {
        const link = this._findLink(targetId);
        if (!link) throw new Error(`Link not found: ${targetId}`);
        link.latencyMs = (link.latencyMs || 1) + 150;
        this._logEvent(`Latency spike injected on ${link.id} (+150ms)`);
        break;
      }

      case 'packet-loss': {
        const link = this._findLink(targetId);
        if (!link) throw new Error(`Link not found: ${targetId}`);
        link.lossPct = 15;
        this._logEvent(`Packet loss injected on ${link.id} (15%)`);
        break;
      }

      case 'bgp-flap': {
        const link = this._findLink(targetId);
        if (!link || !('bgpSession' in link)) {
          throw new Error(`No BGP session on link: ${targetId}`);
        }
        link.bgpSession = 'flapping';
        this._logEvent(`BGP session flapping on ${link.id}`);
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

module.exports = { NetworkTwin, FAULT_TYPES };
