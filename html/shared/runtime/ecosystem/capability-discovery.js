
// TSM Capability Discovery

const capabilityDiscovery = {

 find(requirement){

   return {
    requirement,
    capabilities:[
      "AI Agent",
      "Workflow",
      "Connector",
      "Automation"
    ]
   };

 }

};

module.exports = capabilityDiscovery;
