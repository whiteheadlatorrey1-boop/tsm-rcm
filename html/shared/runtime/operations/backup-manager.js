/**
 * Enterprise Backup Manager
 */

const backups=[];

module.exports={

create(snapshot){

 const backup={
   snapshot,
   created:new Date().toISOString()
 };

 backups.push(backup);

 return backup;

},

list(){

 return backups;

}

};
