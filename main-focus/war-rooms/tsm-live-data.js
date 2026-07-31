// =====================================================
// TSM LIVE DATA — shared front-end helper
// =====================================================
// Talks to /api/live-data/:domain/* (see routes/live-data.js).
// Any war room can:
//   1. hydrateModel(domain, model, 'some.path') to override a model's
//      hardcoded sample array with whatever the user uploaded, before
//      constructing its engine.
//   2. mountWidget(el, {domain, label}) to drop in a ready-made
//      upload / revert control that reports whether the room is
//      currently showing LIVE or SAMPLE data.
//
// If nothing has been uploaded, both of these are no-ops and the war
// room keeps behaving exactly as it did before — sample data, honestly
// labeled as sample data.

(function (global) {
  const TSMLiveData = {};

  async function status(domain) {
    const r = await fetch(`/api/live-data/${domain}/status`);
    if (!r.ok) return { ok: false, source: 'sample', record_count: 0 };
    return r.json();
  }

  async function getData(domain) {
    const r = await fetch(`/api/live-data/${domain}/data`);
    if (!r.ok) return { ok: false, source: 'sample', records: [] };
    return r.json();
  }

  async function upload(domain, file) {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`/api/live-data/${domain}/upload`, { method: 'POST', body: fd });
    return r.json();
  }

  async function revert(domain) {
    const r = await fetch(`/api/live-data/${domain}`, { method: 'DELETE' });
    return r.json();
  }

  function setByPath(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  // Overwrites model[path] with uploaded records, if any exist.
  // Returns { source: 'live'|'sample', record_count, filename }
  async function hydrateModel(domain, model, path) {
    const st = await status(domain);
    if (!st.ok || st.source !== 'live' || !st.record_count) {
      return { source: 'sample', record_count: 0 };
    }
    const d = await getData(domain);
    if (!d.ok) return { source: 'sample', record_count: 0 };
    setByPath(model, path, d.records || []);
    return { source: 'live', record_count: (d.records || []).length, filename: d.filename };
  }

  // Drops a small upload/status/revert control into containerEl.
  // options: { domain, label, onChange(statusResult) }
  function mountWidget(containerEl, options) {
    const { domain, label } = options || {};
    if (!containerEl || !domain) return null;

    containerEl.innerHTML = `
      <div style="font-size:9px;letter-spacing:1.5px;color:rgba(255,255,255,0.55);text-transform:uppercase;margin-bottom:8px;">${label || 'LIVE DATA'}</div>
      <div class="tsm-ld-status" style="font-size:11px;opacity:0.8;margin-bottom:8px;line-height:1.5;color:inherit;">Checking data source…</div>
      <input type="file" accept=".csv,.json,.xlsx,.xls" class="tsm-ld-file" style="display:none">
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" class="tsm-ld-upload-btn" style="background:transparent;border:1px solid rgba(255,255,255,0.3);color:inherit;font-family:inherit;font-size:9px;letter-spacing:1.2px;cursor:pointer;padding:7px 14px;">UPLOAD LIVE DATA</button>
        <button type="button" class="tsm-ld-revert-btn" style="display:none;background:transparent;border:1px solid rgba(255,120,120,0.5);color:inherit;font-family:inherit;font-size:9px;letter-spacing:1.2px;cursor:pointer;padding:7px 14px;">REVERT TO SAMPLE DATA</button>
      </div>
    `;

    const statusEl = containerEl.querySelector('.tsm-ld-status');
    const fileInput = containerEl.querySelector('.tsm-ld-file');
    const uploadBtn = containerEl.querySelector('.tsm-ld-upload-btn');
    const revertBtn = containerEl.querySelector('.tsm-ld-revert-btn');

    async function refreshStatus(fireOnChange) {
      const st = await status(domain);
      if (st.ok && st.source === 'live') {
        statusEl.textContent = `LIVE: ${st.filename} (${st.record_count} records)`;
        revertBtn.style.display = '';
      } else {
        statusEl.textContent = 'Currently showing sample/mock data.';
        revertBtn.style.display = 'none';
      }
      if (fireOnChange && options.onChange) options.onChange(st);
      return st;
    }

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      statusEl.textContent = 'Uploading…';
      try {
        const result = await upload(domain, file);
        if (!result.ok) throw new Error(result.error || 'Upload failed');
        await refreshStatus(true); // this upload actually changed the data — notify the war room
      } catch (e) {
        statusEl.textContent = `Upload failed: ${e.message}`;
      } finally {
        fileInput.value = '';
      }
    });

    revertBtn.addEventListener('click', async () => {
      if (!confirm('Revert to sample data? This removes the uploaded file from the server.')) return;
      statusEl.textContent = 'Reverting…';
      await revert(domain);
      await refreshStatus(true); // reverting also changed the data — notify the war room
    });

    refreshStatus(false); // initial paint only — must not re-trigger loadModel()
    return { refreshStatus };
  }

  TSMLiveData.status = status;
  TSMLiveData.getData = getData;
  TSMLiveData.upload = upload;
  TSMLiveData.revert = revert;
  TSMLiveData.hydrateModel = hydrateModel;
  TSMLiveData.setByPath = setByPath;
  TSMLiveData.mountWidget = mountWidget;

  global.TSMLiveData = TSMLiveData;
})(window);
