/**
 * TSM Enterprise Lab - NOC Command Center Interface Engine
 * Orchestrates real-time rendering, telemetry stream updates, 
 * device action signaling, and state persistence for the NOC interface.
 * 
 * INTEGRATION UPDATE: Dispatches custom events to auto-populate the L1 Copilot.
 */
import eventBus from './event-bus.js';

class NocDashboardController {
  constructor() {
    this.cachedDevices = {};
    this.selectedDeviceId = null;

    // Cache DOM Elements
    this.dom = {
      assetGrid: document.getElementById('asset-grid'),
      metricHealth: document.getElementById('metric-health'),
      metricHealthBar: document.getElementById('metric-health-bar'),
      metricCpu: document.getElementById('metric-cpu'),
      metricCpuBar: document.getElementById('metric-cpu-bar'),
      metricRam: document.getElementById('metric-ram'),
      metricRamBar: document.getElementById('metric-ram-bar'),
      diagnosticPanel: document.getElementById('diagnostic-panel'),
      clockText: document.getElementById('sim-time'),
      logContainer: document.getElementById('noc-logs-container'),
      syncStatus: document.getElementById('sync-status'),
      syncText: document.getElementById('sync-text')
    };

    this.init();
  }

  init() {
    this.registerEventBindings();
    this.loadCachedState();
  }

  /**
   * Register event handlers with the EventBus
   */
  registerEventBindings() {
    // 1. Core Simulation Tick Listeners
    eventBus.on('sim:tick', (data) => this.handleSimTick(data));

    // 2. Telemetry and Diagnostic Logging Stream Listener
    eventBus.on('system:log', (data) => this.writeSystemLog(data));

    // 3. System Reset Signals
    eventBus.on('sim:reset-complete', () => {
      this.writeSystemLog({ type: 'info', message: 'Simulator reset detected. Reloading interface...' });
      setTimeout(() => window.location.reload(), 1000);
    });

    // 4. Connection drop indicator handling
    eventBus.on('sim:disconnected', () => {
      if (this.dom.syncStatus && this.dom.syncText) {
        this.dom.syncStatus.className = 'status-indicator offline';
        this.dom.syncText.textContent = 'SYNC INTERRUPTED';
        this.dom.syncText.classList.add('text-danger');
      }
    });
  }

  /**
   * Attempt to populate UI quickly before the next engine tick fires
   */
  loadCachedState() {
    const rawCache = localStorage.getItem('tsm_simulator_state');
    if (rawCache) {
      try {
        const state = JSON.parse(rawCache);
        if (state.devices) {
          this.renderDevices(state.devices);
        }
      } catch (err) {
        console.warn("Failed to load historical cache state:", err);
      }
    }
  }

  /**
   * Synchronizes and displays global simulation telemetries 
   */
  handleSimTick(data) {
    // Acknowledge connection sync
    if (this.dom.syncStatus && this.dom.syncText) {
      this.dom.syncStatus.className = 'status-indicator online';
      this.dom.syncText.textContent = 'SYNC ACTIVE';
      this.dom.syncText.classList.remove('text-danger');
    }

    // Process Simulation Clock
    const sec = data.gameTime || 0;
    const hrs = String(Math.floor(sec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const secs = String(sec % 60).padStart(2, '0');
    if (this.dom.clockText) {
      this.dom.clockText.textContent = `TIME: ${hrs}:${mins}:${secs}`;
    }

    // Update Top Metric Panels
    const state = data.state;
    if (state) {
      if (this.dom.metricHealth && this.dom.metricHealthBar) {
        const healthVal = state.enterpriseHealth ?? 100;
        this.dom.metricHealth.textContent = `${healthVal}%`;
        this.dom.metricHealthBar.style.width = `${healthVal}%`;
        
        let color = 'var(--status-success)';
        if (healthVal <= 50) color = 'var(--status-danger)';
        else if (healthVal <= 80) color = 'var(--status-warning)';
        this.dom.metricHealthBar.style.backgroundColor = color;
      }

      if (this.dom.metricCpu && this.dom.metricCpuBar) {
        const cpuVal = state.metrics?.globalCpu ?? 0;
        this.dom.metricCpu.textContent = `${cpuVal}%`;
        this.dom.metricCpuBar.style.width = `${cpuVal}%`;
      }

      if (this.dom.metricRam && this.dom.metricRamBar) {
        const ramVal = state.metrics?.globalRam ?? 0;
        this.dom.metricRam.textContent = `${ramVal}%`;
        this.dom.metricRamBar.style.width = `${ramVal}%`;
      }

      // Repopulate Interactive Asset Grid
      if (state.devices) {
        this.renderDevices(state.devices);
        
        // Keep active diagnostics metrics in lockstep
        if (this.selectedDeviceId && state.devices[this.selectedDeviceId]) {
          this.loadDiagnostics(this.selectedDeviceId);
        }
      }
    }
  }

  /**
   * Render managed asset inventory grids
   */
  renderDevices(devices) {
    this.cachedDevices = devices;
    if (!this.dom.assetGrid) return;
    
    this.dom.assetGrid.innerHTML = '';
    
    Object.keys(devices).forEach(id => {
      const d = devices[id];
      const card = document.createElement('div');
      card.className = `card device-card ${d.status}`;
      card.style.cursor = 'pointer';
      
      // Selected visual indicator toggle
      if (this.selectedDeviceId === d.id) {
        card.style.borderColor = 'var(--status-info)';
        card.style.transform = 'scale(0.99)';
      }

      // CLICK BINDING: Synchronizes Local Panel & fires bridge event to L1 Ticket Copilot
      card.addEventListener('click', () => {
        this.selectedDeviceId = d.id;
        this.loadDiagnostics(d.id);

        // Dispatch L1 Copilot Bridge Event
        const event = new CustomEvent('noc-asset-selected', { detail: d });
        window.dispatchEvent(event);

        // Force immediate rerender of other grids to draw active selections
        this.renderDevices(this.cachedDevices);
      });

      // Format physical or virtual hardware specs
      let specString = '';
      if (['server', 'virtual_machine', 'hypervisor'].includes(d.type)) {
        specString = `
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-top: 0.5rem; color: var(--text-secondary)">
            <span>CPU: ${d.cpu}%</span>
            <span>RAM: ${d.ram}%</span>
          </div>
        `;
      } else if (d.type === 'firewall' || d.type === 'networking') {
        specString = `
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-top: 0.5rem; color: var(--text-secondary)">
            <span>CPU: ${d.cpu ?? 0}%</span>
            <span>Status: ${d.services?.vlan_routing || 'Active'}</span>
          </div>
        `;
      } else if (d.type === 'printer') {
        specString = `
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-top: 0.5rem; color: var(--text-secondary)">
            <span>Toner: ${d.toner ?? 100}%</span>
            <span>Queue: ${d.jobsInQueue ?? 0} jobs</span>
          </div>
        `;
      } else if (d.type === 'hardware') {
        specString = `
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-top: 0.5rem; color: var(--text-secondary)">
            <span>Power: ${d.initialTelemetry?.services?.power || 'Active'}</span>
            <span>BIOS: ${d.initialTelemetry?.services?.bios || 'Active'}</span>
          </div>
        `;
      }

      // Render software daemons state
      let servicesList = '';
      if (d.services) {
        servicesList = '<div style="display: flex; gap: 0.25rem; flex-wrap: wrap; margin-top: 0.5rem;">';
        Object.keys(d.services).forEach(srv => {
          const statusClass = d.services[srv];
          servicesList += `<span class="service-badge ${statusClass}">${srv}</span>`;
        });
        servicesList += '</div>';
      }

      card.innerHTML = `
        <div class="flex-between">
          <span class="mono" style="font-size: 0.8rem; color: var(--text-muted)">${d.ip || 'Local Network'}</span>
          <span class="badge badge-${d.status === 'online' ? 'success' : d.status === 'rebooting' ? 'info' : 'danger'}">${d.status}</span>
        </div>
        <h4 style="margin: 0.25rem 0 0.15rem 0; font-size: 1.1rem;">${d.name}</h4>
        <span style="font-size: 0.75rem; color: var(--text-secondary); display: block;">${d.role}</span>
        ${specString}
        ${servicesList}
      `;
      
      this.dom.assetGrid.appendChild(card);
    });
  }

  /**
   * Dynamic side panel diagnostics loader
   */
  loadDiagnostics(deviceId) {
    const device = this.cachedDevices[deviceId];
    if (!device || !this.dom.diagnosticPanel) return;

    let actions = '';
    if (device.status === 'rebooting') {
      actions = `<div style="color: var(--status-info); font-weight: 500; text-align:center;">Reboot sequence is in progress...</div>`;
    } else {
      actions = `<button class="btn btn-danger" id="btn-reboot-node" style="width: 100%; margin-bottom: 0.5rem;">Hard Reboot Device</button>`;
      
      if (device.services) {
        actions += `<div style="margin-top: 0.75rem; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; margin-bottom: 0.25rem;">Local Software Daemons</div>`;
        Object.keys(device.services).forEach(srv => {
          const state = device.services[srv];
          if (state === 'stopped' || state === 'offline' || state === 'failed') {
            actions += `<button class="btn btn-secondary btn-restart-srv" data-service="${srv}" style="width: 100%; font-size: 0.75rem; padding: 0.25rem; margin-top: 0.25rem;">Start Service: ${srv}</button>`;
          } else {
            actions += `<div style="font-size: 0.75rem; color: var(--status-success); padding: 0.25rem 0; display: flex; justify-content: space-between;"><span>${srv}</span><span>Active</span></div>`;
          }
        });
      }
    }

    this.dom.diagnosticPanel.innerHTML = `
      <h4 style="font-size: 1rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
        <span class="status-indicator ${device.status === 'online' ? 'online' : device.status === 'rebooting' ? 'warning' : 'danger'}"></span>
        ${device.name}
      </h4>
      <table style="width: 100%; font-size: 0.75rem; margin-bottom: 1rem; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid var(--border-color);"><td style="padding: 0.25rem 0; color: var(--text-muted)">Role:</td><td style="text-align: right; font-weight: 500;">${device.role || 'Workstation'}</td></tr>
        <tr style="border-bottom: 1px solid var(--border-color);"><td style="padding: 0.25rem 0; color: var(--text-muted)">OS Platform:</td><td style="text-align: right; font-weight: 500;">${device.os || 'Firmware'}</td></tr>
        <tr><td style="padding: 0.25rem 0; color: var(--text-muted)">IP:</td><td style="text-align: right;" class="mono">${device.ip || 'Dynamic'}</td></tr>
      </table>
      <div style="margin-top: 1rem;">
        ${actions}
      </div>
    `;

    // Event binding
    const rebootBtn = document.getElementById('btn-reboot-node');
    if (rebootBtn) {
      rebootBtn.addEventListener('click', () => {
        eventBus.emit('device:reboot', { deviceId: device.id });
        this.dom.diagnosticPanel.innerHTML = `<div style="color: var(--status-info); font-weight: 500; text-align:center;">Sent hard reboot packet...</div>`;
      });
    }

    document.querySelectorAll('.btn-restart-srv').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const srv = e.target.getAttribute('data-service');
        eventBus.emit('device:restart-service', { deviceId: device.id, serviceName: srv });
        e.target.disabled = true;
        e.target.textContent = 'Restarting...';
      });
    });
  }

  /**
   * Append stream event logging details to the interface console
   */
  writeSystemLog(data) {
    if (!this.dom.logContainer) return;

    // Flush initial default spacer
    const placeholder = this.dom.logContainer.querySelector('div');
    if (placeholder && placeholder.textContent.includes('Awaiting engine telemetry')) {
      this.dom.logContainer.innerHTML = '';
    }

    const logRow = document.createElement('div');
    logRow.style.borderBottom = '1px solid var(--bg-tertiary)';
    logRow.style.padding = '0.25rem 0';
    
    let color = 'var(--text-secondary)';
    if (data.type === 'success') color = 'var(--status-success)';
    else if (data.type === 'danger') color = 'var(--status-danger)';
    else if (data.type === 'warn' || data.type === 'warning') color = 'var(--status-warning)';
    else if (data.type === 'info') color = 'var(--status-info)';

    logRow.innerHTML = `
      <span style="color: var(--text-muted)">[${new Date().toLocaleTimeString()}]</span> 
      <span style="color: ${color}">${data.message}</span>
    `;

    this.dom.logContainer.appendChild(logRow);
    this.dom.logContainer.scrollTop = this.dom.logContainer.scrollHeight;
  }
}

// Instantiate and bind automatically
document.addEventListener('DOMContentLoaded', () => {
  window.NocDashboard = new NocDashboardController();
});