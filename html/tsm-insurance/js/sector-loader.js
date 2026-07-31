window.TSMSectorLoader = {

    async loadSector(sector) {

        console.log(`Loading sector: ${sector}`);

        const sectorConfig = {
            insurance: {
                terms: '../datasets/insurance-terms.js',
                workflows: '../datasets/insurance-workflows.js',
                claims: '../datasets/insurance-claims.js',
                exam: '../datasets/insurance-exam.js'
            }
        };

        return sectorConfig[sector];
    }
};