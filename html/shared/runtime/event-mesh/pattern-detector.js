// TSM Pattern Detector

const __tsmImpl = {

detect(history = []) {

return {

patterns: history,

confidence:0.75

};

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMEventMeshPatternDetector = __tsmImpl; }
