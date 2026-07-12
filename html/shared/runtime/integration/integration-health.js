window.TSMIntegrationHealth={

 check(){

  return {
   status:"READY",
   integrations:
    window.TSMConnectorRegistry
      ? window.TSMConnectorRegistry.list()
      : []
  };

 }

};