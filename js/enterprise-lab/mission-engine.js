import eventBus from './event-bus.js';

/**
 * MissionEngine - Handles active player objectives, milestone tracking, 
 * and profile XP rewards. It translates infrastructure failures into gamified objectives.
 */
class MissionEngine {
  constructor() {
    this.missions = [];
    this.playerProfile = {
      xp: 0,
      level: 1,
      score: 0,
      completedMissions: 0
    };
    this.init();
  }

  init() {
    // Synchronize local states with cached simulator database
    const cachedState = localStorage.getItem('tsm_simulator_state');
    if (cachedState) {
      try {
        const parsed = JSON.parse(cachedState);
        this.missions = parsed.missions || [];
        this.playerProfile = parsed.playerProfile || this.playerProfile;
      } catch (e) {
        this.missions = [];
      }
    }

    // Bind event hooks
    eventBus.on('mission:create', (missionData) => this.createMission(missionData));
    eventBus.on('mission:update-progress', (data) => this.updateMissionProgress(data.missionId, data.progress));
    eventBus.on('profile:award-xp', (data) => this.awardXp(data.amount, data.reason));
    
    // Auto-complete missions when their target device is restored
    eventBus.on('device:updated', (data) => this.evaluateDeviceMissions(data.deviceId, data.device));

    // Reset support
    eventBus.on('sim:reset-complete', () => {
      this.missions = [];
      this.playerProfile = { xp: 0, level: 1, score: 0, completedMissions: 0 };
    });
  }

  /**
   * Spawns a new active objective inside the Mission Queue.
   */
  createMission(missionData) {
    const newMission = {
      id: 'MSN-' + Math.floor(1000 + Math.random() * 9000),
      title: missionData.title || "Target Remediation Objective",
      objective: missionData.objective || "Remediate infrastructure abnormalities.",
      status: "Active", // Active, Completed, Failed
      progress: 0, // 0 to 100 percent
      xpReward: missionData.xpReward || 100,
      targetDeviceId: missionData.targetDeviceId || null,
      createdAt: Date.now(),
      completedAt: null,
      ...missionData
    };

    // Avoid duplicates for the same active system error
    const exists = this.missions.some(m => m.targetDeviceId === newMission.targetDeviceId && m.status === 'Active');
    if (exists) return;

    this.missions.push(newMission);
    this.commitToState();

    eventBus.emit('system:log', { 
      message: `NEW MISSION INJECTED: ${newMission.title} [Reward: ${newMission.xpReward} XP]`, 
      type: 'info' 
    });
    
    eventBus.emit('mission:created-notification', newMission);
  }

  /**
   * Adjusts the percentage completion of an active mission.
   */
  updateMissionProgress(missionId, progress) {
    const mission = this.missions.find(m => m.id === missionId);
    if (!mission || mission.status !== 'Active') return;

    mission.progress = Math.min(Math.max(progress, 0), 100);
    
    if (mission.progress === 100) {
      this.completeMission(mission);
    } else {
      this.commitToState();
      eventBus.emit('mission:updated-notification', { missionId, mission });
    }
  }

  /**
   * Gracefully completes an active mission and fires profile XP.
   */
  completeMission(mission) {
    mission.status = "Completed";
    mission.completedAt = Date.now();
    this.playerProfile.completedMissions += 1;
    this.playerProfile.score += mission.xpReward;

    this.commitToState();

    eventBus.emit('system:log', { 
      message: `MISSION ACCOMPLISHED: "${mission.title}" successfully cleared!`, 
      type: 'success' 
    });

    eventBus.emit('profile:award-xp', { 
      amount: mission.xpReward, 
      reason: `Completed Mission: ${mission.title}` 
    });

    eventBus.emit('mission:completed-notification', mission);
  }

  /**
   * Checks if an altered device is now online/restored, auto-clearing linked missions.
   */
  evaluateDeviceMissions(deviceId, device) {
    if (device.status === 'online') {
      const correlatedMissions = this.missions.filter(
        m => m.targetDeviceId === deviceId && m.status === 'Active'
      );

      correlatedMissions.forEach(mission => {
        this.updateMissionProgress(mission.id, 100);
      });
    }
  }

  /**
   * Awards experience points to the player and handles leveling mechanics.
   */
  awardXp(amount, reason) {
    this.playerProfile.xp += amount;
    
    // Level scaling formula: Level * 1000 XP
    const xpNeededForNextLevel = this.playerProfile.level * 1000;
    
    if (this.playerProfile.xp >= xpNeededForNextLevel) {
      this.playerProfile.xp -= xpNeededForNextLevel;
      this.playerProfile.level += 1;
      
      eventBus.emit('system:log', { 
        message: `LEVEL UP! You reached Level ${this.playerProfile.level}! 🎉`, 
        type: 'success' 
      });
      eventBus.emit('profile:level-up', this.playerProfile);
    }

    this.commitToState();
    
    eventBus.emit('system:log', {
      message: `Awarded +${amount} XP for: ${reason}`,
      type: 'info'
    });
  }

  /**
   * Pushes calculations down to the Simulator global database.
   */
  commitToState() {
    eventBus.emit('state:mutate', { key: 'missions', value: this.missions });
    eventBus.emit('state:mutate', { key: 'playerProfile', value: this.playerProfile });
  }
}

// Self-instantiate as a singleton
const missionEngine = new MissionEngine();
export default missionEngine;