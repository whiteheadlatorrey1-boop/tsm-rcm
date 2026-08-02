window.TSMCommandFeed = {

events:[],

push(event){

this.events.push({

timestamp:
new Date().toISOString(),

event

});

}

};