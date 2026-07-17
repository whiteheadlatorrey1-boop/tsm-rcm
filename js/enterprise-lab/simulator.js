import eventBus from './event-bus.js';

/**
 * Simulator - The core simulation orchestrator.
 * Manages game state, clock ticks, and triggers registered scenario plugins.
 */
class Simulator {
  constructor() {
    this.tickInterval = null;
    this.tickRateMs = 1000; // 1 second real-time = 1 tick
    
    // Core Engine State Blueprint
    this.state = {
      isRunning: false,
      gameTime: 0, // in seconds
      enterpriseHealth: 100, // 0-100%
      metrics: {
        globalCpu: 12,
        globalRam: 38,
        activeAlerts: 0,
        openTickets: 0
      },
      activeScenarios: [],
      devices: {},
      tickets: [],
      missions: []
    };

    this.init();
  }

  init() {
    // Load state from cache or initialize brand new state
    const cachedState = localStorage.getItem('tsm_simulator_state');
    if (cachedState) {
      try {
        this.state = JSON.parse(cachedState);
      } catch (e) {
        console.warn("Corrupt state cache, resetting simulation state.");
      }
    }

    // Bind system event listeners
    eventBus.on('sim:start', () => this.start());
    eventBus.on('sim:stop', () => this.stop());
    eventBus.on('sim:reset', () => this.reset());
    eventBus.on('scenario:trigger', (data) => this.injectScenario(data.scenarioId));
    
    // Forward state change requests from other engines
    eventBus.on('state:mutate', (payload) => this.handleStateMutation(payload));

    // Announce ready
    console.log("⚡ Simulator Engine initialized. Tab ID:", eventBus.tabId);
    
    // Auto-resume if it was previously running
    if (this.state.isRunning) {
      this.start();
    }
  }

  start() {
    if (this.state.isRunning && this.tickInterval) return;
    
    this.state.isRunning = true;
    this.saveState();
    
    this.tickInterval = setInterval(() => {
      this.tick();
    }, this.tickRateMs);

    eventBus.emit('sim:status-changed', { isRunning: true });
    eventBus.emit('system:log', { message: 'Simulation engines started.', type: 'info' });
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.state.isRunning = false;
    this.saveState();

    eventBus.emit('sim:status-changed', { isRunning: false });
    eventBus.emit('system:log', { message: 'Simulation engines paused.', type: 'warn' });
  }

  reset() {
    this.stop();
    localStorage.removeItem('tsm_simulator_state');
    
    this.state = {
      isRunning: false,
      gameTime: 0,
      enterpriseHealth: 100,
      metrics: {
        globalCpu: 10,
        globalRam: 35,
        activeAlerts: 0,
        openTickets: 0
      },
      activeScenarios: [],
      devices: {},
      tickets: [],
      missions: []
    };
    
    this.saveState();
    eventBus.emit('sim:reset-complete', this.state);
    eventBus.emit('system:log', { message: 'Simulation hard reset completed.', type: 'info' });
  }

  /**
   * The core clock cycle. Executes calculations every second.
   */
  tick() {
    this.state.gameTime += 1;
    
    // Simulate natural baseline fluctuation of system metrics
    this.fluctuateSystemMetrics();

    // Broadcast tick event for other engines (SLA tracker, active alerts, etc.)
    eventBus.emit('sim:tick', { 
      gameTime: this.state.gameTime, 
      state: this.state 
    });

    // Save current frame state
    this.saveState();
  }

  fluctuateSystemMetrics() {
    // Small background noise on system specs to make live dashboards look organic
    const deltaCpu = (Math.random() - 0.5) * 2; // -1% to +1%
    const deltaRam = (Math.random() - 0.5) * 0.5; // -0.25% to +0.25%
    
    this.state.metrics.globalCpu = Math.min(Math.max(Math.round(this.state.metrics.globalCpu + deltaCpu), 5), 100);
    this.state.metrics.globalRam = Math.min(Math.max(Math.round(this.state.metrics.globalRam + deltaRam), 20), 100);
  }

  injectScenario(scenarioId) {
    if (this.state.activeScenarios.includes(scenarioId)) {
      eventBus.emit('system:log', { message: `Scenario ${scenarioId} is already running.`, type: 'warn' });
      return;
    }

    this.state.activeScenarios.push(scenarioId);
    eventBus.emit('scenario:loaded', { scenarioId });
    eventBus.emit('system:log', { message: `Injected scenario payload: ${scenarioId}`, type: 'danger' });
    this.saveState();
  }

  handleStateMutation({ key, value }) {
    // Deep dynamic setter for state updates
    const keys = key.split('.');
    let current = this.state;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    this.saveState();
    
    // Push the global update notification to update all UI views
    eventBus.emit('state:updated', { key, value, fullState: this.state });
  }

  saveState() {
    localStorage.setItem('tsm_simulator_state', JSON.stringify(this.state));
  }
}

// Instantiate the singleton to automatically bind handlers
const simulator = new Simulator();
export default simulator;