(function () {
  var TABS = [
    { slug: 'pipeline',   label: 'ENGINE PIPELINE', kind: 'native' },
    { slug: 'compliance', label: 'COMPLIANCE',       kind: 'iframe', src: '../../legal-pro/legal-compliance.html' },
    { slug: 'scenarios',  label: 'SCENARIOS',        kind: 'iframe', src: '../../legal-pro/legal-scenarios.html' },
    { slug: 'trust',      label: 'TRUST / SECURITY', kind: 'iframe', src: '../../legal-pro/legal-trust.html' },
    { slug: 'tax',        label: 'TAX',              kind: 'iframe', src: '../../legal-pro/legal-tax.html' },
    { slug: 'accounting', label: 'ACCOUNTING',       kind: 'iframe', src: '../../legal-pro/legal-account.html' }
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
    var header = document.querySelector('.page-header');
    var shell = document.querySelector('.shell');
    if (!header || !shell) return;

    shell.id = 'tabpanel-pipeline';

    var bar = el('div', { class: 'persona-tab-bar', id: 'personaTabBar' });
    bar.style.cssText = 'display:flex;gap:2px;padding:0 28px;background:rgba(8,17,31,.97);' +
      'border-bottom:1px solid var(--border2);overflow-x:auto;';
    TABS.forEach(function (t) {
      var btn = el('button', { id: 'pt-btn-' + t.slug, class: 'pt-btn' + (t.slug === 'pipeline' ? ' active' : '') }, t.label);
      btn.style.cssText = 'font-family:var(--mono);font-size:9px;letter-spacing:1.5px;text-transform:uppercase;' +
        'padding:12px 16px;background:transparent;border:none;border-bottom:2px solid transparent;' +
        'color:var(--m);cursor:pointer;white-space:nowrap;transition:.15s;';
      btn.addEventListener('click', function () { activate(t.slug); });
      bar.appendChild(btn);
    });
    header.insertAdjacentElement('afterend', bar);

    var styleTag = document.createElement('style');
    styleTag.textContent = '.pt-btn:hover{color:var(--t)}' +
      '.pt-btn.active{color:var(--gold);border-bottom-color:var(--gold)}' +
      '.persona-tab-panel iframe{width:100%;height:calc(100vh - 210px);border:none;display:block}';
    document.head.appendChild(styleTag);

    TABS.filter(function (t) { return t.kind === 'iframe'; }).forEach(function (t) {
      var panel = el('div', { id: 'tabpanel-' + t.slug, class: 'persona-tab-panel' });
      panel.style.display = 'none';
      panel.appendChild(el('iframe', { title: t.label, loading: 'lazy' }));
      shell.insertAdjacentElement('afterend', panel);
    });

    var initial = (location.hash || '').replace('#', '');
    activate(TABS.some(function (t) { return t.slug === initial; }) ? initial : 'pipeline');
  });
})();
