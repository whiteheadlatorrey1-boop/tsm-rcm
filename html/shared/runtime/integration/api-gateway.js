window.TSMApiGateway = {

requests:[],

send(request){

this.requests.push({

timestamp:new Date().toISOString(),

request

});

return {
status:"QUEUED",
request
};

}

};