window.TSMCrossDomainEngine = {

analyze(events){

return {

domains:[...new Set(
events.map(e=>e.domain)
)],

insight:"Cross domain pattern detected"

};

}

};
