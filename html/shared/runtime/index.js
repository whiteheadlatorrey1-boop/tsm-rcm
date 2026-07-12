document.addEventListener("DOMContentLoaded", () => {

  console.log("Loading Enterprise Runtime");

  // Legacy pre-existing globals this runtime layers on top of.
  const required = [
    "TSMEventBus",
    "TSMRelay",
    "TSMRuleRegistry",
    "TSMRuntime"
  ];

  // Representative sample from each of the 41 runtime namespaces -- confirms
  // the namespace actually loaded and attached, not just that the 4 legacy
  // globals exist. Not exhaustive (252 files); this is a fast health signal.
  const namespaceSamples = {
    adapters: "TSMAdapterRegistry",
    agents: "TSMAgentRegistry",
    ai: "TSMAI",
    approval: "TSMApprovalEngine",
    assistant: "TSMAssistantAssistantEngine",
    autonomy: "TSMAutonomyEngine",
    "command-center": "TSMCommandDashboard",
    commercial: "TSMCommercialRoiEngine",
    connectors: "TSMConnectorsConnectorEngine",
    "control-plane": "TSMRuntimeHealthMonitor",
    customer: "TSMCustomerOnboardingEngine",
    data: "TSMDataGovernance",
    "decision-surface": "TSMDecisionSurfaceDecisionDashboard",
    deployment: "TSM.environmentManager",
    "digital-twin": "TSMDigitalTwinRelationshipEngine",
    ecosystem: "TSMEcosystemPartnerRegistry",
    "event-mesh": "TSMEventMeshEventProcessor",
    execution: "TSMActionExecutor",
    explainability: "TSMExplainability",
    governance: "TSMPolicyEngine",
    graph: "TSMGraphRelationshipEngine",
    identity: "TSM.userProfileEngine",
    integration: "TSMApiGateway",
    intelligence: "TSMCrossDomainEngine",
    knowledge: "TSMKnowledgeKnowledgeEngine",
    marketplace: "TSMMarketplaceExtensionRegistry",
    memory: "TSMEmbeddingIndex",
    "model-governance": "TSM.modelRegistry",
    mission: "TSMMissionEngine",
    observability: "TSMMetrics",
    operations: "TSMOperationsHealthOrchestrator",
    optimization: "TSMEfficiencyEngine",
    "policy-intelligence": "TSMPolicyIntelligencePolicyEngine",
    prediction: "TSMForecastingEngine",
    "process-mining": "TSMProcessMining",
    quality: "TSMQualityEngine",
    reasoning: "TSMReasoningReasoningEngine",
    rules: "TSMRuleRegistry",
    security: "TSMSecurityAuthenticationEngine",
    simulation: "TSMSimulationSimulationEngine",
    "solution-packaging": "TSM.packRegistry",
    "trust-evidence": "TSM.evidenceLedger",
  };

  function resolvePath(dotted) {
    return dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), window);
  }

  const missing = required.filter(key => !window[key]);

  if (missing.length) {
    console.error("Enterprise Runtime Missing Components:", missing);
    window.TSMRuntimeHealth = { status: "FAILED", missing };
    return;
  }

  window.TSMRuntime.start({
    source: "runtime-bootstrap",
    version: window.TSMRuntime.version,
    timestamp: new Date().toISOString()
  });

  const namespaceStatus = {};
  Object.keys(namespaceSamples).forEach(ns => {
    namespaceStatus[ns] = resolvePath(namespaceSamples[ns]) !== undefined;
  });
  const loadedNamespaces = Object.values(namespaceStatus).filter(Boolean).length;
  const totalNamespaces = Object.keys(namespaceSamples).length;

  window.TSMRuntimeHealth = {
    status: loadedNamespaces === totalNamespaces ? "READY" : "PARTIAL",
    runtime: window.TSMRuntime.version,
    components: { events: true, relay: true, rules: true },
    namespaces: namespaceStatus,
    namespacesLoaded: loadedNamespaces + "/" + totalNamespaces,
    timestamp: new Date().toISOString()
  };

  console.log("Enterprise Runtime", window.TSMRuntime.version,
    window.TSMRuntimeHealth.status, "(" + loadedNamespaces + "/" + totalNamespaces + " namespaces)");
});
