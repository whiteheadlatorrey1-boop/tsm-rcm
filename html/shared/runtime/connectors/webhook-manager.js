/**
 * Webhook Event Manager
 */

module.exports = {

register(event,handler){

 return {
   event,
   handler,
   active:true
 };

}

};
