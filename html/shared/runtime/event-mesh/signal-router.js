// TSM Signal Router

const __tsmImpl = {

route(signal = {}) {

return {

destination:
signal.destination || "intelligence",

signal

};

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMEventMeshSignalRouter = __tsmImpl; }
