(function () {

  function render(root) {
    if (!root) return false;

    if (root.dataset.tsmReady === "true") return true;

    root.dataset.tsmReady = "true";

    root.innerHTML = `
      <div style="padding:20px;font-family:Arial;background:#0b0f17;color:white;border-radius:8px;">
        <h2>TSM EXECUTIVE DECISION BRIEF</h2>
        <hr style="opacity:0.2"/>

        <p><b>Status:</b> Renderer Active</p>
        <p><b>System:</b> Injection Successful</p>

        <div style="margin-top:15px;opacity:0.9">
          <p><b>Overall Exposure:</b> $2.84M</p>
          <p><b>Risk Score:</b> 74 / 100</p>
          <p><b>Recovery Opportunity:</b> $612K</p>
          <p><b>Confidence:</b> 96%</p>
        </div>

        <hr style="opacity:0.2"/>
        <p><b>Recommended Action:</b> Approve accelerated workflow</p>
      </div>
    `;

    return true;
  }

  function scan() {
    const root = document.getElementById("tsm-executive-briefing-root");
    render(root);
  }

  const observer = new MutationObserver(scan);

  function boot() {
    scan();

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    setInterval(scan, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
