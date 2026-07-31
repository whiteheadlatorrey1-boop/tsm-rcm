window.TSMWorkflowValidation = {

    validate(payload) {

        const errors = [];

        if (!payload.authorizationVerified) {
            errors.push('Authorization not verified');
        }

        if (!payload.documentationAttached) {
            errors.push('Documentation missing');
        }

        if (!payload.claimReviewed) {
            errors.push('Claim review incomplete');
        }

        return {
            passed: errors.length === 0,
            errors
        };
    }
};