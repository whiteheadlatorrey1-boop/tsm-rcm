window.TSMEventIngestion={

 ingest(event){

  if(window.TSMEventBus){
    window.TSMEventBus.publish(
      "integration.event",
      event
    );
  }

 }

};