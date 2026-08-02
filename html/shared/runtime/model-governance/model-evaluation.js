/**
 * model-evaluation.js
 *
 * Lightweight scored-eval harness: run a fixed set of prompts against a
 * model/provider pair and record pass/fail against expected-substring or
 * custom scoring functions, so swapping a model version doesn't silently
 * change strategist output quality.
 */

async function runEvalSuite(modelKey, testCases, deps) {
  deps = deps || {};
  const routeModelCall = deps.routeModelCall;
  const listApprovedFor = deps.listApprovedFor;
  const providerAdapters = deps.providerAdapters;

  const results = [];

  for (const testCase of testCases) {
    let passed = false;
    let output = null;
    let error = null;

    try {
      const response = await routeModelCall(testCase.useCase || 'general', testCase.prompt, {
        listApprovedFor: listApprovedFor,
        providerAdapters: providerAdapters,
        preferredModelKey: modelKey,
      });
      output = response.text;
      passed = typeof testCase.score === 'function'
        ? !!testCase.score(output)
        : (testCase.expectedSubstring ? output.indexOf(testCase.expectedSubstring) !== -1 : true);
    } catch (err) {
      error = String(err && err.message ? err.message : err);
    }

    results.push({ name: testCase.name, passed: passed, output: output, error: error });
  }

  const passCount = results.filter((r) => r.passed).length;

  return {
    modelKey: modelKey,
    total: results.length,
    passed: passCount,
    failed: results.length - passCount,
    results: results,
    ranAt: new Date().toISOString(),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runEvalSuite: runEvalSuite };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.runEvalSuite = runEvalSuite;
}
