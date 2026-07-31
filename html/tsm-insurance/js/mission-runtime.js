window.TSMMissionRuntime = {

    activeMission: null,

    startMission(mission) {

        this.activeMission = mission;

        console.log('Mission Started:', mission.title);

        if (mission.requiredApps?.length) {

            mission.requiredApps.forEach(app => {
                console.log('Required App:', app);
            });
        }

        document.dispatchEvent(new CustomEvent('mission_started', {
            detail: mission
        }));
    },

    completeMission(payload = {}) {

        console.log('Mission Completed');

        const result = {
            mission: this.activeMission,
            payload,
            completedAt: Date.now()
        };

        if (window.TSMXP) {
            TSMXP.grant(50);
        }

        if (window.TSMAnalytics) {
            TSMAnalytics.track('mission_complete', result);
        }

        return result;
    }
};