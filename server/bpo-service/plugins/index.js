'use strict';

// Side-effect module: registers every built-in BPO-service plug-in.
// routes.js requires this once at module load so mounting the generic
// router is enough to make every plug-in reachable -- nothing else
// needs to remember to register anything.

const { registerPlugin } = require('../plugin-registry');

registerPlugin(require('./construction-bpo'));
registerPlugin(require('./mortgage-title'));

module.exports = {};
