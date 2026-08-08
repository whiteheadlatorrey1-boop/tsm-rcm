window.TSMIntegrationEngine={
 version:"1.0.0",

 connect(source){
   console.log("Integration connected:",source);
 },

 status(){
   return {
    status:"READY",
    layer:"integration"
   };
 }
};