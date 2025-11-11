(function () {
  'use strict';

  function injectPanel() {
    if (document.getElementById('niveles-panel')) return;

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'fixed',
      top: '40px',
      right: '40px',
      width: '380px',
      height: '400px',
      background: '#fff',
      border: '2px solid #007bff',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      zIndex: 999999,
      overflow: 'hidden'
    });

    panel.innerHTML = `
      <div id="niveles-header" style="
        background:#007bff;
        color:#fff;
        padding:6px 10px;
        font-weight:bold;
        cursor:move;
        user-select:none;
        display:flex;
        align-items:center;
        justify-content:space-between;
      ">
        <span>📶 Niveles DOCSIS</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <button id="niv-min" title="Minimizar" style="border:none;background:none;color:#fff;cursor:pointer;">–</button>
          <button id="niv-max" title="Maximizar" style="border:none;background:none;color:#fff;cursor:pointer;">□</button>
          <button id="niv-close" title="Cerrar" style="border:none;background:none;color:#fff;cursor:pointer;">✕</button>
        </div>
      </div>

      <div id="niveles-body" style="display:flex;flex-direction:column;height:calc(100% - 40px);padding:8px;">

        <!-- 🔸 Banner de aviso -->
        <div style="
          background:#fff3cd;
          color:#333;
          border:1px solid #facc15;
          border-radius:6px;
          padding:6px 8px;
          font-size:12px;
          margin-bottom:8px;
        ">
          ⚠️ Pon los valores exactamente como salen en las gráficas, <strong>no hagas ninguna suma.</strong>
        </div>

        <div style="display:grid;grid-template-columns: 1fr 90px;gap:6px;align-items:center;margin-bottom:6px;">
          <label for="snrds">SNR Downstream <span style="color:#22c55e;">(verde)</span></label>
          <input id="snrds" type="text" inputmode="decimal" style="padding:5px 6px;border:1px solid #ccc;border-radius:6px;">
          <label for="snrus">SNR Upstream <span style="color:#3b82f6;">(azul)</span></label>
          <input id="snrus" type="text" inputmode="decimal" style="padding:5px 6px;border:1px solid #ccc;border-radius:6px;">
          <label for="rxds">Rx Downstream <span style="color:#ef4444;">(roja)</span></label>
          <input id="rxds" type="text" inputmode="decimal" style="padding:5px 6px;border:1px solid #ccc;border-radius:6px;">
          <label for="rxus">Rx Upstream <span style="color:#a855f7;">(morada)</span></label>
          <input id="rxus" type="text" inputmode="decimal" style="padding:5px 6px;border:1px solid #ccc;border-radius:6px;">
          <label for="txus">Tx Upstream <span style="color:#f59e0b;">(amarilla)</span></label>
          <input id="txus" type="text" inputmode="decimal" style="padding:5px 6px;border:1px solid #ccc;border-radius:6px;">
          <label for="modelo-modem">Modelo módem</label>
          <input id="modelo-modem" type="text" style="padding:5px 6px;border:1px solid #ccc;border-radius:6px;">
          <label for="modelo-router">Modelo router</label>
          <input id="modelo-router" type="text" style="padding:5px 6px;border:1px solid #ccc;border-radius:6px;">
        </div>

        <div style="display:flex;align-items:center;gap:6px;">
          <button id="niv-copy" style="padding:6px 10px;border:none;border-radius:6px;background:#1f6feb;color:#fff;cursor:pointer;">Copiar resumen</button>
          <div id="niv-preview" style="font-size:11px;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
        </div>
      </div>

      <div id="niv-resize" style="position:absolute;width:16px;height:16px;right:0;bottom:0;cursor:nwse-resize;
        background:linear-gradient(135deg,transparent 50%,#007bff 50%);pointer-events:none;"></div>
    `;
    document.body.appendChild(panel);

    /**************************************************************************
     * 🧮 FUNCIONALIDAD DE CAMPOS Y COPIADO
     **************************************************************************/
    const ids = ['snrds', 'snrus', 'rxds', 'rxus', 'txus'];
    const btnCopy = panel.querySelector('#niv-copy');
    const preview = panel.querySelector('#niv-preview');
    const modem = panel.querySelector('#modelo-modem');
    const router = panel.querySelector('#modelo-router');

    const cleanNumber = s => {
      if (!s) return '';
      s = s.replace(/[^\d\-.]/g, '');
      s = s.replace(/(?!^)-/g, '');
      const num = parseFloat(s);
      return Number.isFinite(num) ? num.toFixed(1) : '';
    };

    const buildText = () => {
      const vals = Object.fromEntries(ids.map(id => [id, parseFloat(panel.querySelector('#' + id).value) || 0]));
      const rxdsAdj = Math.round(vals.rxds + 60);
      const txusAdj = Math.round(vals.txus + 60);

      let base = `Niveles: RxDS: ${rxdsAdj} dB / TxUS: ${txusAdj} dB / RxUS (cabecera): ${Math.round(vals.rxus)} dB / SNR DS: ${Math.round(vals.snrds)} dB / SNR US: ${Math.round(vals.snrus)} dB`;
      const partes = [];
      if (modem.value.trim()) partes.push('Modem: ' + modem.value.trim());
      if (router.value.trim()) partes.push('Router: ' + router.value.trim());
      if (partes.length) base += ' - ' + partes.join('. ') + '.';
      return base;
    };

    const updatePreview = () => preview.textContent = buildText();

    ids.forEach(id => {
      const el = panel.querySelector('#' + id);
      el.addEventListener('input', () => {
        const pos = el.selectionStart;
        el.value = cleanNumber(el.value);
        try { el.setSelectionRange(pos, pos); } catch {}
        updatePreview();
      });
      el.addEventListener('keydown', e => { if (e.key === 'Enter') copyNow(); });
    });
    modem.addEventListener('input', updatePreview);
    router.addEventListener('input', updatePreview);

    async function copyNow() {
      const text = buildText();
      try {
        await navigator.clipboard.writeText(text);
        btnCopy.textContent = '¡Copiado!';
        btnCopy.style.background = '#10b981';
      } catch {
        btnCopy.textContent = 'Error';
        btnCopy.style.background = '#f59e0b';
      }
      setTimeout(() => { btnCopy.textContent = 'Copiar resumen'; btnCopy.style.background = '#1f6feb'; }, 1400);
    }
    btnCopy.onclick = copyNow;

    updatePreview();

    /**************************************************************************
     * 🪟 MOVIMIENTO, MIN/MAX, REDIMENSION Y LÍMITES
     **************************************************************************/
    const header = panel.querySelector('#niveles-header');
    const body = panel.querySelector('#niveles-body');
    const btnMin = panel.querySelector('#niv-min');
    const btnMax = panel.querySelector('#niv-max');
    const btnClose = panel.querySelector('#niv-close');

    let dragging = false, resizeDir = null;
    let offsetX = 0, offsetY = 0, startX = 0, startY = 0, startW = 0, startH = 0, startL = 0, startT = 0;
    let savedRect = null, minimized = false;

    header.addEventListener('mousedown', e => {
      if (e.target.closest('button')) return;
      dragging = true;
      offsetX = e.clientX - panel.offsetLeft;
      offsetY = e.clientY - panel.offsetTop;
      document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', e => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const minW = 300, minH = 300;
      if (dragging && !resizeDir) {
        let L = e.clientX - offsetX, T = e.clientY - offsetY;
        L = Math.min(Math.max(0, L), vw - panel.offsetWidth);
        T = Math.min(Math.max(0, T), vh - panel.offsetHeight);
        panel.style.left = L + 'px';
        panel.style.top = T + 'px';
        return;
      }
      if (resizeDir) {
        let w = startW, h = startH, L = startL, T = startT;
        const dx = e.clientX - startX, dy = e.clientY - startY;
        if (resizeDir.includes('e')) w = startW + dx;
        if (resizeDir.includes('w')) { w = startW - dx; L = startL + dx; }
        if (resizeDir.includes('s')) h = startH + dy;
        if (resizeDir.includes('n')) { h = startH - dy; T = startT + dy; }
        w = Math.max(minW, Math.min(w, vw - 8));
        h = Math.max(minH, Math.min(h, vh - 8));
        L = Math.min(Math.max(0, L), vw - w);
        T = Math.min(Math.max(0, T), vh - h);
        panel.style.width = w + 'px';
        panel.style.height = h + 'px';
        panel.style.left = L + 'px';
        panel.style.top = T + 'px';
      }
    });
    window.addEventListener('mouseup', () => { dragging = false; resizeDir = null; document.body.style.userSelect = ''; });

    // --- 8 bordes redimensionables ---
    const edges = [
      { dir:'n',  style:{ top:'-2px', left:'8px', right:'8px', height:'6px', cursor:'ns-resize' }},
      { dir:'s',  style:{ bottom:'-2px', left:'8px', right:'8px', height:'6px', cursor:'ns-resize' }},
      { dir:'e',  style:{ right:'-2px', top:'8px', bottom:'8px', width:'6px', cursor:'ew-resize' }},
      { dir:'w',  style:{ left:'-2px', top:'8px', bottom:'8px', width:'6px', cursor:'ew-resize' }},
      { dir:'ne', style:{ right:'-2px', top:'-2px', width:'10px', height:'10px', cursor:'nesw-resize' }},
      { dir:'nw', style:{ left:'-2px', top:'-2px', width:'10px', height:'10px', cursor:'nwse-resize' }},
      { dir:'se', style:{ right:'-2px', bottom:'-2px', width:'14px', height:'14px', cursor:'nwse-resize' }},
      { dir:'sw', style:{ left:'-2px', bottom:'-2px', width:'14px', height:'14px', cursor:'nesw-resize' }},
    ];
    edges.forEach(cfg => {
      const h = document.createElement('div');
      h.dataset.dir = cfg.dir;
      Object.assign(h.style, { position:'absolute', zIndex:'1000000', background:'transparent', ...cfg.style });
      h.addEventListener('mousedown', e => {
        resizeDir = cfg.dir;
        startX = e.clientX; startY = e.clientY;
        startW = panel.offsetWidth; startH = panel.offsetHeight;
        startL = panel.offsetLeft; startT = panel.offsetTop;
        document.body.style.userSelect = 'none';
        e.preventDefault(); e.stopPropagation();
      });
      panel.appendChild(h);
    });

    btnClose.onclick = () => panel.remove();

    btnMin.onclick = () => {
      if (!minimized) {
        body.style.display = 'none';
        panel.style.height = header.offsetHeight + 'px';
        minimized = true;
      } else {
        body.style.display = 'flex';
        panel.style.height = '400px';
        minimized = false;
      }
    };

    btnMax.onclick = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      if (!savedRect) {
        savedRect = { left: panel.offsetLeft, top: panel.offsetTop, w: panel.offsetWidth, h: panel.offsetHeight };
        const W = Math.floor(vw * 0.8), H = Math.floor(vh * 0.8);
        panel.style.left = Math.floor((vw - W) / 2) + 'px';
        panel.style.top = Math.floor((vh - H) / 2) + 'px';
        panel.style.width = W + 'px';
        panel.style.height = H + 'px';
      } else {
        panel.style.left = savedRect.left + 'px';
        panel.style.top = savedRect.top + 'px';
        panel.style.width = savedRect.w + 'px';
        panel.style.height = savedRect.h + 'px';
        savedRect = null;
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectPanel);
  } else {
    injectPanel();
  }
})();
