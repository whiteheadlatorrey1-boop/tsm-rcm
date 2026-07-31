window.TSMAIScoring = {

    score(payload) {

        const metrics = {
            accuracy: payload.accuracy || 0,
            workflow: payload.workflow || 0,
            compliance: payload.compliance || 0,
            speed: payload.speed || 0
        };

        const total = Math.round(
            (metrics.accuracy * 0.4) +
            (metrics.workflow * 0.3) +
            (metrics.compliance * 0.2) +
            (metrics.speed * 0.1)
        );

        return {
            score: total,
            rating: this.getRating(total)
        };
    },

    getRating(score) {

        if (score >= 95) return 'Elite Operator';
        if (score >= 90) return 'Advanced';
        if (score >= 80) return 'Operational';

        return 'Remediation Required';
    }
};