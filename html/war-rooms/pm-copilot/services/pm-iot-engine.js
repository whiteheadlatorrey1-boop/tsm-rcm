/* ============================================================
   TSM PM IOT ENGINE
   war-rooms/pm-copilot/services/pm-iot-engine.js
   Ports the sensor-alert logic from concierge/services/hotelops-engine.js
   (_iotSensorEvaluation / getIotAlerts) to PM Copilot's world: sensors
   are keyed by unit_id (not hotel room / Airbnb listing), and location
   labels resolve through the units array pm-engine.js already loads
   (property + address) rather than a room number or a matched
   airbnb_listings record. Same three real-signal alert types, same
   thresholds, same severity ordering -- no new detection logic
   invented here, just re-keyed to PM's unit model.
   ============================================================ */

(function (global) {
  'use strict';

  const IOT_SEV_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

  class TSMPmIotEngine {
    constructor(model) {
      this.model = model || { entities: {} };
      this.data = { iot_sensors: [] };
      this.units = []; // reference data for location labels -- set via setUnits()
    }

    /* ---------- Loading ---------- */

    setUnits(units) {
      this.units = units || [];
    }

    loadSampleData() {
      const sample = this.model.sample_data || {};
      this.data.iot_sensors = [...(sample.iot_sensors || [])];
    }

    loadRecords(records) {
      this.data.iot_sensors = [...(this.data.iot_sensors || []), ...records];
    }

    /* ---------- Persistence ---------- */

    saveToStorage() {
      try {
        localStorage.setItem('TSM_PM_IOT_DATA', JSON.stringify({ iot_sensors: this.data.iot_sensors }));
        return true;
      } catch (e) {
        console.warn('TSMPmIotEngine: saveToStorage failed', e);
        return false;
      }
    }

    loadFromStorage() {
      try {
        const raw = localStorage.getItem('TSM_PM_IOT_DATA');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        this.data.iot_sensors = Array.isArray(parsed.iot_sensors) ? parsed.iot_sensors : [];
        return true;
      } catch (e) {
        console.warn('TSMPmIotEngine: loadFromStorage failed', e);
        return false;
      }
    }

    clearStorage() {
      try { localStorage.removeItem('TSM_PM_IOT_DATA'); } catch (e) { /* noop */ }
    }

    /* ---------- Sensor alerts ----------
       Real sensor records (this.data.iot_sensors) carry
       type/status/reading/target/unit/unit_id -- no pre-set severity
       or stage. Alerts are derived from actual sensor behavior: an
       offline device, a leak sensor in alert state, or a thermostat
       drifting from its setpoint. Other sensor types (door, smoke,
       occupancy, etc.) are informational only and never generate an
       alert on their own -- same rule set as HotelOps, just applied
       to PM's unit-keyed sensors instead of room/listing-keyed ones. */

    _unitLabel(unitId) {
      const unit = (this.units || []).find(u => u.unit_id === unitId);
      return unit ? `${unit.property} \u2014 ${unit.address}` : (unitId || 'unknown unit');
    }

    _sensorEvaluation(s) {
      const loc = this._unitLabel(s.unit_id);
      if ((s.status || '').toLowerCase() === 'offline') {
        return { severity: 'high', issue: 'Sensor offline', detail: `${s.type || 'Sensor'} in ${loc} is offline \u2014 no readings available.` };
      }
      if ((s.status || '').toLowerCase() === 'alert' || (s.type === 'water_leak' && s.reading === 'detected')) {
        return { severity: 'urgent', issue: 'Water leak detected', detail: `Water leak sensor in ${loc} reports a leak.` };
      }
      if (s.type === 'thermostat' && typeof s.reading === 'number' && typeof s.target === 'number') {
        const diff = Math.round(Math.abs(s.reading - s.target) * 10) / 10;
        const unitLabel = s.unit || '';
        if (diff >= 8) return { severity: 'high', issue: 'Temperature drift', detail: `${loc} reading ${s.reading}${unitLabel} vs target ${s.target}${unitLabel} (${diff}${unitLabel} off).` };
        if (diff >= 4) return { severity: 'medium', issue: 'Temperature drift', detail: `${loc} reading ${s.reading}${unitLabel} vs target ${s.target}${unitLabel} (${diff}${unitLabel} off).` };
      }
      return null;
    }

    getIotAlerts() {
      const sensors = this.data.iot_sensors || [];
      return sensors
        .map(s => {
          const evalResult = this._sensorEvaluation(s);
          if (!evalResult) return null;
          return {
            id: s.sensor_id,
            unit_id: s.unit_id || null,
            unit_label: this._unitLabel(s.unit_id),
            type: s.type,
            status: s.status,
            severity: evalResult.severity,
            issue: evalResult.issue,
            detail: evalResult.detail,
            reading: s.reading,
            target: s.target,
            unit: s.unit,
            record: s
          };
        })
        .filter(Boolean)
        .sort((a, b) => (IOT_SEV_ORDER[a.severity] ?? 4) - (IOT_SEV_ORDER[b.severity] ?? 4));
    }

    /* Same alert list, grouped by unit_id -- convenient for a per-unit
       rollup (e.g. showing a badge on the Units tab) without forcing
       every caller to re-filter getIotAlerts() themselves. */
    getAlertsByUnit() {
      const grouped = {};
      this.getIotAlerts().forEach(a => {
        const key = a.unit_id || 'unassigned';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(a);
      });
      return grouped;
    }

    /* Mirrors pm-engine.js's getExplainItems-shaped output (category/
       id/severity/explain) so PM's relay payload / strategist can fold
       IoT alerts in alongside work_order/lease/vendor explain items
       the same way HotelOps folds iot into its own getExplainItems(). */
    getExplainItems() {
      return this.getIotAlerts().map(it => ({
        category: 'iot',
        id: it.id,
        unit_id: it.unit_id,
        severity: it.severity,
        explain: it.detail
      }));
    }
  }

  global.TSMPmIotEngine = TSMPmIotEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TSMPmIotEngine;
  }
})(typeof window !== 'undefined' ? window : global);
