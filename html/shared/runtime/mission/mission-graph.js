/**
 * TSM Enterprise Mission Graph — Phase 12
 * html/shared/runtime/mission/mission-graph.js
 *
 * Browser IIFE module. Exposes window.TSMMissionGraph.
 * Depends on: window.TSMMissionAnalytics (for the merged runtime +
 * Construction mission list).
 *
 * The graph answers questions no single vertical's view can: "does this
 * client/tenant have open work in more than one vertical right now?" and
 * "which operators are stretched across verticals?" Both are derived
 * directly from real mission fields (tenantId, client, vertical,
 * workflow.assignedTo) — no synthetic relationships are invented.
 *
 * Two node types: mission and entity (a client/tenant OR an operator).
 * Edge: mission -> entity, typed 'client' or 'operator'.
 */
(function (global) {
  'use strict';

  function _missions() {
    return global.TSMMissionAnalytics ? global.TSMMissionAnalytics._allMissions() : [];
  }

  function _entityKey(type, value) {
    return type + ':' + value;
  }

  // Full graph — nodes + edges. Suitable for a force-directed or grouped
  // visualization; also directly queryable without rendering anything.
  function getGraph(filter) {
    var missions = _missions();
    if (filter && filter.vertical) missions = missions.filter(function (m) { return m.vertical === filter.vertical; });

    var nodes = {};
    var edges = [];

    missions.forEach(function (m) {
      var missionKey = 'mission:' + m.id;
      nodes[missionKey] = { id: missionKey, type: 'mission', label: m.id, vertical: m.vertical, stage: m.stage };

      var clientLabel = m.client || m.tenantId;
      if (clientLabel) {
        var clientKey = _entityKey('client', clientLabel);
        if (!nodes[clientKey]) nodes[clientKey] = { id: clientKey, type: 'client', label: clientLabel, verticals: [] };
        if (nodes[clientKey].verticals.indexOf(m.vertical) === -1) nodes[clientKey].verticals.push(m.vertical);
        edges.push({ from: missionKey, to: clientKey, type: 'client' });
      }

      var op = m.workflow && m.workflow.assignedTo;
      if (op) {
        var opKey = _entityKey('operator', op);
        if (!nodes[opKey]) nodes[opKey] = { id: opKey, type: 'operator', label: op, verticals: [] };
        if (nodes[opKey].verticals.indexOf(m.vertical) === -1) nodes[opKey].verticals.push(m.vertical);
        edges.push({ from: missionKey, to: opKey, type: 'operator' });
      }
    });

    return { nodes: Object.keys(nodes).map(function (k) { return nodes[k]; }), edges: edges };
  }

  // Clients/tenants with real work in 2+ verticals right now — the concrete,
  // actionable output of the graph (cross-sell signal, or risk concentration
  // signal, depending on what's actually found).
  function multiVerticalClients() {
    var graph = getGraph();
    return graph.nodes
      .filter(function (n) { return n.type === 'client' && n.verticals.length >= 2; })
      .map(function (n) {
        var missionsForClient = graph.edges
          .filter(function (e) { return e.to === n.id && e.type === 'client'; })
          .map(function (e) { return e.from.replace('mission:', ''); });
        return { client: n.label, verticals: n.verticals, missionCount: missionsForClient.length, missionIds: missionsForClient };
      })
      .sort(function (a, b) { return b.verticals.length - a.verticals.length; });
  }

  // Operators with open work in 2+ verticals — cross-vertical staffing view,
  // distinct from mission-intelligence.js's single-vertical overload check.
  function multiVerticalOperators() {
    var graph = getGraph();
    return graph.nodes
      .filter(function (n) { return n.type === 'operator' && n.verticals.length >= 2; })
      .map(function (n) { return { operator: n.label, verticals: n.verticals }; })
      .sort(function (a, b) { return b.verticals.length - a.verticals.length; });
  }

  // Single client's full footprint — every mission, across every vertical.
  function getClientFootprint(clientOrTenantId) {
    return _missions().filter(function (m) {
      return m.client === clientOrTenantId || m.tenantId === clientOrTenantId;
    });
  }

  global.TSMMissionGraph = {
    getGraph: getGraph,
    multiVerticalClients: multiVerticalClients,
    multiVerticalOperators: multiVerticalOperators,
    getClientFootprint: getClientFootprint
  };

})(typeof window !== 'undefined' ? window : globalThis);