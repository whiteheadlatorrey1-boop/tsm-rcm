/**
 * Credential and Secret Boundary
 */

const secrets={};

module.exports={

store(name,value){

 secrets[name]=value;

 return {
   stored:true,
   name
 };

},

retrieve(name){

 return secrets[name];

}

};
