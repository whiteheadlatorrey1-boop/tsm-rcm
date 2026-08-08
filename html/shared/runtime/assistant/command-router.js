// TSM Command Router

module.exports = {

route(command){

return {

command,

destination:
"decision-runtime"

};

}

};