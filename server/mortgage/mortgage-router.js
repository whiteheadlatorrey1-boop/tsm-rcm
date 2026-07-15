
const mortgagePatterns = [

 "1003",
 "LoanEstimate",
 "ClosingDisclosure",
 "Appraisal",
 "TitleCommitment",
 "Paystub",
 "W2",
 "BankStatement",
 "PurchaseContract"

];


function detectMortgage(document){

 const name =
 (
 document.fileName ||
 document.name ||
 ""
 ).toLowerCase();


 const matched =
 mortgagePatterns.some(
 p => name.includes(p.toLowerCase())
 );


 if(!matched){
   return null;
 }


 return {

   vertical:"mortgage",

   mission:"LOAN_APPLICATION",

   stage:"PROCESSING",

   confidence:95

 };

}



module.exports={
 detectMortgage
};

