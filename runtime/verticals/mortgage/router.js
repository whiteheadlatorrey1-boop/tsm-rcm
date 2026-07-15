

module.exports={


detect(file){


if(file.match(/ClosingDisclosure|LoanEstimate|1003|Appraisal/i))
{
return {
vertical:"mortgage",
mission:"LOAN_PROCESSING"
};
}


return null;


}


};

