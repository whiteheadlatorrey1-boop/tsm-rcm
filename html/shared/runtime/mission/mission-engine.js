window.TSMMissionEngine = {

create(input){

const mission={

id:"TSM-"+Date.now(),

status:"OPEN",

created:new Date().toISOString(),

...input

};

if(window.TSMMissionStore){

TSMMissionStore.add(mission);

}

return mission;

}

};
