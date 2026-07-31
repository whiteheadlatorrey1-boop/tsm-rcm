window.TSMAdaptiveExam = {

        this.questions = questionBank;
        this.currentIndex = 0;
        this.correct = 0;

        console.log('Adaptive insurance exam initialized');
    },

    answer(selected, correctAnswer) {

        const isCorrect = selected === correctAnswer;

        if (isCorrect) {
            this.correct++;
            this.increaseDifficulty();
        } else {
            this.decreaseDifficulty();
        }

        this.currentIndex++;

        return {
            correct: isCorrect,
            score: this.getScore(),
            difficulty: this.difficulty
        };
    },

    getScore() {

        if (!this.questions.length) return 0;

        return Math.round((this.correct / this.questions.length) * 100);
    },

    increaseDifficulty() {

        const levels = ['bronze', 'silver', 'gold', 'platinum'];

        const index = levels.indexOf(this.difficulty);

        if (index < levels.length - 1) {
            this.difficulty = levels[index + 1];
        }
    },

    decreaseDifficulty() {

        const levels = ['bronze', 'silver', 'gold', 'platinum'];

        const index = levels.indexOf(this.difficulty);

        if (index > 0) {
            this.difficulty = levels[index - 1];
        }
    }
};