module.exports = {

    id: "crm",

    title: "Customer Relationship Management",

    async analyze(context) {

        if (!context.customer)
            return { relevant: false };

        return {

            relevant: true,

            score: 91,

            confidence: 94,

            findings: [

                "Existing customer found",

                "Account in good standing"

            ],

            recommendations: [

                "Attach document to CRM record"

            ],

            evidence: [

                context.customer.id

            ],

            explainability: {

                reason:

                    "Customer entity detected."

            }

        };

    }

};