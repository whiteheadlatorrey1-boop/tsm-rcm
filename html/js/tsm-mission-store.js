// tsm-mission-store.js
class TSMMissionStore {
  constructor() {
    this.key = "TSM_MISSION_STORE";
    this.state = this.load();
  }

  load() {
    try {
      return JSON.parse(localStorage.getItem(this.key)) || {
        missions: [],
        history: []
      };
    } catch {
      return { missions: [], history: [] };
    }
  }

  save() {
    localStorage.setItem(this.key, JSON.stringify(this.state));
  }

  addMission(mission) {
    this.state.missions.push(mission);
    this.state.history.push({
      type: "MISSION_CREATED",
      missionId: mission.id,
      timestamp: Date.now()
    });
    this.save();
    this._bridgeToRelay(mission, "MISSION_CREATED");
  }

  updateMission(id, patch) {
    const m = this.state.missions.find(x => x.id === id);
    if (!m) return;
    Object.assign(m, patch);
    this.save();
    this._bridgeToRelay(m, "MISSION_UPDATED");
  }

  // Construction predates the shared runtime mission-store.js and keeps its
  // own storage shape/key — this only mirrors that store's relay bridge so
  // Construction's missions still show up in the cross-vertical TSM_EVENT_LOG
  // (Phase 11 cross-mission intelligence reads that log across all verticals).
  _bridgeToRelay(mission, stage) {
    if (typeof window === "undefined" || !window.TSM || !window.TSM.relay) return;
    try {
      window.TSM.relay.write("MISSION", Object.assign({}, mission, { vertical: mission.vertical || "construction" }), {
        caseId: mission.id,
        stage: stage
      });
    } catch (e) { /* relay bridge is best-effort, never block a mission write */ }
  }

  getAll() {
    return this.state.missions;
  }

  getByStatus(status) {
    return this.state.missions.filter(m => m.status === status);
  }
}

window.TSMMissionStore = new TSMMissionStore();