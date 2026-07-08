const state = {

  healthScore: 94,

  domains: [
    {
      name:"Customer Master",
      score:96
    },
    {
      name:"Supplier Master",
      score:89
    },
    {
      name:"Product Master",
      score:93
    }
  ],

  missions: [

    {
      id:"MDM-001",
      finding:"Duplicate supplier identities",
      risk_score:81,
      owner:"Data Governance",
      status:"OPEN",
      completion_pct:35
    }

  ]

};


function getCatalog(){

 return {

   healthScore:state.healthScore,
   domains:state.domains

 };

}


function getMissions(){

 return state.missions;

}


module.exports={

 getCatalog,
 getMissions

};