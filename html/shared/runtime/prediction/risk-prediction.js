window.TSMRiskPrediction={

 evaluate(signal){

  return {

   riskScore:
    Math.floor(Math.random()*100),

   signal,

   recommendation:
    "Review predicted risk"

  };

 }

};