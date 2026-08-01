global.TSMCompression={

    summarize(output){

        return {

            engine:output.engine,

            status:output.status,

            confidence:output.confidence,

            summary:output.summary,

            findings:(output.findings||[]).slice(0,5),

            risks:(output.risks||[]).slice(0,5),

            actions:(output.actions||[]).slice(0,5),

            metrics:output.metrics||{}

        };

    }

};