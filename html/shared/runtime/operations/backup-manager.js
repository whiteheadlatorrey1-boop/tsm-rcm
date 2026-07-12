/**
 * Enterprise Backup Manager
 */

const backups=[];

const __tsmImpl = {

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
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMOperationsBackupManager = __tsmImpl; }
