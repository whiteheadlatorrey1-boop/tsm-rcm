window.TSMAgentEngine = {

run(request){

const agent =
window.TSMAgentRouter.route(request);

if(!agent){

return {
status:"NO_AGENT"
};

}

const plan =
window.TSMAgentPlanner.plan(request);

return window.TSMAgentExecutor.execute(plan);

}

};
