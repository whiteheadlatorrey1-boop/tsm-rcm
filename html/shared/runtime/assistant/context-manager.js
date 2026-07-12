// TSM Context Manager

const __tsmImpl = {

build(context = {}) {

return {

domain:context.domain || "enterprise",

entities:context.entities || [],

session:
Date.now()

};

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMAssistantContextManager = __tsmImpl; }
