/**
 * Runtime Release Management
 */

const releases=[];

const __tsmExport = {

publish(version){

 releases.push({
   version,
   released:new Date().toISOString()
 });

 return version;

},

history(){

 return releases;

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.releaseManager = __tsmExport;
}
