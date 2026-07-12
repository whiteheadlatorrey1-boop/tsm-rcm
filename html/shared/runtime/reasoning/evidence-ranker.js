// TSM Evidence Ranker

module.exports = {

rank(evidence = []) {

return evidence.map(item => ({

...item,

score:
item.score || 0.5

}));

}

};