/**
 * EventBus - The central nervous system of TSM-Consultz Enterprise Lab.
 * Enables fully decoupled, cross-tab communication using pub/sub and localStorage.
 */
class EventBus {
  constructor() {
    this.listeners = {};
    this.storageKey = 'tsm_enterprise_event_bus';

    // Listen for storage events to enable cross-tab/cross-window updates
    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKey && event.newValue) {
        try {
          const { eventName, payload, originTabId } = JSON.parse(event.newValue);
          
          // Avoid handling events that this specific tab originated
          if (originTabId !== this.tabId) {
            this.emitLocal(eventName, payload);
          }
        } catch (e) {
          console.error("Failed to parse cross-tab event:", e);
        }
      }
    });

    // Create a unique ID for this tab instance
    this.tabId = 'tab_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Subscribe to an event.
   * @param {string} eventName 
   * @param {function} callback 
   */
  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
    return () => this.off(eventName, callback); // Returns unsubscribe function
  }

  /**
   * Unsubscribe from an event.
   * @param {string} eventName 
   * @param {function} callback 
   */
  off(eventName, callback) {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
  }

  /**
   * Emit an event locally (this window) and broadcast globally (other windows).
   * @param {string} eventName 
   * @param {any} payload 
   */
  emit(eventName, payload = {}) {
    // 1. Trigger local listeners immediately
    this.emitLocal(eventName, payload);

    // 2. Broadcast to other tabs using localStorage
    const eventEnvelope = {
      eventName,
      payload,
      originTabId: this.tabId,
      timestamp: Date.now()
    };
    
    localStorage.setItem(this.storageKey, JSON.stringify(eventEnvelope));
    
    // Clear quickly so the same event can be fired back-to-back with the same values
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Internal: Triggers local listeners only.
   */
  emitLocal(eventName, payload) {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName].forEach(callback => {
      try {
        callback(payload);
      } catch (err) {
        console.error(`Error in subscriber for event "${eventName}":`, err);
      }
    });
  }
}

// Export a singleton instance
const eventBus = new EventBus();
export default eventBus;