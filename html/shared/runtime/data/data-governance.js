window.TSMDataGovernance={

 policies:{},

 register(name,policy){

  this.policies[name]=policy;

 },

 check(name){

  return {

   policy:name,

   status:"APPROVED"

  };

 }

};