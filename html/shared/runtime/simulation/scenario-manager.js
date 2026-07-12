// TSM Scenario Manager

const scenarios = [];

module.exports = {

create(data = {}) {

const scenario = {
id: "SCN-" + Date.now(),
...data
};

scenarios.push(scenario);

return scenario;

},

list(){

return scenarios;

}

};