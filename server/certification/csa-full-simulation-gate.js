'use strict';

const { getWeightedBlueprint } = require('./weighted-blueprints');

const BLUEPRINT_ID = 'servicenow-csa-2026';

function qualifiesAsFullCsaSimulation(sim) {
  if (!sim || typeof sim !== 'object' || Array.isArray(sim)) return false;
  if (sim.blueprintId !== BLUEPRINT_ID) return false;

  const blueprint = getWeightedBlueprint(BLUEPRINT_ID);
  const exam = blueprint.exam;

  return Number.isInteger(sim.questions) &&
    sim.questions >= exam.questions &&
    Number.isFinite(sim.minutes) &&
    sim.minutes > 0 &&
    sim.minutes <= exam.minutes &&
    sim.unreviewedQuestions === 0;
}

module.exports = { qualifiesAsFullCsaSimulation };
