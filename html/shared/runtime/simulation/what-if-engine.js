// TSM What-If Engine

const __tsmExport = {

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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.whatIfEngine = __tsmExport;
}
