(function () {
  'use strict';

  const norm = s => (s || '').toString().replace(/\s+/g, ' ').trim();

  // ======== [ BANNER ROJO DE ALERTA ] ========
  function showBanner(msg) {
    if (document.getElementById('ont-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'ont-banner';
    banner.textContent = msg;
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0;
      background: #dc2626; color: white; text-align: center;
      padding: 6px 0; font: 13px Arial, sans-serif;
      z-index: 999999;
    `;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 7000);
  }

  // ======== [ COPIAR TEXTO AL PORTAPAPELES ] ========
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch {}
      ta.remove();
      return ok;
    }
  }

  // ======== [ EFECTO VISUAL DE “COPIADO” ] ========
  function setCopiedVisual(btn, ok) {
    const prev = btn.innerHTML;
    const prevTitle = btn.title;
    btn.title = ok ? '¡Copiado!' : 'No copiado';
    btn.style.color = ok ? '#10b981' : '#f59e0b';
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
      </svg>
    `;
    setTimeout(() => {
      btn.style.color = '#1f6feb';
      btn.innerHTML = prev;
      btn.title = prevTitle;
    }, 1200);
  }

  // ======== [ CONSTRUCCIÓN DEL RESUMEN ] ========
  function buildSummary() {
    let ontRx = norm(document.querySelector('.internet-realtime-data:nth-of-type(1) h1')?.textContent || '');
    let oltRx = norm(document.querySelector('.internet-realtime-data:nth-of-type(2) h1')?.textContent || '');
    const rf = norm(document.querySelector('.tv-info figcaption h1')?.textContent || '');
    const modelo = norm(document.querySelector('header h1 strong')?.textContent || '');
    const servicio = norm(document.querySelector('.internet-info header h1')?.textContent || '');

    // Detectar si no hay información y forzar ONT/OLT RX = 0 dBm
    const noInfo = /(no\s+hay\s+información\s+de\s+monitorización|sin\s+información)/i.test(document.body.textContent || '');
    if (noInfo) {
      if (!ontRx) ontRx = '0 dBm';
      if (!oltRx) oltRx = '0 dBm';
    }

    let resumen = `Niveles: OLT RX: ${oltRx || '—'} / ONT RX: ${ontRx || '—'}.`;
    if (rf) resumen += ` RF: ${rf}.`;
    resumen += ` Modelo: ${modelo || '—'}. Servicio: ${servicio || '—'}.`;

    // Si ONT RX es 0 (o sin info) → banner y confirmación vecinos
    if (/^0(\.0+)?\s*d?b?m?$/i.test(ontRx)) {
      showBanner('⚠️ Señal ONT en 0 dBm — revisar vecinos');
      const confirmar = confirm('La ONT marca 0 dBm o no hay monitorización. ¿Los vecinos están OK?');
      if (!confirmar) return null;
      resumen += ' Vecinos OK.';
    }

    return resumen;
  }

  // ======== [ CREACIÓN DEL BOTÓN ] ========
  function makeCopyButton() {
    const btn = document.createElement('button');
    btn.id = 'copy-fiber-summary-btn';
    btn.type = 'button';
    btn.title = 'Copiar resumen de señales';
    btn.style.cssText = `
      margin-left:6px; padding:4px; border:none; cursor:pointer;
      background:transparent; vertical-align:middle; line-height:0;
      color:#1f6feb; pointer-events:auto;
    `;
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="currentColor"
          d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
      </svg>
    `;
    return btn;
  }

  // ======== [ INSERCIÓN DEL BOTÓN AL LADO DEL SERVICIO ] ========
  async function insertButton() {
    if (document.getElementById('copy-fiber-summary-btn')) return;

    // Esperar hasta que exista el título del servicio
    let serviceTitle = document.querySelector('.internet-info header h1');
    for (let i = 0; i < 10 && !serviceTitle; i++) {
      await new Promise(r => setTimeout(r, 300));
      serviceTitle = document.querySelector('.internet-info header h1');
    }
    if (!serviceTitle) return;

    const btn = makeCopyButton();
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const summary = buildSummary();
      if (!summary) return; // cancelado o sin datos
      const ok = await copyText(summary);
      setCopiedVisual(btn, ok);
      console.log('[Resumen copiado]', summary);
    });

    serviceTitle.appendChild(btn);
  }

  // ======== [ INICIALIZACIÓN AUTOMÁTICA ] ========
  function init() {
    insertButton();
    const obs = new MutationObserver(() => insertButton());
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
