// TSM Exception Policy Engine

module.exports = {

create(exception = {}) {

return {

exception,

requiresReview:true,

timestamp:new Date().toISOString()

};

}

};