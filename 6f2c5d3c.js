(function () {
  'use strict';

  const norm = s => (s || '').toString().replace(/\s+/g, ' ').trim();

  function showBanner(msg, color = '#16a34a') {
    if (document.getElementById('ont-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'ont-banner';
    banner.textContent = msg;
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0;
      background: ${color}; color: white; text-align: center;
      padding: 6px 0; font: 13px Arial, sans-serif;
      z-index: 999999;
    `;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 2500);
  }

  function makeCopyButton() {
    const btn = document.createElement('button');
    btn.id = 'copy-niveles-btn';
    btn.type = 'button';
    btn.title = 'Copiar niveles';
    btn.style.cssText = `
      margin-top:10px; padding:4px; border:none; cursor:pointer;
      background:transparent; line-height:0;
      display:inline-flex; align-items:center; justify-content:center;
      color:#1f6feb;
    `;
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor"
          d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14
             c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0
             16H8V7h11v14z"/>
      </svg>
    `;
    return btn;
  }

  function setCopiedVisual(btn, ok) {
    const prev = btn.innerHTML;
    btn.style.color = ok ? '#10b981' : '#f59e0b';
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor"
          d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
      </svg>
    `;
    setTimeout(() => {
      btn.style.color = '#1f6feb';
      btn.innerHTML = prev;
    }, 1200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }

  function extractNiveles(modal) {
    const error = modal.querySelector('[role="alert"]');
    if (error) {
      return 'Error al obtener el estado (ont sin señal).';
    }

    const text = modal.textContent;
    const dnrx = text.match(/dnrx:\s*([-\d.]+dBm)/i)?.[1];
    const uprx = text.match(/uprx:\s*([-\d.]+dBm)/i)?.[1];

    if (dnrx && uprx) {
      return `uprx: ${uprx} / dnrx: ${dnrx}.`;
    }

    return null; // aún no cargó o estructura distinta
  }

  function insertCopyButton(modal) {
    if (modal.querySelector('#copy-niveles-btn')) return;

    const btn = makeCopyButton();
    btn.addEventListener('click', async () => {
      const txt = extractNiveles(modal);
      if (!txt) {
        showBanner('⚠️ Niveles no disponibles todavía', '#f59e0b');
        return;
      }
      const ok = await copyText(txt);
      setCopiedVisual(btn, ok);
      showBanner(ok ? '✅ Copiado' : '⚠️ No se pudo copiar', ok ? '#16a34a' : '#dc2626');
    });

    // insertar al final del bloque principal
    const content = modal.querySelector('.p-6.space-y-6.flex-1');
    if (content) content.appendChild(btn);
  }

  // Observa la aparición de los modales de estado
  const observer = new MutationObserver(() => {
    const modals = document.querySelectorAll('.flex.relative.max-w-4xl.w-full.max-h-full');
    modals.forEach(modal => {
      const text = modal.textContent || '';
      // solo insertar si hay datos cargados o error
      if (/dnrx:/i.test(text) || /Error al obtener el estado/i.test(text)) {
        insertCopyButton(modal);
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
