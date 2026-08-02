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