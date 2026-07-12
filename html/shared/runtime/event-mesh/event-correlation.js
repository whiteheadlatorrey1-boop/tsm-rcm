// TSM Event Correlation Engine

const __tsmImpl = {

correlate(events = []) {

return {

events,

relationships: [],

correlated:true

};

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMEventMeshEventCorrelation = __tsmImpl; }
