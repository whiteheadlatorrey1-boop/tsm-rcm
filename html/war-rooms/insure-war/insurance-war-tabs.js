(function () {
  var TABS = [
    { slug: 'pipeline',     label: 'ENGINE PIPELINE', kind: 'native' },
    { slug: 'claims',       label: 'CLAIMS',          kind: 'iframe', src: '../../tsm-insurance/ins-claims.html' },
    { slug: 'appeals',      label: 'APPEALS',         kind: 'iframe', src: '../../tsm-insurance/ins-appeals.html' },
    { slug: 'underwriting', label: 'UNDERWRITING',    kind: 'iframe', src: '../../tsm-insurance/ins-underwriting.html' },
    { slug: 'liability',    label: 'LIABILITY',       kind: 'iframe', src: '../../tsm-insurance/ins-liability.html' },
    { slug: 'malpractice',  label: 'MALPRACTICE',     kind: 'iframe', src: '../../tsm-insurance/ins-malpractice.html' },
    { slug: 'compliance',   label: 'COMPLIANCE',      kind: 'iframe', src: '../../tsm-insurance/ins-compliance.html' },
    { slug: 'agents',       label: 'AGENTS',          kind: 'iframe', src: '../../tsm-insurance/agents-ins.html' }
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
    var navEl = document.querySelector('nav.nav');
    var layout = document.querySelector('.layout');
    if (!navEl || !layout) return;

    layout.id = 'tabpanel-pipeline';

    var bar = el('div', { class: 'persona-tab-bar', id: 'personaTabBar' });
    bar.style.cssText = 'display:flex;gap:2px;padding:0 20px;background:rgba(10,10,20,.97);' +
      'border-bottom:1px solid rgba(255,255,255,.1);overflow-x:auto;';
    TABS.forEach(function (t) {
      var btn = el('button', { id: 'pt-btn-' + t.slug, class: 'pt-btn' + (t.slug === 'pipeline' ? ' active' : '') }, t.label);
      btn.style.cssText = 'font-size:9px;letter-spacing:1.5px;text-transform:uppercase;' +
        'padding:12px 14px;background:transparent;border:none;border-bottom:2px solid transparent;' +
        'color:#8899aa;cursor:pointer;white-space:nowrap;transition:.15s;font-family:inherit;';
      btn.addEventListener('click', function () { activate(t.slug); });
      bar.appendChild(btn);
    });
    navEl.insertAdjacentElement('afterend', bar);

    var styleTag = document.createElement('style');
    styleTag.textContent = '.pt-btn:hover{color:#fff}' +
      '.pt-btn.active{color:#d4af37;border-bottom-color:#d4af37}' +
      '.persona-tab-panel iframe{width:100%;height:calc(100vh - 160px);border:none;display:block}';
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
