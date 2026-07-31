window.TSMOrchestrator = {

    initialize() {

        console.log('TSM Insurance Orchestrator Active');

        this.bindEvents();
    },

    bindEvents() {

        document.addEventListener('mission_started', e => {
            console.log('Mission Event:', e.detail);
        });
    },

    dispatch(event) {

        console.log('Dispatching Event:', event);
    }
};