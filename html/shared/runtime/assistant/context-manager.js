// TSM Context Manager

module.exports = {

build(context = {}) {

return {

domain:context.domain || "enterprise",

entities:context.entities || [],

session:
Date.now()

};

}

};