window.TSMPatternEngine={

 analyze(events){

  return {

   patternDetected:
    events && events.length > 1,

   confidence:
    events && events.length
      ? 0.75
      : 0

  };

 }

};