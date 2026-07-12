window.TSMCRMConnector = {

systems:["Salesforce","HubSpot"],

connect(system){

return {

system,

status:"CONNECTED"

};

}

};