'use strict';
// Healthcare Integration Hub panel (hc-denial-war-room.html): visible text must
// satisfy the capability-matrix terms AND stay truthful about what is connected.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../../html/healthcare/hc-denial-war-room.html'), 'latin1');
const start = html.indexOf('<div id="hcIntegrationHub"');
assert.ok(start >= 0, 'Integration Hub panel missing');
const panelHtml = html.slice(start, html.indexOf('</table>', start) + 8);
const visible = panelHtml.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();

// Same matching rule as tests/e2e/enterprise-capability-coverage.spec.js
const covers = (text, term) => new RegExp('(^|[^a-z0-9])' + term).test(text);
['ehr', 'emr', 'clearinghouse'].forEach((t) => assert.ok(covers(visible, t), 'matrix term not visible: ' + t));

// Honesty: nothing is claimed as connected that is not.
assert.ok(/synthetic test sandbox only/.test(visible), 'EHR must be described as a synthetic sandbox');
assert.ok(/not connected to a production ehr or emr/.test(visible), 'must say no production EHR/EMR connection');
assert.ok(/clearinghouse[^|]*?not connected|not connected\. denial letters/.test(visible), 'clearinghouse must be marked not connected');
['epic', 'cerner', 'athenahealth', 'availity', 'change healthcare', 'waystar'].forEach((v) => assert.ok(!visible.includes(v), 'unsupported vendor claim: ' + v));
assert.ok(!/\bconnected\b(?! to a production)/.test(visible.replace(/not connected/g, '')), 'panel must not claim "connected"');

// Status script: GET only, textContent only, scoped to the sandbox status route.
const script = html.slice(html.indexOf('<script>', start), html.indexOf('</script>', html.indexOf('<script>', start)));
assert.ok(script.includes("/api/integrations/fhir/status"));
assert.ok(!/innerHTML|outerHTML|document\.write|eval\(|method\s*:/i.test(script));
assert.ok(fs.existsSync(path.join(__dirname, '../../html/integrations/healthcare-fhir-ehr.html')), 'linked sandbox page must exist');
assert.ok(html.includes('href="/html/integrations/healthcare-fhir-ehr.html"'));

// Existing page structure still present.
assert.ok(html.includes('class="pipeline-links"') && html.includes('id="howtoOverlay"'));
console.log('HC INTEGRATION HUB: ok');
