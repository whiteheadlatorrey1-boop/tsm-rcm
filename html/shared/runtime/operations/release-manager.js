/**
 * Runtime Release Management
 */

const releases=[];

module.exports={

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
