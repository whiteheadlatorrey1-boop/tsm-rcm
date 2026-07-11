
// TSM Knowledge Governance

const knowledgeGovernance = {

 validate(record){

  return {
   record,
   ownership:"assigned",
   freshness:"tracked",
   access:"controlled"
  };

 }

};

module.exports = knowledgeGovernance;
