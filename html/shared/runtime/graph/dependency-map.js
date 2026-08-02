window.TSMDependencyMap = {

dependencies:{},

register(source,target){

if(!this.dependencies[source]){
this.dependencies[source]=[];
}

this.dependencies[source].push(target);

},

getImpact(source){

return this.dependencies[source] || [];

}

};
