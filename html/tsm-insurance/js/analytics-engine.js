window.TSMAnalytics = {

    events: [],

    initialize() {
        console.log('Insurance analytics engine online');
    },

    track(type, payload = {}) {

        const event = {
            type,
            payload,
            timestamp: Date.now()
        };

        this.events.push(event);

        console.log('Analytics Event:', event);
    }
};