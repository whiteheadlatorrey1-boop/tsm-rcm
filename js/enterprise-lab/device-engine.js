import eventBus from './event-bus.js';

/**
 * DeviceEngine - Manages the digital twin state of all enterprise hardware, servers, and networks.
 * Responds to admin tasks (reboots, config updates) and monitors system status.
 */
class DeviceEngine {
  constructor() {
    this.devices = {};
    this.init();
  }

  init() {
    // Load existing devices from simulator state or build the default inventory
    const cachedState = localStorage.getItem('tsm_simulator_state');
    if (cachedState) {
      try {
        const parsed = JSON.parse(cachedState);
        if (parsed.devices && Object.keys(parsed.devices).length > 0) {
          this.devices = parsed.devices;
        } else {
          this.loadDefaultInventory();
        }
      } catch (e) {
        this.loadDefaultInventory();
      }
    } else {
      this.loadDefaultInventory();
    }

    // Listen to device state mutations and administrative actions
    eventBus.on('device:state-change', (data) => this.setDeviceState(data.deviceId, data.status, data.metrics));
    eventBus.on('device:reboot', (data) => this.rebootDevice(data.deviceId));
    eventBus.on('device:restart-service', (data) => this.restartService(data.deviceId, data.serviceName));
    
    // Periodically update active server telemetry (CPU/RAM fluctuations under load)
    eventBus.on('sim:tick', () => this.updateTelemetryFluctuations());

    // Clean wipe on reset
    eventBus.on('sim:reset-complete', () => {
      this.loadDefaultInventory();
    });
  }

  /**
   * Builds the default corporate landscape if no cache exists.
   */
  loadDefaultInventory() {
    this.devices = {
      // Core Active Directory & Domain Infrastructure
      'dc-01': {
        id: 'dc-01',
        name: 'TSM-DC-01',
        type: 'server',
        role: 'Domain Controller / DNS',
        ip: '10.100.10.10',
        status: 'online', // online, degraded, offline, rebooting
        cpu: 18,
        ram: 45,
        services: { 'ActiveDirectory': 'running', 'DNS': 'running' },
        os: 'Windows Server 2022'
      },
      // Virtualization Environment
      'esxi-01': {
        id: 'esxi-01',
        name: 'TSM-ESXI-PROD-01',
        type: 'hypervisor',
        role: 'VMware Host',
        ip: '10.100.10.50',
        status: 'online',
        cpu: 42,
        ram: 78,
        vms: ['crm-prod', 'sql-shared', 'web-gateway'],
        os: 'VMware ESXi 8.0'
      },
      // Application Servers
      'crm-prod': {
        id: 'crm-prod',
        name: 'CRM-PROD-01',
        type: 'virtual_machine',
        role: 'Customer database',
        ip: '10.100.20.15',
        status: 'online',
        cpu: 12,
        ram: 58,
        services: { 'IISWeb': 'running', 'MS-SQL': 'running' },
        os: 'Windows Server 2019'
      },
      // Network Gateways
      'vpn-gateway-01': {
        id: 'vpn-gateway-01',
        name: 'HQ-ASA-VPN-01',
        type: 'firewall',
        role: 'Cisco AnyConnect VPN Gateway',
        ip: '10.100.1.1',
        status: 'online',
        cpu: 8,
        ram: 25,
        connections: 184,
        os: 'Cisco ASA'
      },
      // Shared Hardware
      'print-sales-01': {
        id: 'print-sales-01',
        name: 'Sales-Copier-HP',
        type: 'printer',
        role: 'Department Printer',
        ip: '10.100.30.80',
        status: 'online',
        toner: 84,
        paperLoaded: true,
        jobsInQueue: 0
      }
    };

    this.commitToState();
  }

  /**
   * Sets the operational status and specific metrics for a target asset.
   */
  setDeviceState(deviceId, status, metrics = {}) {
    const device = this.devices[deviceId];
    if (!device) return;

    device.status = status;
    Object.assign(device, metrics);
    
    this.commitToState();
    
    eventBus.emit('system:log', { 
      message: `Device state change: ${device.name} is now ${status.toUpperCase()}`, 
      type: status === 'online' ? 'info' : 'danger' 
    });

    eventBus.emit('device:updated', { deviceId, device });
  }

  /**
   * Simulates a clean device restart sequence.
   */
  rebootDevice(deviceId) {
    const device = this.devices[deviceId];
    if (!device || device.status === 'rebooting') return;

    const originalStatus = device.status;
    device.status = 'rebooting';
    device.cpu = 0;
    device.ram = 0;
    this.commitToState();

    eventBus.emit('system:log', { message: `Initiating reboot sequence on ${device.name}...`, type: 'warn' });
    eventBus.emit('device:updated', { deviceId, device });

    // Wait 5 seconds (simulated boot cycle) to restore online state
    setTimeout(() => {
      // Re-fetch in case state changed during reboot
      const activeDevice = this.devices[deviceId];
      if (activeDevice) {
        activeDevice.status = 'online';
        activeDevice.cpu = 15;
        activeDevice.ram = 40;
        
        // Restart all standard services
        if (activeDevice.services) {
          Object.keys(activeDevice.services).forEach(srv => {
            activeDevice.services[srv] = 'running';
          });
        }

        this.commitToState();
        eventBus.emit('system:log', { message: `Reboot complete: ${activeDevice.name} is back online.`, type: 'success' });
        eventBus.emit('device:updated', { deviceId: activeDevice.id, device: activeDevice });
      }
    }, 5000);
  }

  /**
   * Recovers/restarts a crashed software service on an active server.
   */
  restartService(deviceId, serviceName) {
    const device = this.devices[deviceId];
    if (!device || !device.services || !device.services[serviceName]) return;

    device.services[serviceName] = 'running';
    this.commitToState();

    eventBus.emit('system:log', { 
      message: `Service '${serviceName}' successfully restarted on ${device.name}.`, 
      type: 'success' 
    });
    eventBus.emit('device:updated', { deviceId, device });
  }

  /**
   * Organic baseline fluctuations for device CPU/RAM metrics during idle cycles.
   */
  updateTelemetryFluctuations() {
    let stateChanged = false;

    Object.values(this.devices).forEach(device => {
      if (device.status === 'online') {
        const cpuNoise = (Math.random() - 0.5) * 4;
        device.cpu = Math.min(Math.max(Math.round((device.cpu || 15) + cpuNoise), 2), 95);
        stateChanged = true;
      }
    });

    if (stateChanged) {
      this.commitToState();
    }
  }

  commitToState() {
    // Calculate global system health based on asset status
    const totalDevices = Object.keys(this.devices).length;
    const workingDevices = Object.values(this.devices).filter(d => d.status === 'online').length;
    const globalHealth = Math.round((workingDevices / totalDevices) * 100);

    eventBus.emit('state:mutate', { key: 'devices', value: this.devices });
    eventBus.emit('state:mutate', { key: 'enterpriseHealth', value: globalHealth });
  }
}

// Self-instantiate as a singleton
const deviceEngine = new DeviceEngine();
export default deviceEngine;