'use strict';
// Sample GC -- Medical Office Building (demo): deterministic seed + recovery engine.
// Fictional illustrative project, not a real client. Pure functions, no I/O, so
// tests and the demo always agree on the numbers.

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PROJECT = {
  id: 'SGC-MOB-2',
  name: 'Sample GC — Medical Office Building (demo)',
  contractValue: 48000000,
  totalWeeks: 60,
  plannedPct: 0.65,
  actualPct: 0.50,
  baseOverrun: 3100000
};

const CHANGE_ORDERS = [
  { id: 'CO-01', title: 'Electrical gear resequencing', amount: 420000, days: 14, criticalPath: true,  cause: 'field',  ageDays: 21 },
  { id: 'CO-02', title: 'MRI shielding addition',       amount: 385000, days: 10, criticalPath: true,  cause: 'owner',  ageDays: 18 },
  { id: 'CO-03', title: 'Concrete package increase',    amount: 82000,  days: 9,  criticalPath: true,  cause: 'field',  ageDays: 12 },
  { id: 'CO-04', title: 'Medical gas rough-in redesign',amount: 310000, days: 7,  criticalPath: true,  cause: 'design', ageDays: 25 },
  { id: 'CO-05', title: 'Curtain wall revised anchors', amount: 265000, days: 5,  criticalPath: false, cause: 'design', ageDays: 9 },
  { id: 'CO-06', title: 'Elevator pit waterproofing',   amount: 148000, days: 3,  criticalPath: false, cause: 'field',  ageDays: 14 },
  { id: 'CO-07', title: 'Fire protection reroute',      amount: 235000, days: 4,  criticalPath: false, cause: 'sub',    ageDays: 16 },
  { id: 'CO-08', title: 'Nurse station changes',        amount: 190000, days: 0,  criticalPath: false, cause: 'owner',  ageDays: 7 },
  { id: 'CO-09', title: 'Unforeseen rock excavation',   amount: 330000, days: 6,  criticalPath: true,  cause: 'field',  ageDays: 28 },
  { id: 'CO-10', title: 'Generator pad relocation',     amount: 195000, days: 2,  criticalPath: false, cause: 'sub',    ageDays: 11 },
  { id: 'CO-11', title: 'Roof drain redesign',          amount: 140000, days: 0,  criticalPath: false, cause: 'design', ageDays: 5 }
];

const TRADES = ['Electrical', 'Mechanical', 'Structural', 'Envelope', 'Fire Protection', 'Plumbing', 'Elevator'];
const SPECS  = ['26 24 16', '23 05 00', '03 30 00', '07 42 13', '21 13 13', '22 11 16', '14 21 00'];
const LATE_DAYS = [3, 5, 8, 12, 14, 19, 21];

const SUBCONTRACTORS = [
  { name: 'ABC Electric', trade: 'Electrical', delayWeeks: 6 }
];

const RECOVERY_PLAN = [
  { id: 'R-1', action: 'Add second crew and resequence electrical gear delivery', weeksRecovered: 2, costSaving: 600000 },
  { id: 'R-2', action: 'Fast-track 6 critical-path RFIs to 48-hour response',     weeksRecovered: 1, costSaving: 400000 },
  { id: 'R-3', action: 'Approve critical-path change orders to release procurement', weeksRecovered: 1, costSaving: 300000 },
  { id: 'R-4', action: 'Overlap envelope and interior rough-in',                   weeksRecovered: 1, costSaving: 400000 }
];

function buildSampleGCSeed(seed = 20261017) {
  const rnd = mulberry32(seed);
  const rfis = [];
  for (let i = 0; i < 23; i++) {
    const cp = i % 4 === 0;
    rfis.push({
      id: 'RFI-' + String(101 + i),
      subject: TRADES[i % 7] + ' coordination clarification',
      trade: TRADES[i % 7],
      specSection: SPECS[i % 7],
      daysOpen: 2 + Math.floor(rnd() * 26),
      criticalPath: cp,
      costImpact: Math.round((rnd() * 45000) / 500) * 500 + (cp ? 25000 : 0),
      scheduleDays: cp ? 1 + Math.floor(rnd() * 4) : 0
    });
  }
  const submittals = LATE_DAYS.map((d, i) => ({
    id: 'SUB-' + String(201 + i),
    title: TRADES[i % 7] + ' shop drawings',
    trade: TRADES[i % 7],
    daysLate: d,
    criticalPath: d >= 14
  }));
  return {
    project: { ...PROJECT },
    rfis,
    changeOrders: CHANGE_ORDERS.map(c => ({ ...c, status: 'pending' })),
    submittals,
    subcontractors: SUBCONTRACTORS.map(s => ({ ...s }))
  };
}

const round = (n, p = 2) => Math.round(n * 10 ** p) / 10 ** p;

function rankExposures(data) {
  const items = [
    ...data.changeOrders.map(c => ({ id: c.id, type: 'change_order', title: c.title, dollars: c.amount, days: c.days, criticalPath: c.criticalPath, age: c.ageDays || 0 })),
    ...data.rfis.map(r => ({ id: r.id, type: 'rfi', title: r.subject, dollars: r.costImpact, days: r.scheduleDays, criticalPath: r.criticalPath, age: r.daysOpen })),
    ...data.submittals.map(s => ({ id: s.id, type: 'submittal', title: s.title, dollars: 0, days: s.daysLate >= 14 ? 2 : 1, criticalPath: s.criticalPath, age: s.daysLate }))
  ];
  return items
    .map(x => ({ ...x, score: round(x.dollars / 25000 + x.days * (x.criticalPath ? 4 : 1) + x.age * 0.1) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

function changeOrderImpact(co, project) {
  return {
    id: co.id,
    pctOfContract: round((co.amount / project.contractValue) * 100),
    scheduleWeeks: round(co.days / 5, 1),
    newForecastOverrun: project.baseOverrun + co.amount
  };
}

function scheduleVariance(project) {
  return {
    weeksBehind: Math.round((project.plannedPct - project.actualPct) * project.totalWeeks),
    spi: round(project.actualPct / project.plannedPct)
  };
}

function forecastAtCompletion(project, plan = []) {
  const saved = plan.reduce((s, a) => s + a.costSaving, 0);
  const weeks = plan.reduce((s, a) => s + a.weeksRecovered, 0);
  const overrun = project.baseOverrun - saved;
  return {
    overrun,
    forecastCost: project.contractValue + overrun,
    weeksBehindAfter: scheduleVariance(project).weeksBehind - weeks,
    weeksRecovered: weeks
  };
}

function decideChangeOrders(cos) {
  return cos.map(c => {
    let decision = 'defer', reason = 'Not on critical path; revisit next cycle';
    if (c.amount >= 400000)      { decision = 'escalate'; reason = 'Over $400K authority limit; owner sign-off required'; }
    else if (c.cause === 'sub')  { decision = 'reject';   reason = 'Subcontractor-caused; backcharge, not a change order'; }
    else if (c.criticalPath)     { decision = 'approve';  reason = 'Critical path and under authority limit; delay costs more than approval'; }
    return { id: c.id, decision, reason };
  });
}

module.exports = { buildSampleGCSeed, rankExposures, changeOrderImpact, scheduleVariance, forecastAtCompletion, decideChangeOrders, RECOVERY_PLAN };
