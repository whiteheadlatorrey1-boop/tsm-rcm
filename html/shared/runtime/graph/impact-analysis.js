window.TSMImpactAnalysis = {

analyze(entity){

return {

entity,

impact:
window.TSMDependencyMap
?
window.TSMDependencyMap.getImpact(entity)
:
[],

timestamp:new Date().toISOString()

};

}

};
