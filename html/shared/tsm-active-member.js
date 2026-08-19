/**
 * TSM Active Member v1.0
 * --------------------------------------------------------------------------
 * SMB Member layer — resolves which Member (cross-vertical demo tenant) a
 * vertical exec portal is currently acting on behalf of, so that page can
 * pass { tenantId: TSMActiveMember.getId() } into
 * TSMCaseManager.createFromException()'s `extra` argument.
 *
 * Resolution order:
 *   1. ?memberId=... in the current page's URL (explicit, wins always)
 *   2. tsm_active_member_id in localStorage (set by
 *      tsm-member-command-center.html when the user picks/adds a member
 *      and deep-links into a vertical portal)
 *   3. null — NEVER guessed. A page with no active member tags new cases
 *      with tenantId: null, same as before this layer existed, rather
 *      than silently attributing them to the wrong (or a made-up) member.
 *
 * Deliberately read-mostly: setActive() exists for the command center page
 * to call when a user picks a member, but no vertical portal should ever
 * call it for the user — that would be guessing on their behalf.
 *
 * Exposes:
 *   TSMActiveMember.getId() -> string | null
 *   TSMActiveMember.setActive(memberId) -> void, persists to localStorage
 *   TSMActiveMember.clear() -> void
 * ========================================================================== */

(function (global) {
  'use strict';

  var STORAGE_KEY = 'tsm_active_member_id';

  function readQueryParam() {
    try {
      if (typeof global.location === 'undefined' || !global.location.search) return null;
      var params = new URLSearchParams(global.location.search);
      var v = params.get('memberId');
      return v && v.trim() ? v.trim() : null;
    } catch (e) {
      return null;
    }
  }

  function readStorage() {
    try {
      if (typeof global.localStorage === 'undefined') return null;
      var v = global.localStorage.getItem(STORAGE_KEY);
      return v && v.trim() ? v.trim() : null;
    } catch (e) {
      return null;
    }
  }

  function getId() {
    return readQueryParam() || readStorage() || null;
  }

  function setActive(memberId) {
    try {
      if (typeof global.localStorage === 'undefined') return;
      if (memberId) {
        global.localStorage.setItem(STORAGE_KEY, memberId);
      } else {
        global.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) { /* best-effort, same as sibling shared engines */ }
  }

  function clear() {
    setActive(null);
  }

  var api = { getId: getId, setActive: setActive, clear: clear };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.TSMActiveMember = api;
  }
})(typeof window !== 'undefined' ? window : global);
