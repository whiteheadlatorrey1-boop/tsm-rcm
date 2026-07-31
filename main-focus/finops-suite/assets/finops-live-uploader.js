(function(){
  function install(){
    const host = document.getElementById("finopsLiveUploader");
    if(!host) return;

    host.innerHTML = `
      <style>
      .fin-upload{
        margin:18px 0;
        padding:18px;
        border:1px solid #00f59f;
        border-radius:16px;
        background:#031a14;
        color:#d9f3ff;
        font-family:monospace;
        box-shadow:0 0 20px rgba(0,245,159,.14);
      }
      .fin-upload-title{
        color:#00f59f;
        font-weight:900;
        letter-spacing:.14em;
        margin-bottom:10px;
      }
      .fin-drop{
        border:1px dashed #00e0ff;
        border-radius:14px;
        padding:22px;
        background:#061018;
        text-align:center;
        color:#9bbbd0;
      }
      .fin-drop.drag{border-color:#00f59f;background:#041a12;color:#d9f3ff}
      .fin-upload-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
      .fin-upload-actions button{
        background:transparent;
        color:#00e0ff;
        border:1px solid #00e0ff;
        border-radius:8px;
        padding:10px 12px;
        font:900 11px monospace;
        cursor:pointer;
      }
      .fin-upload-actions button.primary{background:#00f59f;color:#001018;border-color:#00f59f}
      .fin-upload-output{
        white-space:pre-wrap;
        margin-top:12px;
        background:#02070d;
        border:1px solid #123050;
        border-radius:12px;
        padding:14px;
        min-height:130px;
        line-height:1.5;
      }
      .fin-upload-micdrop{
        margin-top:10px;
        padding:12px;
        border:1px solid rgba(0,245,159,.45);
        border-radius:10px;
        background:#02110d;
        color:#00f59f;
        font-weight:900;
      }
      </style>

      <section class="fin-upload">
        <div class="fin-upload-title">LIVE DOCUMENT UPLOADER · MIC-DROP MODE</div>
        <div style="color:#9bbbd0;margin-bottom:12px">
          Upload 1 actual client document — reconciliation, AP aging, invoice report, GL extract, variance report, or audit finding.
          The file is processed through the FinOps node chain and pushed to FinOps Main Strategist.
        </div>

        <div class="fin-drop" id="finUploadDrop">
          <div style="font-size:28px;margin-bottom:8px">⬆️</div>
          <b>Drop a file here or choose one</b><br>
          <small>Best: .txt, .csv, .md, .json. PDFs/images are demo-normalized safely.</small><br><br>
          <input id="finUploadFile" type="file" />
        </div>

        <div class="fin-upload-actions">
          <button class="primary" onclick="FINOPS_UPLOADER.run()">RUN UPLOADED DOCUMENT</button>
          <button onclick="FINOPS_UPLOADER.push()">OPEN FINOPS MAIN STRATEGIST</button>
        </div>

        <div class="fin-upload-output" id="finUploadOutput">
Ready. Ask: “Do you have one reconciliation, AP aging, or variance file we can run?”
        </div>

        <div class="fin-upload-micdrop">
          Talk track: “That’s your actual document — already organized into action.”
        </div>
      </section>
    `;

    const drop = document.getElementById("finUploadDrop");
    const input = document.getElementById("finUploadFile");

    ["dragenter","dragover"].forEach(evt=>{
      drop.addEventListener(evt,e=>{e.preventDefault(); drop.classList.add("drag");});
    });
    ["dragleave","drop"].forEach(evt=>{
      drop.addEventListener(evt,e=>{e.preventDefault(); drop.classList.remove("drag");});
    });
    drop.addEventListener("drop",e=>{
      if(e.dataTransfer.files?.[0]) input.files = e.dataTransfer.files;
    });
  }

  async function run(){
    const input = document.getElementById("finUploadFile");
    const out = document.getElementById("finUploadOutput");
    const file = input?.files?.[0];

    if(!file){
      out.textContent = "Choose a file first. Best demo docs: bank reconciliation, AP aging, GL detail, or variance report.";
      return;
    }

    out.textContent = `Uploading and analyzing: ${file.name}\n\nRunning Financial Intel + Tax + Compliance + Zero Trust + Strategist...`;

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("https://tsm-shell.fly.dev/api/finops/upload-doc", {method:"POST", body:fd});
    const data = await res.json();

    if(data.report){
      window.__FINOPS_UPLOADED_REPORT__ = data.report;
      out.textContent = data.report.summary;
    }else{
      out.textContent = "Document processed, but no report returned.";
    }
  }

  function push(){
    location.href="/html/finops-main-strategist/index.html?v=live-upload";
  }

  window.FINOPS_UPLOADER = { run, push };
  document.addEventListener("DOMContentLoaded", install);
})();
