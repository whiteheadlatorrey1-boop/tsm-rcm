/**
 * Enterprise Backup Manager
 */

const backups=[];

const __tsmExport = {

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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.backupManager = __tsmExport;
}
