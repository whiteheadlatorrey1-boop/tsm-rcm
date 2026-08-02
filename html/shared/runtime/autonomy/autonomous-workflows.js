window.TSMAutonomousWorkflows = {

workflows:{},

register(name,workflow){

this.workflows[name]=workflow;

},

execute(name,payload){

if(!this.workflows[name]){
return {
status:"NOT_FOUND"
};
}

return this.workflows[name](payload);

}

};
