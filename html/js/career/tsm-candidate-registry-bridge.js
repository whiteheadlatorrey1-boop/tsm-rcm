(function (global) {
  'use strict';

  /**
   * TSM Candidate Registry Bridge
   *
   * Thin client-side integration seam between Career Training modules
   * and the shared Candidate Registry API.
   *
   * Architecture:
   *
   *   TRAINING / PRACTICE / SIMULATION
   *                ↓
   *        Registry Bridge
   *                ↓
   *       Candidate Registry API
   *                ↓
   *          Readiness
   *
   * This bridge intentionally does not calculate readiness.
   * The server-side Candidate Registry remains canonical.
   */

  var API_BASE = '/api/candidates';

  function requireCandidateId(candidateId) {
    if (typeof candidateId !== 'string' || !candidateId.trim()) {
      throw new Error('candidateId is required');
    }

    return candidateId.trim();
  }

  function normalizeEvent(event) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      throw new Error('training event must be an object');
    }

    if (typeof event.type !== 'string' || !event.type.trim()) {
      throw new Error('training event type is required');
    }

    var normalized = {
      type: event.type.trim()
    };

    if (event.score !== undefined && event.score !== null) {
      normalized.score = event.score;
    }

    if (event.weight !== undefined && event.weight !== null) {
      normalized.weight = event.weight;
    }

    if (event.meta !== undefined && event.meta !== null) {
      normalized.meta = event.meta;
    }

    return normalized;
  }

  function request(url, options) {
    return global.fetch(url, Object.assign({
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      }
    }, options || {}))
      .then(function (response) {
        return response.json().catch(function () {
          return {};
        }).then(function (body) {
          if (!response.ok) {
            var message =
              body && body.error
                ? body.error
                : 'Candidate Registry request failed';

            throw new Error(message);
          }

          return body;
        });
      });
  }

  function getCandidate(candidateId) {
    var id = requireCandidateId(candidateId);

    return request(
      API_BASE + '/' + encodeURIComponent(id)
    ).then(function (body) {
      return body.candidate || null;
    });
  }

  function listCandidates(options) {
    options = options || {};

    var query = '';

    if (options.status) {
      query = '?status=' + encodeURIComponent(options.status);
    }

    return request(API_BASE + query).then(function (body) {
      return Array.isArray(body.candidates)
        ? body.candidates
        : [];
    });
  }

  function recordTrainingEvent(candidateId, event, options) {
    var id = requireCandidateId(candidateId);
    var headers = { 'Content-Type': 'application/json' };
    if (options && options.token) headers['x-candidate-token'] = options.token;
    var normalizedEvent = normalizeEvent(event);

    return request(
      API_BASE + '/' + encodeURIComponent(id) + '/training-events',
      {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(normalizedEvent)
      }
    ).then(function (body) {
      return body.candidate || null;
    });
  }

  function mapRcmAttempt(attempt) {
    if (!attempt || typeof attempt !== 'object' || Array.isArray(attempt)) {
      throw new Error('RCM attempt must be an object');
    }

    if (
      typeof attempt.score !== 'number' ||
      !Number.isFinite(attempt.score)
    ) {
      throw new Error('RCM attempt score must be numeric');
    }

    return {
      type: 'career_training_attempt',
      score: attempt.score,
      weight: 1,
      meta: {
        domain: attempt.domain || 'rcm',
        concept: attempt.concept || 'general_rcm',
        competency: attempt.competency || 'general_rcm',
        scenario: attempt.scenario || null,
        source: attempt.source || 'career_command',
        metadata: attempt.metadata || {}
      }
    };
  }

  function recordRcmAttempt(candidateId, attempt, options) {
    var event = mapRcmAttempt(attempt);

    return recordTrainingEvent(candidateId, event, options);
  }

  var API = {
    getCandidate: getCandidate,
    listCandidates: listCandidates,
    recordTrainingEvent: recordTrainingEvent,
    mapRcmAttempt: mapRcmAttempt,
    recordRcmAttempt: recordRcmAttempt
  };

  global.TSMCandidateRegistryBridge = API;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }

})(typeof window !== 'undefined' ? window : globalThis);
