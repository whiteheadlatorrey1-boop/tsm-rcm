'use strict';

/*
 * TSM Phase 11D — HR Offboarding.
 *
 * Checklist model.
 * Does not execute access removal, asset recovery, or payroll actions.
 */

var VERSION = '11D.0';

var DEFAULT_TASKS = [
  'manager_notification',
  'final_work_date_confirmation',
  'access_review',
  'access_removal_request',
  'equipment_recovery',
  'asset_reconciliation',
  'document_reconciliation',
  'benefits_and_payroll_review',
  'exit_documentation'
];

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function createPlan(workerId, tasks) {
  var selected = Array.isArray(tasks) && tasks.length
    ? tasks
    : DEFAULT_TASKS;

  return {
    workerId: clean(workerId),
    process: 'offboarding',
    state: 'not_started',
    tasks: selected.map(function (task, index) {
      return {
        taskId: 'OFFBOARD-' + (index + 1),
        task: clean(task),
        status: 'pending',
        evidenceRequired: true,
        evidenceRef: null
      };
    })
  };
}

function completeTask(plan, taskId, evidenceRef) {
  plan = plan || {};
  var id = clean(taskId);

  var tasks = Array.isArray(plan.tasks)
    ? plan.tasks.map(function (task) {
        return Object.assign({}, task);
      })
    : [];

  var found = false;

  tasks = tasks.map(function (task) {
    if (task.taskId !== id) return task;

    found = true;

    return Object.assign({}, task, {
      status: 'completed',
      evidenceRef: clean(evidenceRef) || null
    });
  });

  if (!found) {
    throw new Error('offboarding task not found');
  }

  return Object.assign({}, plan, {
    state: tasks.every(function (task) {
      return task.status === 'completed';
    }) ? 'completed' : 'in_progress',
    tasks: tasks
  });
}

function summarize(plan) {
  var tasks = plan && Array.isArray(plan.tasks)
    ? plan.tasks
    : [];

  var completed = tasks.filter(function (task) {
    return task.status === 'completed';
  }).length;

  return {
    total: tasks.length,
    completed: completed,
    remaining: tasks.length - completed,
    completionPercent: tasks.length
      ? Math.round((completed / tasks.length) * 100)
      : 0
  };
}

module.exports = {
  VERSION: VERSION,
  DEFAULT_TASKS: DEFAULT_TASKS.slice(),
  createPlan: createPlan,
  completeTask: completeTask,
  summarize: summarize
};
