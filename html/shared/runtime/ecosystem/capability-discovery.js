
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

const __tsmExport = capabilityDiscovery;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.capabilityDiscovery = __tsmExport;
}
