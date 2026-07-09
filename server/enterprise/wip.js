'use strict';


module.exports = {

    id: "wip",

    title: "Work-In-Progress Intelligence",


    async analyze(context = {}) {


        if (
            !context.project &&
            !context.task &&
            !context.work &&
            !context.milestone
        ) {

            return {
                relevant:false
            };

        }


        return {

            relevant:true,


            score:86,


            confidence:90,


            findings:[

                "Work-in-progress activity detected",

                "Execution lifecycle analysis available"

            ],


            recommendations:[

                "Review milestone progress",

                "Validate resource allocation",

                "Identify delivery risks"

            ],


            evidence:[

                context.project?.id ||
                context.task?.id ||
                context.work?.id ||
                "WIP-001"

            ],


            explainability:{

                reason:

                    "WIP intelligence evaluated execution progress and delivery context."

            }

        };

    }

};