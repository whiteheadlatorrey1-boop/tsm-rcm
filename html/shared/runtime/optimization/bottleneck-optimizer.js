global.TSMBottleneckOptimizer = {
 analyze(flow){
   return {
    flow,
    bottleneck:"detected",
    recommendation:"optimize constraint",
    timestamp:new Date().toISOString()
   };
 }
};