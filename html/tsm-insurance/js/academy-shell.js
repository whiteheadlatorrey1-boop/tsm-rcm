window.TSMAcademyShell = {

    currentSector: 'insurance',
    currentMission: null,
    currentUser: null,

    boot() {

        console.log('TSM Insurance Operations Academy Booting...');

        this.loadUser();
        this.initializeUI();
        this.initializeSystems();
    },

    loadUser() {

        try {
            this.currentUser = JSON.parse(localStorage.getItem('tsm_academy_user')) || {
                name: 'Operator',
                xp: 0,
                certifications: []
            };
        } catch {
            this.currentUser = {
                name: 'Operator',
                xp: 0,
                certifications: []
            };
        }
    },

    initializeUI() {

        console.log('Insurance academy UI initialized');
    },

    initializeSystems() {

        if (window.TSMXP) TSMXP.initialize();
        if (window.TSMAnalytics) TSMAnalytics.initialize();
        if (window.TSMOrchestrator) TSMOrchestrator.initialize();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    TSMAcademyShell.boot();
});