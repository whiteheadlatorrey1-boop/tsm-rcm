/**
 * pack-builder.js
 *
 * Convenience builder for assembling a manifest from existing platform
 * artifacts, e.g. turning the BPO chain plus its rules/dashboards into a
 * 'TSM BPO Enterprise Pack' without hand-writing the manifest JSON.
 */

class PackBuilder {
  constructor(packId, name, vertical) {
    this.packId = packId;
    this.name = name;
    this.vertical = vertical;
    this.components = [];
    this.version = '1.0.0';
    this.description = '';
  }

  setVersion(version) {
    this.version = version;
    return this;
  }

  setDescription(description) {
    this.description = description;
    return this;
  }

  addAgent(ref, meta) {
    this.components.push({ type: 'agent', ref: ref, meta: meta || {} });
    return this;
  }

  addRule(ref, meta) {
    this.components.push({ type: 'rule', ref: ref, meta: meta || {} });
    return this;
  }

  addPolicy(ref, meta) {
    this.components.push({ type: 'policy', ref: ref, meta: meta || {} });
    return this;
  }

  addWorkflowTemplate(ref, meta) {
    this.components.push({ type: 'workflowTemplate', ref: ref, meta: meta || {} });
    return this;
  }

  addDashboard(ref, meta) {
    this.components.push({ type: 'dashboard', ref: ref, meta: meta || {} });
    return this;
  }

  addConnector(ref, meta) {
    this.components.push({ type: 'connector', ref: ref, meta: meta || {} });
    return this;
  }

  build(createManifest) {
    return createManifest({
      packId: this.packId,
      name: this.name,
      vertical: this.vertical,
      version: this.version,
      description: this.description,
      components: this.components,
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PackBuilder: PackBuilder };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.PackBuilder = PackBuilder;
}
