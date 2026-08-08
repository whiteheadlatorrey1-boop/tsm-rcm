const fs = require("fs");
const path = require("path");

console.log(`
============================================================
TSM Runtime Enterprise Observability Layer Installation
============================================================
`);

const base = "html/shared/runtime/observability";

const files = {

"metrics-engine.js": `
global.TSMMetrics = {

 metrics:{},

 record(name,value){
   this.metrics[name]={
     value,
     timestamp:new Date().toISOString()
   };
 },

 get(){
   return this.metrics;
 }

};
`,

"event-tracing.js": `
global.TSMTrace = {

 events:[],

 capture(event){
   this.events.push({
     event,
     timestamp:new Date().toISOString()
   });
 },

 history(){
   return this.events;
 }

};
`,

"performance-monitor.js": `
global.TSMPerformance = {

 samples:[],

 measure(component,duration){

   this.samples.push({
     component,
     duration,
     timestamp:new Date().toISOString()
   });

 },

 report(){
   return this.samples;
 }

};
`,

"usage-analytics.js": `
global.TSMUsageAnalytics = {

 activity:[],

 track(user,action){

   this.activity.push({
     user,
     action,
     timestamp:new Date().toISOString()
   });

 },

 report(){
   return this.activity;
 }

};
`,

"cost-intelligence.js": `
global.TSMCostIntelligence = {

 costs:{},

 record(service,cost){

   this.costs[service]=
     (this.costs[service] || 0) + cost;

 },

 summary(){
   return this.costs;
 }

};
`,

"runtime-dashboard.js": `
global.TSMRuntimeDashboard = {

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
`

};


fs.mkdirSync(base,{recursive:true});


for(const [file,content] of Object.entries(files)){

 fs.writeFileSync(
   path.join(base,file),
   content.trim()
 );

 console.log(
   "✓",
   path.join(base,file)
 );

}


console.log(`
Enterprise Observability Layer Complete
`);

