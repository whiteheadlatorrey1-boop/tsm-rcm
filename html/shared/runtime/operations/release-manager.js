/**
 * Runtime Release Management
 */

const releases=[];

const __tsmImpl = {

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
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMOperationsReleaseManager = __tsmImpl; }
