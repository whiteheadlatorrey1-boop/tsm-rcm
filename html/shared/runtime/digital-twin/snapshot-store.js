window.TSMSnapshotStore = {

snapshots:[],

capture(state){

this.snapshots.push({

timestamp:new Date().toISOString(),

state

});

},

history(){

return this.snapshots;

}

};