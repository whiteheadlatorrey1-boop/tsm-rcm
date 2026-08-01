function validate(result){

    if(typeof result!=="object")
        throw Error("Not JSON");

    if(result.summary.length>250)
        result.summary=result.summary.slice(0,250);

    if(result.findings.length>5)
        result.findings=result.findings.slice(0,5);

    return result;

}