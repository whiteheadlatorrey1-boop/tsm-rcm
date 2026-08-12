import re

file_path = "html/l1-copilot/l1-ticket-copilot.html"

with open(file_path, "r", encoding="utf-8") as f:
    html = f.read()

# Clean up any existing broken script tags
html = re.sub(r'<script id="q15-interceptor">[\s\S]*?<\/script>', '', html)

q15_script = """
<script id="q15-interceptor">
(function() {
  const playbooks = [
    "🔐 Account Lockout", "🔑 Password Reset", "🌐 VPN Connection", 
    "📧 Outlook Auth", "🌁 Wi-Fi / Network", "💻 Boot Loop / Blue Screen",
    "🖥️ Remote Desktop", "🖨️ Printer Mapping", "📦 App Installation",
    "🛡️ MFA / Duo Reset", "💾 Disk Full", "📂 Share Permission",
    "🌐 Web Proxy", "📱 Mobile Sync", "🔒 BitLocker Recovery"
  ];

  function renderQ15() {
    let container = document.getElementById("sec-quick15");
    const main = document.querySelector(".main") || document.querySelector(".main-content") || document.body;

    if (!container) {
      container = document.createElement("div");
      container.id = "sec-quick15";
      container.style.cssText = "display:block !important; padding:20px; width:100%; box-sizing:border-box; background:#0d0d0d; color:#fff; position:relative; z-index:9999;";
      main.appendChild(container);
    }

    const cardsHtml = playbooks.map(p => 
      `<div onclick="alert('Loaded: ' + '${p}')" style="background:#181818; border:1px solid #00e5ff33; padding:16px; border-radius:6px; cursor:pointer; color:#00e5ff; font-size:13px; font-weight:600; display:flex; align-items:center; transition:0.2s;">${p}</div>`
    ).join("");

    container.innerHTML = `
      <div style="border:1px solid #00e5ff; background:rgba(0,229,255,0.05); padding:16px; margin-bottom:16px; border-radius:6px;">
        <div style="color:#00e5ff; font-weight:bold; font-size:12px; margin-bottom:12px; display:flex; justify-content:space-between;">
          <span>⚡ L1 QUICK REFERENCE — TOP 15 SCENARIOS</span>
          <span style="font-size:10px; color:#aaa;">INSTANT OPERATIONAL PLAYBOOKS</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:12px;">
          ${cardsHtml}
        </div>
      </div>
    `;

    // Force hide sibling elements inside main to prevent overlap
    Array.from(main.children).forEach(child => {
      if (child !== container) {
        child.style.display = "none";
      }
    });

    container.style.display = "block";
  }

  // Intercept click on sidebar item
  document.addEventListener("click", function(e) {
    const item = e.target.closest(".sb-item, [data-section], li, a");
    if (item && item.textContent.includes("Quick 15")) {
      e.preventDefault();
      e.stopPropagation();

      document.querySelectorAll(".sb-item").forEach(el => el.classList.remove("active"));
      item.classList.add("active");

      // Small delay to ensure event bus finishes clearing pane before we render
      setTimeout(renderQ15, 50);
    }
  }, true);

  // Check if active on immediate load
  window.addEventListener("load", function() {
    const activeItem = document.querySelector(".sb-item.active");
    if (activeItem && activeItem.textContent.includes("Quick 15")) {
      setTimeout(renderQ15, 100);
    }
  });
})();
</script>
"""

if "</body>" in html:
    html = html.replace("</body>", q15_script + "\n</body>")
else:
    html += q15_script

with open(file_path, "w", encoding="utf-8") as f:
    f.write(html)

print("PATCH APPLIED SUCCESSFULLY")
