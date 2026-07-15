
module.exports = {

 analyzeLoan(loan){

 return {

  loan: loan.loan,

  agents:{

   intake:{
    status:"COMPLETE"
   },

   document:{
    status:"REVIEW",
    missing:[
     "Updated Paystub"
    ]
   },

   income:{
    status:"PENDING_VERIFICATION"
   },

   asset:{
    status:"COMPLETE"
   },

   compliance:{
    status:"PASS"
   },

   fraud:{
    status:"LOW_RISK"
   },

   closing:{
    status:"NOT_READY"
   }

  },

  recommendation:
   "Complete employment verification before approval"

 };

 }


};
