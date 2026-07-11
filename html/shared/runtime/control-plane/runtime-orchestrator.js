global.TSMRuntimeControl={
 orchestrate(signal){
   return {
    status:"ORCHESTRATED",
    signal,
    timestamp:new Date().toISOString()
   };
 }
};