import eventBus from './event-bus.js';

/**
 * TicketEngine - Manages the creation, updates, and SLA tracking of IT tickets.
 * Syncs ticket states directly into the Simulator's global state.
 */
class TicketEngine {
  constructor() {
    this.tickets = [];
    this.init();
  }

  init() {
    // Sync with initial simulator state if it already exists
    const cachedState = localStorage.getItem('tsm_simulator_state');
    if (cachedState) {
      try {
        const parsed = JSON.parse(cachedState);
        this.tickets = parsed.tickets || [];
      } catch (e) {
        this.tickets = [];
      }
    }

    // Listen for clock ticks to decrement SLAs
    eventBus.on('sim:tick', () => this.evaluateSlas());

    // Listen for ticket-related mutations from the Copilot UI or Scenario Manager
    eventBus.on('ticket:create', (ticketData) => this.createTicket(ticketData));
    eventBus.on('ticket:update', (data) => this.updateTicket(data.ticketId, data.updates));
    eventBus.on('ticket:resolve', (data) => this.resolveTicket(data.ticketId, data.resolutionCode));
    
    // If the system is hard reset, wipe our local memory
    eventBus.on('sim:reset-complete', () => {
      this.tickets = [];
    });
  }

  /**
   * Generates a new ticket and commits it to global state.
   */
  createTicket(ticketData) {
    const defaultSlaMinutes = ticketData.priority === 'P1' ? 15 : ticketData.priority === 'P2' ? 60 : 240;
    
    const newTicket = {
      id: 'TKT-' + Math.floor(100000 + Math.random() * 900000),
      title: ticketData.title || "Generic System Issue",
      description: ticketData.description || "No description provided.",
      category: ticketData.category || "General",
      priority: ticketData.priority || "P3",
      status: "Open",
      assignedTo: ticketData.assignedTo || null,
      affectedUser: ticketData.affectedUser || "System Generated",
      createdAt: Date.now(),
      slaRemainingSeconds: defaultSlaMinutes * 60,
      slaBreached: false,
      resolution: null,
      ...ticketData
    };

    this.tickets.push(newTicket);
    this.commitToState();

    eventBus.emit('system:log', { 
      message: `New ticket created: ${newTicket.id} (${newTicket.priority}) - ${newTicket.title}`, 
      type: 'info' 
    });
    
    eventBus.emit('ticket:created-notification', newTicket);
  }

  /**
   * Modifies fields on an existing ticket.
   */
  updateTicket(ticketId, updates) {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    Object.assign(ticket, updates);
    this.commitToState();

    eventBus.emit('ticket:updated-notification', { ticketId, ticket });
  }

  /**
   * Resolves a ticket and awards score/XP targets.
   */
  resolveTicket(ticketId, resolutionCode) {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (!ticket || ticket.status === 'Resolved') return;

    ticket.status = 'Resolved';
    ticket.resolvedAt = Date.now();
    ticket.resolution = resolutionCode;
    
    this.commitToState();

    eventBus.emit('system:log', { 
      message: `Ticket ${ticketId} resolved successfully.`, 
      type: 'success' 
    });

    // Award XP based on priority and whether they beat the SLA
    const baseXp = ticket.priority === 'P1' ? 150 : ticket.priority === 'P2' ? 75 : 30;
    const slaBonus = !ticket.slaBreached ? Math.round(baseXp * 0.3) : 0;

    eventBus.emit('profile:award-xp', { 
      amount: baseXp + slaBonus, 
      reason: `Resolved ${ticketId} (${ticket.priority})` 
    });

    eventBus.emit('ticket:resolved-notification', { ticketId, ticket });
  }

  /**
   * Counts down SLAs on open tickets during each tick.
   */
  evaluateSlas() {
    let stateChanged = false;

    this.tickets.forEach(ticket => {
      if (ticket.status !== 'Resolved' && ticket.status !== 'Closed') {
        if (ticket.slaRemainingSeconds > 0) {
          ticket.slaRemainingSeconds -= 1;
          stateChanged = true;
          
          if (ticket.slaRemainingSeconds === 0 && !ticket.slaBreached) {
            ticket.slaBreached = true;
            eventBus.emit('ticket:sla-breached', ticket);
            eventBus.emit('system:log', { 
              message: `SLA BREACH: ${ticket.id} (${ticket.title}) has breached target resolution window!`, 
              type: 'danger' 
            });
          }
        }
      }
    });

    if (stateChanged) {
      this.commitToState();
    }
  }

  /**
   * Saves local engine state back to the Simulator state manager.
   */
  commitToState() {
    const openCount = this.tickets.filter(t => t.status !== 'Resolved').length;
    
    eventBus.emit('state:mutate', { key: 'tickets', value: this.tickets });
    eventBus.emit('state:mutate', { key: 'metrics.openTickets', value: openCount });
  }
}

// Self-instantiate as a singleton
const ticketEngine = new TicketEngine();
export default ticketEngine;