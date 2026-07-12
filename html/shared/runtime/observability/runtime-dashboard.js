window.TSMRuntimeDashboard = {

 snapshot(){

   return {

    health:
      window.TSMRuntimeHealth || {},

    metrics:
      window.TSMMetrics?.get() || {},

    traces:
      window.TSMTrace?.history() || [],

    performance:
      window.TSMPerformance?.report() || []

   };

 }

};