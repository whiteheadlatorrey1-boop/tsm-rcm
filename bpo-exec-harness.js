const { JSDOM } = require('jsdom');
const fs = require('fs');

const pageHtml = fs.readFileSync('html/war-rooms/bpo-war/bpo-executive-portal.html', 'utf8');
const exceptionsSrc = fs.readFileSync('html/shared/tsm-exceptions.js', 'utf8');
const widgetSrc = fs.readFileSync('html/js/widgets/tsm-exception-widget.js', 'utf8');

const dom = new JSDOM(pageHtml, {
  url: 'https://app.tsmatter.com/html/war-rooms/bpo-war/bpo-executive-portal.html',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  resources: undefined
});
const { window } = dom;

function afterReady() {
  window.localStorage.setItem('TSM_BPO_STRATEGIST_RELAY', JSON.stringify({
    id: 'bpo-case-4471',
    sector: 'bpo',
    anomalyEntity: 'Ticket #4471',
    selectedScenarioName: 'SLA breach mitigation',
    recommendation: { confidence: 91, escalationTriggers: ['SLA breach imminent on Ticket #4471'] }
  }));

  window.eval(exceptionsSrc);
  window.eval(widgetSrc);

  window.TSMExceptions.add({
    title: 'SLA breach imminent on Ticket #4471',
    detail: 'Ticket #4471 \u00b7 SLA breach mitigation',
    recommendedAction: 'See BPO Executive Portal resolution brief.',
    severity: 'high', confidence: 91, priority: 'P1', sector: 'bpo', agentLabel: 'BPO Strategist'
  });

  const scripts = [...pageHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  scripts.forEach((s, i) => {
    try { window.eval(s); } catch (e) { console.log('ERROR in inline script block', i, ':', e.message); }
  });

  const container = window.document.getElementById('tsm-exception-queue');
  console.log('Exception queue container rendered rows:', container.querySelectorAll('.tsm-exq-row').length);

  const ackBtn = window.document.getElementById('bpo-ack-btn');
  const escBtn = window.document.getElementById('bpo-esc-btn');
  console.log('ACKNOWLEDGE button injected:', !!ackBtn);
  console.log('ESCALATE button injected:', !!escBtn);

  ackBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
  let relay = JSON.parse(window.localStorage.getItem('TSM_BPO_STRATEGIST_RELAY'));
  console.log('\nAfter ACKNOWLEDGE click:');
  console.log('  exec_actions count:', (relay.exec_actions || []).length, '(expect 1)');
  console.log('  action type:', relay.exec_actions && relay.exec_actions[0].type);
  console.log('  original relay fields preserved (merge not overwrite):', relay.id === 'bpo-case-4471' && relay.recommendation.confidence === 91);

  escBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
  relay = JSON.parse(window.localStorage.getItem('TSM_BPO_STRATEGIST_RELAY'));
  console.log('\nAfter ESCALATE click:');
  console.log('  exec_actions count:', relay.exec_actions.length, '(expect 2)');
  console.log('  second action type:', relay.exec_actions[1].type);

  const beforeOpen = window.TSMExceptions.getAll('bpo').filter(r => r.status !== 'resolved').length;
  const resolveBtn = container.querySelector('[data-resolve]');
  const resolveId = resolveBtn.getAttribute('data-resolve');
  resolveBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
  relay = JSON.parse(window.localStorage.getItem('TSM_BPO_STRATEGIST_RELAY'));
  const afterOpen = window.TSMExceptions.getAll('bpo').filter(r => r.status !== 'resolved').length;
  const excRecord = window.TSMExceptions.getAll('bpo').find(r => r.exceptionId === resolveId);

  console.log('\nAfter clicking Resolve on the exception:');
  console.log('  exec_actions count:', relay.exec_actions.length, '(expect 3 - real write happened)');
  console.log('  third action type:', relay.exec_actions[2].type, '(expect exception-resolved)');
  console.log('  third action note mentions the real exception title:', relay.exec_actions[2].note.includes('SLA breach imminent'));
  console.log('  TSMExceptions queue open count (before/after):', beforeOpen, '->', afterOpen);
  console.log('  underlying exception record actually flipped to resolved:', excRecord.status === 'resolved');
  console.log('  capture-phase write ran before the widget\'s own resolve (both true means real correction + queue flip both landed):',
    relay.exec_actions.length === 3 && excRecord.status === 'resolved');

  const allPass = container.querySelectorAll('.tsm-exq-row').length === 1 &&
    !!ackBtn && !!escBtn &&
    relay.exec_actions.length === 3 &&
    relay.exec_actions[0].type === 'acknowledged' &&
    relay.exec_actions[1].type === 'escalated' &&
    relay.exec_actions[2].type === 'exception-resolved' &&
    relay.exec_actions[2].note.includes('SLA breach imminent') &&
    afterOpen === beforeOpen - 1 &&
    excRecord.status === 'resolved' &&
    relay.id === 'bpo-case-4471';

  console.log('\n=== ALL CHECKS PASS:', allPass, '===');
  process.exit(allPass ? 0 : 1);
}

if (window.document.readyState === 'loading') {
  window.document.addEventListener('DOMContentLoaded', afterReady);
} else {
  afterReady();
}
