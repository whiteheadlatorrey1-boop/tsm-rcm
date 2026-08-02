(function () {
  // Curated against hub_index.html's Construction section only — construction-suite/
  // has other files (auditops-tax.html, construction-pro.html, financial.html,
  // compliance.html, etc.) that either aren't in the platform hub or are generic
  // shared modules parked under a construction-sounding filename (construction-pro.html
  // is a generic "AuditOps // Sovereign Core" console, same pattern as legal-tax.html;
  // financial.html and compliance.html are likewise generic, not construction-specific).
  var TABS = [
    { slug: 'pipeline', label: 'ENGINE PIPELINE',    kind: 'native' },
    { slug: 'command',  label: 'COMMAND HUB',        kind: 'iframe', src: '../../construction-suite/index.html' },
    { slug: 'fieldops', label: 'FIELD & DOC OPS',    kind: 'iframe', src: '../../construction-suite/construction-suite-expansion.html' },
    { slug: 'permits',  label: 'PERMITS & PROPOSALS', kind: 'iframe', src: '../../construction-suite/permits-proposals.html' },
    { slug: 'docs',     label: 'DOCUMENT SHOWCASE',   kind: 'iframe', src: '../../construction-suite/document-showcase.html' }
  ];

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }

  function activate(slug) {
    TABS.forEach(function (t) {
      var btn = document.getElementById('pt-btn-' + t.slug);
      var panel = document.getElementById('tabpanel-' + t.slug);
      if (!btn || !panel) return;
      var isActive = t.slug === slug;
      btn.classList.toggle('active', isActive);
      panel.style.display = isActive ? '' : 'none';
      if (isActive && t.kind === 'iframe' && !panel.dataset.loaded) {
        var frame = panel.querySelector('iframe');
        if (frame) {
          frame.src = t.src;
          panel.dataset.loaded = '1';
        }
      }
    });
    try { history.replaceState(null, '', '#' + slug); } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    var nav = document.querySelector('.nav');
    var layout = document.querySelector('.layout');
    if (!nav || !layout) return;

    layout.id = 'tabpanel-pipeline';

    var bar = el('div', { class: 'persona-tab-bar', id: 'personaTabBar' });
    bar.style.cssText = 'display:flex;gap:2px;padding:0 16px;background:var(--bg2);' +
      'border-bottom:1px solid var(--border);overflow-x:auto;';
    TABS.forEach(function (t) {
      var btn = el('button', { id: 'pt-btn-' + t.slug, class: 'pt-btn' + (t.slug === 'pipeline' ? ' active' : '') }, t.label);
      btn.style.cssText = "font-family:'Courier New',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;" +
        'padding:10px 14px;background:transparent;border:none;border-bottom:2px solid transparent;' +
        'color:var(--text-dim);cursor:pointer;white-space:nowrap;transition:.15s;';
      btn.addEventListener('click', function () { activate(t.slug); });
      bar.appendChild(btn);
    });
    nav.insertAdjacentElement('afterend', bar);

    var styleTag = document.createElement('style');
    styleTag.textContent = '.pt-btn:hover{color:var(--green)}' +
      '.pt-btn.active{color:var(--gold);border-bottom-color:var(--gold)}' +
      '.persona-tab-panel iframe{width:100%;height:calc(100vh - 210px);border:none;display:block}';
    document.head.appendChild(styleTag);

    TABS.filter(function (t) { return t.kind === 'iframe'; }).forEach(function (t) {
      var panel = el('div', { id: 'tabpanel-' + t.slug, class: 'persona-tab-panel' });
      panel.style.display = 'none';
      panel.appendChild(el('iframe', { title: t.label, loading: 'lazy' }));
      layout.insertAdjacentElement('afterend', panel);
    });

    var initial = (location.hash || '').replace('#', '');
    activate(TABS.some(function (t) { return t.slug === initial; }) ? initial : 'pipeline');
  });
})();
