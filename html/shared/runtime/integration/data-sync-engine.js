window.TSMDataSyncEngine = {

sync(source,data){

return {

source,

status:"SYNCED",

timestamp:new Date().toISOString()

};

}

};