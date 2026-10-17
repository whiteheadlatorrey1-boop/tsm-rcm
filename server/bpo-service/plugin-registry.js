'use strict';

/**
 * Registry of BPO-service vertical plug-ins. A plug-in is:
 *   {
 *     id: 'construction-bpo',             // used in /api/bpo-service/:vertical/... and every stored document's `vertical` field
 *     fileTypes: [{ key, canonicalFields, numericFields?, stringFields?, requiredField, sourceAliases? }, ...],
 *     reportSections: ['jobs', ...],      // top-level keys on a built report holding arrays of entities, each with its own `.flags`
 *     computeFlags(input, thresholds) -> { sections: { [sectionKey]: [...] }, flags: [...], summary: [{key,label,value}, ...] },
 *   }
 * routes.js and report-builder.js only ever go through this registry --
 * neither one imports a specific plug-in directly, so adding a new
 * vertical never requires touching either file.
 */

const plugins = new Map();

function registerPlugin(plugin) {
  if (!plugin || typeof plugin.id !== 'string' || !plugin.id.trim()) throw new Error('plugin.id is required');
  if (typeof plugin.computeFlags !== 'function') throw new Error('plugin.computeFlags must be a function');
  if (!Array.isArray(plugin.reportSections)) throw new Error('plugin.reportSections must be an array');
  if (!Array.isArray(plugin.fileTypes)) throw new Error('plugin.fileTypes must be an array (may be empty)');
  plugins.set(plugin.id, plugin);
  return plugin;
}

function getPlugin(id) {
  return plugins.get(id) || null;
}

function listPlugins() {
  return [...plugins.values()];
}

module.exports = { registerPlugin, getPlugin, listPlugins };
