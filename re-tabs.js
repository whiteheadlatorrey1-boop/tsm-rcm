/* ============================================================
   TSM RE PORTFOLIO-OPS TAB ORCHESTRATOR
   war-rooms/re-war/re-tabs.js
   Mirrors war-rooms/hotel-war/hotelops-tabs.js's module/tabpanel
   click-wiring pattern, scoped to #pfSidebar/#pfMain (the new
   "Portfolio Ops" view added additively to re-war-room.html) so
   it never touches the existing #sidebar .node-btn nodes.
   ============================================================ */

(function () {
  function slugify(t) {
    return t.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  const PANELS = {
    'listings': { title: 'LISTINGS', render: 'renderListingsTab' },
    'leases': { title: 'LEASES', render: 'renderLeasesTab' },
    'closings': { title: 'CLOSINGS', render: 'renderClosingsTab' },
    'escrow': { title: 'ESCROW', render: 'renderEscrowTab' },
    'maintenance': { title: 'MAINTENANCE', render: 'renderRePfMaintenanceTab' },
    'vendors': { title: 'VENDORS', render: 'renderVendorsTab' },
    'accounting': { title: 'ACCOUNTING', render: 'renderAccountingTab' },
    'compliance': { title: 'COMPLIANCE', render: 'renderRePfComplianceTab' }
  };

  function initPortfolioTabs() {
    var main = document.getElementById('pfMain');
    var modules = document.querySelectorAll('#pfSidebar .pf-module');
    if (!main || !modules.length || main.dataset.pfInit === 'true') return;
    main.dataset.pfInit = 'true';

    modules.forEach(function (mod, i) {
      var slug = mod.getAttribute('data-tab') || slugify(mod.textContent);
      mod.setAttribute('data-tab', slug);
      var cfg = PANELS[slug];

      var panel = document.createElement('div');
      panel.id = 'tabpanel-pf-' + slug;
      panel.className = 'pf-tabpanel';
      panel.style.display = i === 0 ? '' : 'none';

      if (cfg) {
        panel.innerHTML =
          '<div class="pf-panel"><div class="pf-panel-hdr">' + cfg.title + '</div>' +
          '<div class="pf-panel-body" id="panel-pf-' + slug + '-body">Loading&hellip;</div></div>';
      } else {
        panel.innerHTML =
          '<div class="pf-panel"><div class="pf-panel-hdr">' + mod.textContent.toUpperCase() +
          '</div><div class="pf-panel-body" style="padding:24px;color:var(--muted);">' +
          'This module isn\'t built yet — check back soon.</div></div>';
      }
      main.appendChild(panel);

      if (i === 0) mod.classList.add('active');
    });

    modules.forEach(function (mod) {
      mod.addEventListener('click', function () {
        modules.forEach(function (m) { m.classList.remove('active'); });
        mod.classList.add('active');
        main.querySelectorAll('.pf-tabpanel').forEach(function (p) { p.style.display = 'none'; });
        var slug = mod.getAttribute('data-tab');
        var target = document.getElementById('tabpanel-pf-' + slug);
        if (target) target.style.display = '';
        var cfg = PANELS[slug];
        if (cfg && typeof window[cfg.render] === 'function') window[cfg.render]();
      });
    });

    // Render the first (default-active) panel immediately.
    var firstSlug = modules[0].getAttribute('data-tab');
    var firstCfg = PANELS[firstSlug];
    if (firstCfg && typeof window[firstCfg.render] === 'function') window[firstCfg.render]();
  }

  global_registerPortfolioTabsInit(initPortfolioTabs);

  function global_registerPortfolioTabsInit(fn) {
    // Exposed so re-war-room.html can call this once the Portfolio Ops
    // view tab is first opened (view is hidden/lazy, unlike HotelOps
    // which renders its tabs on DOMContentLoaded).
    window.TSMInitPortfolioTabs = fn;
  }
})();
