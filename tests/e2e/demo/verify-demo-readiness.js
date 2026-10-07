const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../../..');
const reg = JSON.parse(fs.readFileSync(path.join(__dirname, 'demo-readiness.json'), 'utf8'));
let bad = 0;
for (const e of reg.experiences) {
  const miss = ['spec', 'manifest', 'frames', 'mp4', 'gif'].filter(k => !fs.existsSync(path.join(root, e[k])));
  const pending = e.visualReview ? '' : '  [visual review pending]';
  if (miss.length) { bad++; console.log(`FAIL ${e.id}: missing ${miss.join(', ')}`); }
  else console.log(`ok   ${e.id}${pending}`);
}
process.exit(bad ? 1 : 0);
