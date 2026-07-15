function connect(system){

return {

system,

status:"CONNECTED",

supported:[
"LOS",
"CRM",
"CREDIT",
"TITLE",
"SERVICING"
]

};

}

module.exports={connect};
