node -e '
const fs = require("fs");

const patchCode = `
<script id="q15-interceptor">
(function() {
  function ensureQ15Section() {
    const mainContainer = document.querySelector(".main") || document.querySelector(".main-content") || document.body;
    let sec = document.getElementById("sec-quick15");

    if (!sec) {
      sec = document.createElement("div");
      sec.id = "sec-quick15";
      sec.className = "section";
      sec.style.cssText = "display:none; padding:16px; width:100%; box-sizing:border-box;";
      mainContainer.appendChild(sec);
    }

    sec.innerHTML = "<div class=\\"card\\" style=\\"border:1px solid #00e5ff; background:rgba(0,229,255,0.05); padding:16px; margin-bottom:16px; border-radius:4px;\\"><div style=\\"color:#00e5ff; font-weight:bold; font-size:12px; margin-bottom:8px; display:flex; justify-content:space-between;\\"><span>⚡ L1 QUICK REFERENCE — TOP 15 SCENARIOS</span><span style=\\"font-size:10px; color:#aaa;\\">INSTANT OPERATIONAL PLAYBOOKS</span></div><div id=\\"q15GridContainer\\" style=\\"display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:12px; margin-top:12px;\\"></div></div>";

    renderQ15Cards();
  }

  function renderQ15Cards() {
    const grid = document.getElementById("q15GridContainer");
    if (!grid) return;

    const playbooks = [
      "🔐 Account Lockout", "🔑 Password Reset", "🌐 VPN Connection", 
      "📧 Outlook Auth", "🌁 Wi-Fi / Network", "💻 Boot Loop / Blue Screen",
      "🖥️ Remote Desktop", "🖨️ Printer Mapping", "📦 App Installation",
      "🛡️ MFA / Duo Reset", "💾 Disk Full", "📂 Share Permission",
      "🌐 Web Proxy", "📱 Mobile Sync", "🔒 BitLocker Recovery"
    ];

    grid.innerHTML = playbooks.map(p => "<div onclick=\\"alert(\x27Loaded: \x27 + \x27" + p + "\x27)\\" style=\\"background:#1a1a1a; border:1px solid #333; padding:12px; border-radius:4px; cursor:pointer; color:#fff; font-size:12px; transition:0.2s;\\">" + p + "</div>").join("");
  }

  document.addEventListener("click", function(e) {
    const target = e.target.closest(".sb-item, [data-section]");
    if (!target) return;

    if (target.textContent.includes("Quick 15")) {
      e.preventDefault();
      e.stopPropagation();

      ensureQ15Section();

      document.querySelectorAll(".section, section, .main > div").forEach(el => {
        if (el.id !== "sec-quick15") el.style.display = "none";
      });

      const sec = document.getElementById("sec-quick15");
      if (sec) {
        sec.style.display = "block";
        sec.style.visibility = "visible";
        sec.style.opacity = "1";
      }

      document.querySelectorAll(".sb-item").forEach(item => item.classList.remove("active"));
      target.classList.add("active");
    }
  }, true);
})();
</script>
`;

const file = "html/l1-copilot/l1-ticket-copilot.html";
let html = fs.readFileSync(file, "utf8");

if (!html.includes("q15-interceptor")) {
  html = html.replace("</body>", patchCode + "\n</body>");
  fs.writeFileSync(file, html);
  console.log("SUCCESS: Patched l1-ticket-copilot.html without string corruption!");
} else {
  console.log("Already patched!");
}
'