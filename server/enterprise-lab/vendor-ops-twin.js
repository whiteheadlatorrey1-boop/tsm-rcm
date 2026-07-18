'use strict';

const FAULT_TYPES = ['vendor-outage', 'ticket-escalated', 'sla-breach', 'shipment-delay', 'clear'];

function buildInitialState() {
  return {
    updatedAt: new Date().toISOString(),
    vendors: [
      { id: 'vendor-isp', name: 'Regional ISP', category: 'connectivity', status: 'healthy', slaTargetHours: 4 },
      { id: 'vendor-hw', name: 'Hardware Supplier', category: 'hardware', status: 'healthy', slaTargetHours: 48 },
      { id: 'vendor-cloud', name: 'Cloud Provider', category: 'cloud', status: 'healthy', slaTargetHours: 2 },
    ],
    tickets: [],
    events: [],
    nextTicketId: 1,
  };
}

class VendorOpsTwin {
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

  _logEvent(message) {
    this.state.events.unshift({ ts: new Date().toISOString(), message });
    this.state.events = this.state.events.slice(0, 25);
  }

  openTicket(vendorId, subject, priority) {
    const vendor = this.state.vendors.find((v) => v.id === vendorId);
    if (!vendor) throw new Error(`Vendor not found: ${vendorId}`);
    const ticket = {
      id: `ticket-${this.state.nextTicketId}`,
      vendorId,
      subject: subject || 'Vendor issue',
      priority: priority || 'normal',
      status: 'open',
      openedAt: new Date().toISOString(),
      slaBreached: false,
    };
    this.state.nextTicketId += 1;
    this.state.tickets.unshift(ticket);
    this._logEvent(`Ticket opened for ${vendor.name}: ${ticket.subject} (${ticket.id})`);
    this.state.updatedAt = new Date().toISOString();
    return ticket;
  }

  applyFault(type, targetId) {
    if (!FAULT_TYPES.includes(type)) {
      throw new Error(`Unknown fault type: ${type}`);
    }

    switch (type) {
      case 'vendor-outage': {
        const vendor = this.state.vendors.find((v) => v.id === targetId);
        if (!vendor) throw new Error(`Vendor not found: ${targetId}`);
        vendor.status = 'outage';
        this.openTicket(targetId, `${vendor.name} service outage`, 'high');
        this._logEvent(`Vendor outage: ${vendor.name}`);
        break;
      }

      case 'ticket-escalated': {
        const ticket = this.state.tickets.find((t) => t.id === targetId);
        if (!ticket) throw new Error(`Ticket not found: ${targetId}`);
        ticket.priority = 'high';
        this._logEvent(`Ticket escalated: ${ticket.id}`);
        break;
      }

      case 'sla-breach': {
        const ticket = this.state.tickets.find((t) => t.id === targetId);
        if (!ticket) throw new Error(`Ticket not found: ${targetId}`);
        ticket.slaBreached = true;
        this._logEvent(`SLA breached on ticket: ${ticket.id}`);
        break;
      }

      case 'shipment-delay': {
        const vendor = this.state.vendors.find((v) => v.id === targetId);
        if (!vendor) throw new Error(`Vendor not found: ${targetId}`);
        vendor.status = 'delayed';
        this._logEvent(`Shipment delayed: ${vendor.name}`);
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

module.exports = { VendorOpsTwin, FAULT_TYPES };
