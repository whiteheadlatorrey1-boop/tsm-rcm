function generateReport(){

return {
    report:"Mortgage Compliance Report",
    generated:new Date().toISOString(),
    controlsPassed:5,
    exceptions:0
};

}

module.exports={generateReport};
