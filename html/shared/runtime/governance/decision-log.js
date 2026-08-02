window.TSMDecisionLog = {

entries:[],

add(entry){

this.entries.push({
timestamp:new Date().toISOString(),
...entry
});

}

};