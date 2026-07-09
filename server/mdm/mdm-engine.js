function detectAnomalies(){

return [

 {
   id:"MDM-AN-001",
   type:"DUPLICATE_RECORD",
   domain:"Supplier Master",
   finding:"47 duplicate supplier records detected",
   riskScore:81,
   exposure:"$182000",
   status:"OPEN"
 }

];

}


module.exports={
 detectAnomalies
};