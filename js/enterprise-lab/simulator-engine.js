import eventBus from './event-bus.js';

// Default initial state representing our network nodes, services, and tickers
const INITIAL_STATE = {
  gameTime: 0, // In seconds
  enterpriseHealth: 100,
  metrics: {
    globalCpu: 20,
    globalRam: 35
  },
  devices: {
    'srv-db-01': {
      id: 'srv-db-01',
      name: 'srv-db-01',
      ip: '10.100.4.15',
      role: 'Production database',
      type: 'server',
      os: 'Ubuntu Server 22.04 LTS',
      status: 'online', // online, degraded, critical, offline, rebooting
      cpu: 18,
      ram: 45,
      services: {
        'postgresql': 'running',
        'redis': 'running'
      }
    },
    'fw-edge-01': {
      id: 'fw-edge-01',
      name: 'fw-edge-01',
      ip: '10.100.1.1',
      role: 'Edge Security Gateway',
      type: 'firewall',
      status: 'online',
      cpu: 12,
      connections: 142,
      services: {
        'iptables': 'running',
        'vpn-daemon': 'running'
      }
    },
    'srv-web-01': {
      id: 'srv-web-01',
      name: 'srv-web-01',
      ip: '10.100.4.50',
      role: 'Client Portal Host',
      type: 'virtual_machine',
      os: 'Debian 12',
      status: 'online',
      cpu: 25,
      ram: 30,
      services: {
        'nginx': 'running',
        'node-api': 'running'
      }
    },
    'prn-finance-01': {
      id: 'prn-finance-01',
      name: 'prn-finance-01',
      ip: '10.100.12.80',
      role: 'Accounting Office Jet',
      type: 'printer',
      status: 'online',
      toner: 85,
      jobsInQueue: 0
    }
  },
  tickets: []
};

class SimulatorEngine {
  constructor() {
    this.state = this.loadState();
    this.intervalId = null;
    this.isSimulating = false;

    // Set up broadcast command listeners
    this.setupListeners();
  }

  loadState() {
    const cached = localStorage.getItem('tsm_simulator_state');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { }
    }
    return JSON.parse(JSON.stringify(INITIAL_STATE));
  }

  saveState() {
    localStorage.setItem('tsm_simulator_state', JSON.stringify(this.state));
  }

  setupListeners() {
    // Listen for incoming reboot intents from the interactive dashboards
    eventBus.on('device:reboot', (data) => {
      this.triggerReboot(data.deviceId);
    });

    // Listen for service restart operations
    eventBus.on('device:restart-service', (data) => {
      this.restartService(data.deviceId, data.serviceName);
    });

    // Global simulator controls
    eventBus.on('sim:start', () => this.start());
    eventBus.on('sim:stop', () => this.stop());
    eventBus.on('sim:reset', () => this.reset());
  }

  start() {
    if (this.isSimulating) return;
    this.isSimulating = true;
    this.log('NOC Engine Init... Launching main operational thread', 'success');

    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000); // 1-second system tick
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.isSimulating = false;
    this.log('Operational engine paused by administrative terminal', 'warn');
  }

  reset() {
    this.stop();
    localStorage.removeItem('tsm_simulator_state');
    this.state = JSON.stringify(INITIAL_STATE);
    this.state = JSON.parse(this.state);
    this.saveState();
    this.log('State database wiped clean. Reinitializing hardware matrix.', 'info');
    eventBus.emit('sim:reset-complete');
  }

  log(message, type = 'info') {
    eventBus.emit('system:log', { message, type });
  }

  // --- ENGINE TICK LOGIC ---
  tick() {
    this.state.gameTime++;
    
    // 1. Process active system behaviors (reboot cooling down, metrics drift)
    this.processDevices();
    this.processTickets();
    this.calculateSystemMetrics();

    // 2. Random failure injection logic
    this.injectRandomFaults();

    // 3. Save and broadcast global clock frame to all listening tabs
    this.saveState();
    eventBus.emit('sim:tick', {
      gameTime: this.state.gameTime,
      state: this.state
    });
  }

  processDevices() {
    Object.keys(this.state.devices).forEach(id => {
      const d = this.state.devices[id];
      
      // If a device is currently undergoing a hard reboot cycle
      if (d.status === 'rebooting') {
        if (!d.rebootTimer) d.rebootTimer = 10; // 10-second boot cycle
        d.rebootTimer--;
        
        if (d.rebootTimer <= 0) {
          d.status = 'online';
          d.cpu = 5;
          d.ram = 20;
          delete d.rebootTimer;
          
          // Clear crashed services on boot
          if (d.services) {
            Object.keys(d.services).forEach(s => d.services[s] = 'running');
          }
          this.log(`Device [${d.name}] completed self-test. Interfaces recovered online.`, 'success');
        }
      } else if (d.status === 'online') {
        // Normal state drift (minor random fluctuation in standard metrics)
        if (d.cpu !== undefined) d.cpu = Math.max(5, Math.min(95, d.cpu + (Math.random() > 0.5 ? 2 : -2)));
        if (d.ram !== undefined) d.ram = Math.max(15, Math.min(90, d.ram + (Math.random() > 0.5 ? 1 : -1)));
      }
    });
  }

  processTickets() {
    // Scan all active tickets in simulation queue and check for SLA expiration
    this.state.tickets.forEach(t => {
      if ((t.status === 'open' || t.status === 'in_progress') && t.deadline) {
        if (this.state.gameTime >= t.deadline) {
          t.status = 'breached';
          this.log(`CRITICAL: Incident SLA limit reached on ticket ${t.id}!`, 'danger');
        }
      }
    });
  }

  calculateSystemMetrics() {
    let activeDevCount = 0;
    let unhealthyCount = 0;
    let aggregatedCpu = 0;
    let aggregatedRam = 0;
    let cpuReportingNodes = 0;

    Object.keys(this.state.devices).forEach(id => {
      const d = this.state.devices[id];
      activeDevCount++;
      if (d.status !== 'online') {
        unhealthyCount++;
      }
      if (d.cpu !== undefined) {
        aggregatedCpu += d.cpu;
        cpuReportingNodes++;
      }
      if (d.ram !== undefined) {
        aggregatedRam += d.ram;
      }
    });

    // Health Score logic (simple deduction model)
    const healthPercent = Math.round(((activeDevCount - unhealthyCount) / activeDevCount) * 100);
    this.state.enterpriseHealth = healthPercent;

    this.state.metrics.globalCpu = cpuReportingNodes > 0 ? Math.round(aggregatedCpu / cpuReportingNodes) : 0;
    this.state.metrics.globalRam = cpuReportingNodes > 0 ? Math.round(aggregatedRam / cpuReportingNodes) : 0;
  }

  injectRandomFaults() {
    // Inject incident scenario every 45-60 seconds on average
    if (this.state.gameTime > 10 && this.state.gameTime % 45 === 0) {
      this.generateIncident();
    }
  }

  generateIncident() {
    const dKeys = Object.keys(this.state.devices);
    const targetId = dKeys[Math.floor(Math.random() * dKeys.length)];
    const device = this.state.devices[targetId];

    if (device.status !== 'online') return; // Skip if already compromised

    // Choose target error profiles depending on system hardware type
    if (device.services) {
      const srvKeys = Object.keys(device.services);
      const targetSrv = srvKeys[Math.floor(Math.random() * srvKeys.length)];
      
      device.services[targetSrv] = 'stopped';
      device.status = 'degraded';
      device.cpu = 95; // System maxes out on error processes

      const ticketId = 'INC-' + Math.floor(100000 + Math.random() * 900000);
      const newTicket = {
        id: ticketId,
        title: `Service failure: Daemon [${targetSrv}] has crash-halted on ${device.name}`,
        category: 'Services',
        priority: 'high',
        status: 'open',
        impactedNode: device.name,
        reportedBy: 'NOC-Syslog-Daemon',
        deadline: this.state.gameTime + 90, // 90-second SLA limit
        targetService: targetSrv
      };

      this.state.tickets.push(newTicket);
      this.log(`ALERT: System generated helpdesk incident record ${ticketId} for host ${device.name}`, 'warn');
    } else if (device.type === 'printer') {
      device.status = 'critical';
      device.jobsInQueue = 5;

      const ticketId = 'INC-' + Math.floor(100000 + Math.random() * 900000);
      const newTicket = {
        id: ticketId,
        title: `Accounting queue blocked - Jam or hardware fault on ${device.name}`,
        category: 'Hardware',
        priority: 'medium',
        status: 'open',
        impactedNode: device.name,
        reportedBy: 'L1-Office-Assistant',
        deadline: this.state.gameTime + 120
      };

      this.state.tickets.push(newTicket);
      this.log(`ALERT: User filed hardware complaint ticket ${ticketId}`, 'warn');
    }
  }

  // --- ACTIONS ENGINE ---
  triggerReboot(deviceId) {
    const d = this.state.devices[deviceId];
    if (d) {
      d.status = 'rebooting';
      d.cpu = 0;
      d.ram = 0;
      d.rebootTimer = 10;
      
      // Auto-resolve corresponding tickets on reboot
      this.state.tickets.forEach(t => {
        if (t.impactedNode === d.name && (t.status === 'open' || t.status === 'in_progress')) {
          t.status = 'resolved';
          this.log(`Ticket ${t.id} automatically set to resolved via hardware power cycle`, 'success');
        }
      });

      this.log(`NOC Override Packet: Firing physical power-relay cycle signal to ${d.name}`, 'warn');
      this.saveState();
    }
  }

  restartService(deviceId, serviceName) {
    const d = this.state.devices[deviceId];
    if (d && d.services && d.services[serviceName]) {
      this.log(`Executing targeted process startup for daemon [${serviceName}] on host ${d.name}...`, 'info');
      
      setTimeout(() => {
        // Validate system isn't completely dead or rebooting in-between
        const targetState = this.loadState();
        const activeNode = targetState.devices[deviceId];
        if (activeNode && activeNode.status !== 'rebooting') {
          activeNode.services[serviceName] = 'running';
          
          // If no other services are down, restore server to online status
          const stillDown = Object.values(activeNode.services).includes('stopped');
          activeNode.status = stillDown ? 'degraded' : 'online';
          if (!stillDown) activeNode.cpu = 20;

          // Resolve respective system ticket
          targetState.tickets.forEach(t => {
            if (t.impactedNode === activeNode.name && t.targetService === serviceName) {
              t.status = 'resolved';
              this.log(`Ticket ${t.id} successfully auto-resolved via remote service manager!`, 'success');
            }
          });

          this.state = targetState;
          this.saveState();
        }
      }, 2000); // 2 second mock system initialization delay
    }
  }
}

// Global engine instanced context
const engine = new SimulatorEngine();
export default engine;