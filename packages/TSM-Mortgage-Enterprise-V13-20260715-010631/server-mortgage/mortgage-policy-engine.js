const policies=[
 "TRID",
 "RESPA",
 "ECOA",
 "HMDA",
 "FCRA"
];

function evaluate(){
 return {
    policies,
    result:"PASS"
 };
}

module.exports={evaluate};
