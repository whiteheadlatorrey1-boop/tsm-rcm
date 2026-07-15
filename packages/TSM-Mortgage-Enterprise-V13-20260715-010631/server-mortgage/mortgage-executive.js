
const kpi =
require("./mortgage-kpis");


module.exports={


dashboard(){

return {

title:
"Mortgage Executive Command Center",

metrics:
kpi.getKPIs(),

recommendation:
"Prioritize income verification bottlenecks"

};


}


};

