'use strict';

// CORRECTED: this previously required '../mdm/mdm-engine', whose
// detectAnomalies() returns one hardcoded anomaly object every time —
// it was a stub with an extra layer of indirection, not real analysis.
// The genuinely real MDM data is MDM_SEED_DATA in server.js, computed via
// mdmFindDuplicates()/mdmScoreDataset() and exposed at GET /api/mdm/summary
// (domain-by-domain quality score + duplicate counts from the actual seed
// dataset). This now reads that instead.

const { getJSON } = require('./_live');

module.exports = {

    id: "mdm",

    title: "Master Data Management",


    async analyze(context = {}) {

        let summary;

        try {
            summary = await getJSON(context.baseUrl, '/api/mdm/summary');
        }
        catch (err) {
            return { relevant: false, error: err.message };
        }

        const domains = summary.domains || [];
        const withDupes = domains
            .filter(d => d.duplicateCount > 0)
            .sort((a, b) => a.avgQualityScore - b.avgQualityScore);

        if (!withDupes.length) {
            return { relevant: false };
        }

        const riskScore = Math.max(0, 100 - summary.overallScore);

        return {

            relevant: true,

            score: riskScore,

            confidence: 92,

            findings: withDupes.slice(0, 5).map(
                d => `${d.domain}: ${d.duplicateCount} duplicates, quality ${d.avgQualityScore}/100 across ${d.recordCount} records`
            ),

            recommendations: [
                "Review duplicate master records",
                "Initiate golden record remediation"
            ],

            evidence: withDupes.map(d => d.domain),

            explainability: {

                reason:
                    `Master data quality is ${summary.overallScore}/100 overall; ` +
                    `${withDupes.length} of ${domains.length} domains have open duplicates.`,

                overallScore: summary.overallScore,
                domainsWithDuplicates: withDupes.length

            }

        };

    }

};
