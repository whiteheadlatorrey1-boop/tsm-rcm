window.TSMEventStream = {

events:[],

publish(event){

this.events.push({

timestamp:new Date().toISOString(),

event

});

}

};