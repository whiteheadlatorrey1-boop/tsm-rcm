window.TSMGraphQuery = {

find(criteria){

if(!window.TSMEntityGraph){
return [];
}

return window.TSMEntityGraph.all()
.filter(entity=>{

return Object.keys(criteria)
.every(key=>entity[key]===criteria[key]);

});

}

};
