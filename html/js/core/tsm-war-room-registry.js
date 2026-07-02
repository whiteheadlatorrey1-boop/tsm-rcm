(function (global) {
  'use strict';

  const roomMap = {};
  const aliasMap = {};

  function normalizeId(id) {
    return String(id || '').trim();
  }

  function register(room) {
    if (!room || !room.id) return null;
    const id = normalizeId(room.id);
    const entry = {
      id,
      label: room.label || id,
      url: room.url || '',
      relay: room.relay || '',
      autoKey: room.autoKey || '',
      vertical: room.vertical || room.sector || '',
      aliases: Array.isArray(room.aliases) ? room.aliases.slice() : [],
      ...room
    };

    roomMap[id] = entry;

    if (entry.aliases.length) {
      entry.aliases.forEach(alias => {
        aliasMap[normalizeId(alias)] = id;
      });
    }

    if (entry.alias) {
      aliasMap[normalizeId(entry.alias)] = id;
    }

    return entry;
  }

  function get(id) {
    const key = normalizeId(id);
    return roomMap[key] || roomMap[aliasMap[key]] || null;
  }

  function has(id) {
    return Boolean(get(id));
  }

  function list() {
    return Object.keys(roomMap).map(key => roomMap[key]);
  }

  function getRoutes() {
    return Object.keys(roomMap).reduce((acc, key) => {
      acc[key] = roomMap[key];
      return acc;
    }, {});
  }

  function registerWarRooms(routes) {
    if (!routes || typeof routes !== 'object') return getRoutes();
    Object.entries(routes).forEach(([key, route]) => {
      register(Object.assign({}, route, { id: key }));
    });
    return getRoutes();
  }

  function normalizeClassification(classification) {
    if (!classification || typeof classification !== 'object') return {};
    return {
      documentType: classification.documentType || '',
      fileName: classification.fileName || '',
      client: classification.client || '',
      ref: classification.ref || '',
      vendor: classification.vendor || '',
      amount: classification.amount || classification.value || 0,
      summary: classification.summary || '',
      defectFlags: Array.isArray(classification.defectFlags) ? classification.defectFlags : [],
      verticals: Array.isArray(classification.verticals) ? classification.verticals : [],
      routing: classification.routing || {},
      bnca: classification.bnca || false,
      source: classification.source || '',
      exposure: classification.exposure || '',
      scenario: classification.scenario || ''
    };
  }

  function buildDocText(classification) {
    const normalized = normalizeClassification(classification);
    const parts = [];

    if (normalized.fileName) parts.push(`FILE: ${normalized.fileName}`);
    if (normalized.documentType) parts.push(`TYPE: ${normalized.documentType}`);
    if (normalized.client) parts.push(`CLIENT: ${normalized.client}`);
    if (normalized.ref) parts.push(`REF: ${normalized.ref}`);
    if (normalized.vendor) parts.push(`VENDOR: ${normalized.vendor}`);
    if (normalized.exposure) parts.push(`EXPOSURE: ${normalized.exposure}`);
    if (normalized.scenario) parts.push(`SCENARIO: ${normalized.scenario}`);
    if (normalized.summary) {
      parts.push('');
      parts.push(normalized.summary);
    }

    return parts.filter(Boolean).join('\n');
  }

  function buildRelayPayload(classification, opts = {}) {
    const normalized = normalizeClassification(classification);
    return {
      docText: buildDocText(normalized),
      docType: normalized.documentType || 'DOCUMENT',
      fileName: normalized.fileName || '',
      client: normalized.client || '',
      ref: normalized.ref || '',
      vendor: normalized.vendor || '',
      source: opts.source || 'doc-search',
      timestamp: Date.now(),
      metadata: opts.metadata || {}
    };
  }

  global.TSMWarRoomRegistry = {
    register,
    get,
    has,
    list,
    getRoutes,
    registerWarRooms
  };

  global.TSMExtraction = {
    normalizeClassification,
    buildDocText,
    buildRelayPayload
  };

  global.TSMIntakeGateway = {
    findWarRoomsForClassification(classification) {
      const normalized = normalizeClassification(classification);
      return normalized.verticals.map(v => get(`${v}-war-room`)).filter(Boolean);
    },
    buildRelayPayload
  };

  console.info('[TSMWarRoomRegistry] initialized');
})(window);
