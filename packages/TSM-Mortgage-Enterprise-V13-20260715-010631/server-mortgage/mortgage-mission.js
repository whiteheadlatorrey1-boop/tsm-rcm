

function createMortgageMission(doc){

return {

id:
"MTG-"+Date.now(),


vertical:
"mortgage",


type:
"LOAN_APPLICATION",


document:
doc.fileName,


stage:
"PROCESSING",


priority:
"HIGH",


riskScore:
0,


createdAt:
new Date().toISOString()

};


}


module.exports={
createMortgageMission
};


