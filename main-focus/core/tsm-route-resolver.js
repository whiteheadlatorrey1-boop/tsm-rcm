window.TSM_ROUTE = {
  get(routeId) {
    const base = TSM_ROUTE_MAP[routeId];

    if (!base) {
      throw new Error("Unknown routeId: " + routeId);
    }

    return {
      routeId,
      label: routeId.replace(/-/g, " "),
      url: `/html/${base.suite}/${routeId}.html`,
      relayKey: `tsm_${base.suite}_war_relay`,
      
    };
  }
};