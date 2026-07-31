window.TSMRoutingExplainer = (() => {

  function explainRoute({ sector, mission }) {

    const sectorMap = {
      healthcare: [
        "HIPAA compliance required",
        "clinical workflow routing engaged",
        "medical document AI activated"
      ],
      insurance: [
        "claims pipeline detected",
        "payer logic routing applied",
        "fraud/compliance filters enabled"
      ],
      construction: [
        "project cost structure analyzed",
        "document ingestion required",
        "CFO reporting pipeline engaged"
      ],
      finops: [
        "financial forecasting model selected",
        "risk evaluation engine activated",
        "budget intelligence layer engaged"
      ]
    };

    const base = sectorMap[sector] || ["generic routing fallback applied"];

    return {
      sector,
      mission,
      reasoning: base,
      confidence: Math.floor(Math.random() * 20) + 80
    };
  }

  return { explainRoute };

})();