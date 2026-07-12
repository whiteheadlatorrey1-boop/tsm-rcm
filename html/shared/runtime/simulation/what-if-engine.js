// TSM What-If Engine

const __tsmImpl = {

evaluate(change = {}) {

return {

change,

impact:
"calculated",

confidence:
0.75

};

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMSimulationWhatIfEngine = __tsmImpl; }
