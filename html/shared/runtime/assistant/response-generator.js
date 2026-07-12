// TSM Response Generator

const __tsmExport = {

generate(data = {}) {

return {

summary:data.summary || "",
evidence:data.evidence || [],
recommendation:data.recommendation || null

};

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.responseGenerator = __tsmExport;
}
