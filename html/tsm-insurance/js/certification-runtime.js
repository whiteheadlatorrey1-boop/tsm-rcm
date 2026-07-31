window.TSMCertificationRuntime = {

    issueCertification(payload) {

        const certification = {
            sector: 'insurance',
            certification: payload.name,
            score: payload.score,
            issuedAt: new Date().toISOString()
        };

        console.log('Certification Issued:', certification);

        return certification;
    }
};