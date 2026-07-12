window.TSMSLAMonitor = {

track(mission){

return {

mission,

started:new Date().toISOString(),

sla_status:"ACTIVE"

};

}

};
