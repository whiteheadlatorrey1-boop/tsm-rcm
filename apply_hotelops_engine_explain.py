#!/usr/bin/env python3
"""Apply-script: add getExplainItems() (real per-record reasons across all
flagged HotelOps categories) and wire it into buildRelayPayload().
Run from repo root: python3 apply_hotelops_engine_explain.py
"""
import pathlib

FILE = pathlib.Path("html/concierge/services/hotelops-engine.js")
src = FILE.read_text()

edits = []

edits.append((
"    /* ---------- AI + relay (mirrors Mortgage/NOC) ---------- */",
"""    /* ---------- Explainability: real per-record reason behind every
       flagged item across all categories. Every string below is built
       only from fields the category's own getter already computed
       (hours_over, overcharge_amount, gaps, gap_pct, etc.) -- nothing
       invented here, just cited in plain language. ---------- */

    getExplainItems() {
      const items = [];

      this.getMaintenanceBreaches().forEach(it => items.push({
        category: 'maintenance', id: it.id, severity: it.severity,
        explain: `${it.title} in ${it.room} — ${it.severity} severity, ${it.hours_over}h past SLA.`
      }));

      this.getOtaExposure().items.forEach(it => items.push({
        category: 'ota_overcharge', id: it.ota_id, severity: 'high',
        explain: `${it.ota}: charged ${it.charged_pct}% vs contracted ${it.contracted_pct}% → $${it.overcharge_amount} overcharge on a $${it.booking_amount} booking.`
      }));

      this.getComplianceRisk().forEach(it => items.push({
        category: 'compliance', id: it.id, severity: it.severity,
        explain: `${it.detail} — due in ${it.due_in_days} days.`
      }));

      this.getIotAlerts().forEach(it => items.push({
        category: 'iot', id: it.id, severity: it.severity,
        explain: it.detail
      }));

      this.getReservationRisks().forEach(it => items.push({
        category: 'reservation', id: it.id, severity: it.severity,
        explain: it.detail
      }));

      this.getFrontDeskBreaches().forEach(it => items.push({
        category: 'front_desk', id: it.id, severity: it.minutes_over > 30 ? 'high' : 'medium',
        explain: `${it.type} request for ${it.guest} in ${it.room} — waited ${it.waited_minutes}min, ${it.minutes_over}min past SLA.`
      }));

      this.getVipReadiness().forEach(it => items.push({
        category: 'vip', id: it.id, severity: it.severity,
        explain: `${it.guest} (${it.tier}) arriving in ${it.arrival_hours_away}h — ${it.gaps.join(', ')}.`
      }));

      this.getHousekeepingBreaches().forEach(it => items.push({
        category: 'housekeeping', id: it.id, severity: it.hours_over >= 4 ? 'high' : 'medium',
        explain: `${it.type} task in ${it.room} assigned to ${it.assigned_to} — ${it.hours_over}h past SLA.`
      }));

      this.getStaffingGaps().forEach(it => items.push({
        category: 'staffing', id: it.id, severity: it.severity,
        explain: `${it.department} ${it.shift} shift short ${it.gap} of ${it.required} required headcount (${it.gap_pct}% gap).`
      }));

      this.getOpenIncidents().forEach(it => items.push({
        category: 'incident', id: it.id, severity: it.severity,
        explain: `${it.type} incident in ${it.area} — reported ${it.reported_hours_ago}h ago${it.hours_over != null && it.hours_over > 0 ? `, ${it.hours_over}h past response SLA` : ''}.`
      }));

      this.getAirbnbRisks().items.forEach(it => items.push({
        category: 'airbnb', id: it.listing_id, severity: it.severity,
        explain: `${it.unit_name}: ${it.issue}`
      }));

      return items.sort((a, b) => (SEV_ORDER[a.severity] ?? 4) - (SEV_ORDER[b.severity] ?? 4));
    }

    /* ---------- AI + relay (mirrors Mortgage/NOC) ---------- */"""
))

edits.append((
"""        airbnb_risks: this.getAirbnbRisks(),
        records: {""",
"""        airbnb_risks: this.getAirbnbRisks(),
        explain_items: this.getExplainItems(),
        records: {"""
))

for i, (old, new) in enumerate(edits, 1):
    count = src.count(old)
    assert count == 1, f"Edit {i}: match count {count} (expected 1)"
    src = src.replace(old, new, 1)

FILE.write_text(src)
print("Patched", FILE)
