window.TSMRuntimeAdapters =
window.TSMRuntimeAdapters || {};

window.TSMRuntimeAdapters["bpo"] = {

domain:"bpo",

events:[

"client.intake",
"document.received",
"processing.started",
"processing.completed",
"quality.exception",
"sla.breach",
"delivery.completed",
"invoice.ready"

]

};
