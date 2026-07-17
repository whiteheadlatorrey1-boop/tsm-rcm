/**
 * EventBus - The central nervous system of TSM-Consultz Enterprise Lab.
 * Enables fully decoupled, cross-tab communication with high availability.
 * Uses modern BroadcastChannel API with an automatic localStorage fallback.
 */
class EventBus {
  constructor() {
    this.listeners = {};
    this.tabId = 'tab_' + Math.random().toString(36).substring(2, 11);
    this.channelName = 'tsm_enterprise_lab_bus';
    this.storageKey = 'tsm_enterprise_event_bus';

    this.initializeCommunicationChannels();
  }

  /**
   * Automatically configures BroadcastChannel or registers a localStorage fallback.
   */
  initializeCommunicationChannels() {
    if (typeof BroadcastChannel !== 'undefined') {
      // Primary Route: Modern BroadcastChannel
      this.channel = new BroadcastChannel(this.channelName);
      this.channel.onmessage = (event) => {
        const { eventName, payload, originTabId } = event.data;
        // Avoid executing events originated by this exact tab
        if (originTabId !== this.tabId) {
          this.emitLocal(eventName, payload);
        }
      };
    } else {
      // Fallback Route: Legacy LocalStorage Storage Event
      window.addEventListener('storage', (event) => {
        if (event.key === this.storageKey && event.newValue) {
          try {
            const { eventName, payload, originTabId } = JSON.parse(event.newValue);
            if (originTabId !== this.tabId) {
              this.emitLocal(eventName, payload);
            }
          } catch (e) {
            console.error("Failed to parse fallback cross-tab event:", e);
          }
        }
      });
    }
  }

  /**
   * Subscribe to an event.
   * Returns an unsubscribe function for clean garbage collection.
   * @param {string} eventName 
   * @param {function} callback 
   * @returns {function} Unsubscribe hook
   */
  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
    
    // Allows: const unsub = eventBus.on('event', cb); ... unsub();
    return () => this.off(eventName, callback);
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
    // 1. Trigger local listeners immediately for instant UI response
    this.emitLocal(eventName, payload);

    // 2. Build the message envelope
    const eventEnvelope = {
      eventName,
      payload,
      originTabId: this.tabId,
      timestamp: Date.now()
    };

    // 3. Dispatch globally
    if (this.channel) {
      try {
        this.channel.postMessage(eventEnvelope);
      } catch (err) {
        console.warn("BroadcastChannel postMessage failed, attempting storage fallback:", err);
        this._broadcastViaStorage(eventEnvelope);
      }
    } else {
      this._broadcastViaStorage(eventEnvelope);
    }
  }

  /**
   * Internal Helper: Triggers local listeners only.
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

  /**
   * Internal Helper: Writes to localStorage and immediately flushes it.
   */
  _broadcastViaStorage(envelope) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(envelope));
      // Flush instantly so back-to-back identical events trigger consecutive storage changes
      localStorage.removeItem(this.storageKey);
    } catch (err) {
      console.error("Storage fallback broadcast failed entirely:", err);
    }
  }
}

// Export a robust singleton instance
const eventBus = new EventBus();
export default eventBus;