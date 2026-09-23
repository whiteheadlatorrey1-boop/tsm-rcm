const adapter = require('../../../server/l1-copilot/servicenow-adapter');
const n = adapter.normalizeIncidentState;
let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS:', name); } else { fail++; console.log('FAIL:', name); } }

check("'1' -> OPEN", n('1') === 'OPEN');
check("'2' -> IN PROGRESS", n('2') === 'IN PROGRESS');
check("2 (number) -> IN PROGRESS", n(2) === 'IN PROGRESS');
check("' 3 ' -> ON HOLD", n(' 3 ') === 'ON HOLD');
check("'6' -> RESOLVED", n('6') === 'RESOLVED');
check("'7' -> CLOSED", n('7') === 'CLOSED');
check("unknown code '8' passes through", n('8') === '8');
check("text label passes through", n('In Progress') === 'In Progress');
check("null passes through", n(null) === null);
check("undefined passes through", n(undefined) === undefined);
check("prototype key not mapped", n('constructor') === 'constructor');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
