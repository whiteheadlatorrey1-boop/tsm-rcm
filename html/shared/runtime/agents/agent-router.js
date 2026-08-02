window.TSMAgentRouter = {

route(signal){

if(!window.TSMAgentRegistry){
return null;
}

return window.TSMAgentRegistry.get(
signal.domain
);

}

};
