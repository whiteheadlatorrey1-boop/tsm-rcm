// TSM Signal Router

module.exports = {

route(signal = {}) {

return {

destination:
signal.destination || "intelligence",

signal

};

}

};