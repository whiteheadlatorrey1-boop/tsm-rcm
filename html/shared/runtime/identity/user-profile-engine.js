/**
 * user-profile-engine.js
 *
 * Lightweight per-user profile: declared role, observed vertical usage,
 * and last-seen preferences. Not an identity provider -- assumes
 * authentication has already happened upstream (Security layer) and this
 * just enriches the authenticated user with platform-specific context.
 */

const STORE_KEY_PREFIX = 'tsm.identity.userProfile.';

class UserProfileEngine {
  getProfile(userId) {
    try {
      if (typeof localStorage === 'undefined') return this._defaultProfile(userId);
      const raw = localStorage.getItem(STORE_KEY_PREFIX + userId);
      return raw ? JSON.parse(raw) : this._defaultProfile(userId);
    } catch (e) {
      return this._defaultProfile(userId);
    }
  }

  _defaultProfile(userId) {
    return {
      userId: userId,
      role: 'operator',
      verticalsUsed: [],
      lastActive: null,
      preferences: {},
    };
  }

  updateProfile(userId, patch) {
    const current = this.getProfile(userId);
    const updated = Object.assign({}, current, patch, { lastActive: new Date().toISOString() });
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORE_KEY_PREFIX + userId, JSON.stringify(updated));
      }
    } catch (e) {
      // ignore storage failures, profile still returned in-memory
    }
    return updated;
  }

  recordVerticalUsage(userId, vertical) {
    const current = this.getProfile(userId);
    const set = new Set(current.verticalsUsed || []);
    set.add(vertical);
    return this.updateProfile(userId, { verticalsUsed: Array.from(set) });
  }
}

const userProfileEngine = new UserProfileEngine();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UserProfileEngine: UserProfileEngine, userProfileEngine: userProfileEngine };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.userProfileEngine = userProfileEngine;
}
