/**
 * Connector Monitoring
 */

module.exports={

check(name){

 return {
   connector:name,
   healthy:true,
   timestamp:new Date().toISOString()
 };

}

};
