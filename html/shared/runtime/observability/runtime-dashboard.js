window.TSMRuntimeDashboard = {

 snapshot(){

   return {

    health:
      global.TSMRuntimeHealth || {},

    metrics:
      global.TSMMetrics?.get() || {},

    traces:
      global.TSMTrace?.history() || [],

    performance:
      global.TSMPerformance?.report() || []

   };

 }

};