function buildStrategistPayload(outputs){

    return{

        engines:outputs.length,

        averageRisk:average(outputs),

        findings:merge(outputs,"findings"),

        risks:merge(outputs,"risks"),

        actions:merge(outputs,"actions"),

        metrics:mergeMetrics(outputs)

    };

}