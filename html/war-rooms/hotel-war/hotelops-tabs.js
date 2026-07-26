(function () {
  function slugify(t) {
    return t.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var main = document.getElementById('main');
    var modules = document.querySelectorAll('#sidebar .module');
    if (!main || !modules.length) return;

    var firstSlug = slugify(modules[0].textContent);
    var existingWrap = document.createElement('div');
    existingWrap.id = 'tabpanel-' + firstSlug;
    existingWrap.className = 'tabpanel';
    while (main.firstChild) existingWrap.appendChild(main.firstChild);
    main.appendChild(existingWrap);

    modules.forEach(function (mod, i) {
      var slug = slugify(mod.textContent);
      mod.setAttribute('data-tab', slug);
      if (i === 0) return;

      var panel = document.createElement('div');
      panel.id = 'tabpanel-' + slug;
      panel.className = 'tabpanel';
      panel.style.display = 'none';

      if (slug === 'maintenance') {
        panel.innerHTML =
          '<div class="panel"><div class="panel-hdr">MAINTENANCE</div>' +
          '<div class="panel-body" id="panel-maintenance-body" style="padding:0;">Loading&hellip;</div></div>';
      } else if (slug === 'iot-smart-systems' || slug === 'smart-systems' || mod.textContent.trim().toLowerCase().indexOf('iot') !== -1) {
        panel.innerHTML =
          '<div class="panel"><div class="panel-hdr">IOT / SMART SYSTEMS</div>' +
          '<div class="panel-body" id="panel-iot-body" style="padding:0;">Loading&hellip;</div></div>';
      } else if (slug === 'ota-intelligence') {
        panel.innerHTML =
          '<div class="panel"><div class="panel-hdr">OTA INTELLIGENCE</div>' +
          '<div class="panel-body" id="panel-ota-intelligence-body" style="padding:0;">Loading&hellip;</div></div>';
      } else if (slug === 'revenue-management') {
        panel.innerHTML =
          '<div class="panel"><div class="panel-hdr">REVENUE MANAGEMENT</div>' +
          '<div class="panel-body" id="panel-revenue-management-body" style="padding:0;">Loading&hellip;</div></div>';
      } else if (slug === 'compliance') {
        panel.innerHTML =
          '<div class="panel"><div class="panel-hdr">COMPLIANCE</div>' +
          '<div class="panel-body" id="panel-compliance-body" style="padding:0;">Loading&hellip;</div></div>';
      } else {
        panel.innerHTML =
          '<div class="panel"><div class="panel-hdr">' + mod.textContent.toUpperCase() +
          '</div><div class="panel-body" style="padding:24px;color:var(--muted);">' +
          'This module isn\'t built yet — check back soon.</div></div>';
      }
      main.appendChild(panel);
    });

    modules.forEach(function (mod) {
      mod.addEventListener('click', function () {
        modules.forEach(function (m) { m.classList.remove('active'); });
        mod.classList.add('active');
        document.querySelectorAll('#main .tabpanel').forEach(function (p) { p.style.display = 'none'; });
        var slug = mod.getAttribute('data-tab');
        var target = document.getElementById('tabpanel-' + slug);
        if (target) target.style.display = '';
        if (slug === 'maintenance' && typeof renderMaintenanceTab === 'function') {
          renderMaintenanceTab();
        }
        if (typeof renderIotTab === 'function' && document.getElementById('panel-iot-body') && target && target.querySelector('#panel-iot-body')) {
          renderIotTab();
        }
        if (slug === 'ota-intelligence' && typeof renderOtaTab === 'function') {
          renderOtaTab();
        }
        if (slug === 'revenue-management' && typeof renderRevenueTab === 'function') {
          renderRevenueTab();
        }
        if (slug === 'compliance' && typeof renderComplianceTab === 'function') {
          renderComplianceTab();
        }
      });
    });
  });
})();
