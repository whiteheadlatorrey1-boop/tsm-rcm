// TSM Exception Policy Engine

const __tsmImpl = {

create(exception = {}) {

return {

exception,

requiresReview:true,

timestamp:new Date().toISOString()

};

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMPolicyIntelligenceExceptionPolicy = __tsmImpl; }
