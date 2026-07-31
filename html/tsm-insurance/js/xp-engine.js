window.TSMXP = {

    xp: 0,
    level: 'Bronze',

    initialize() {

        try {
            this.xp = Number(localStorage.getItem('tsm_xp')) || 0;
        } catch {
            this.xp = 0;
        }

        this.updateLevel();
    },

    grant(amount = 0) {

        this.xp += amount;

        localStorage.setItem('tsm_xp', this.xp);

        this.updateLevel();

        console.log(`XP Granted: ${amount}`);
    },

    updateLevel() {

        if (this.xp >= 1000) {
            this.level = 'Platinum';
        } else if (this.xp >= 500) {
            this.level = 'Gold';
        } else if (this.xp >= 250) {
            this.level = 'Silver';
        } else {
            this.level = 'Bronze';
        }
    }
};