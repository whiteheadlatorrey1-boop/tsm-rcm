(function(global){

const rules={};

const Registry={

register(domain,name,fn){

rules[domain]=rules[domain]||[];

rules[domain].push({

name,

execute:fn

});

},

run(domain,input){

return (rules[domain]||[]).map(r=>r.execute(input));

},

list(){

return rules;

}

};

global.TSMRuleRegistry=Registry;

})(window);
