// TSM Response Generator

module.exports = {

generate(data = {}) {

return {

summary:data.summary || "",
evidence:data.evidence || [],
recommendation:data.recommendation || null

};

}

};