function configureLoan(profile){

return {
    recommendations:[
        "Conventional 30 Year",
        "FHA Alternative",
        "Jumbo Review"
    ],
    eligibility:"ASSESSED",
    profile
};

}

module.exports={configureLoan};
