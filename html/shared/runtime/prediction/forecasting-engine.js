window.TSMForecastingEngine={

 version:"1.0.0",

 forecast(context){

  return {

   type:"forecast",

   context,

   horizon:"future",

   confidence:0.80

  };

 }

};