(function () {
    'use strict';

    console.log("[INCIDENCIAS] Script iniciado.");

    // ======================================================
    // 1) 🔍 Obtener el CÓDIGO DE CLIENTE desde la ficha
    // ======================================================
    function obtenerCodigoClienteDesdeFicha() {
        try {
            const celdaCliente = [...document.querySelectorAll('td')]
                .find(td => td.textContent.trim() === "Cliente");

            if (!celdaCliente) return null;

            const celdaValor = celdaCliente.nextElementSibling;
            if (!celdaValor) return null;

            const enlace = celdaValor.querySelector("a");
            if (!enlace) return null;

            const texto = enlace.textContent.trim();  // "123154 - NOMBRE"
            const codigo = texto.split(/[\s\-]+/)[0];

            console.log("[INCIDENCIAS] Código de cliente:", codigo);
            return codigo;

        } catch (e) {
            console.error("[INCIDENCIAS] Error al obtener cliente:", e);
            return null;
        }
    }

    const codCliente = obtenerCodigoClienteDesdeFicha();


    // ======================================================
    // 2) 🔍 Obtener el NÚMERO DE INCIDENCIA ACTUAL
    // ======================================================
    function obtenerIncidenciaActual() {
        try {
            const celda = [...document.querySelectorAll("td")]
                .find(td => td.textContent.trim() === "Nº Incidencia");

            if (!celda) return null;

            const celdaValor = celda.nextElementSibling;
            if (!celdaValor) return null;

            const num = celdaValor.querySelector("td")?.textContent.trim();

            console.log("[INCIDENCIAS] Incidencia actual:", num);
            return num || null;

        } catch (e) {
            console.error("[INCIDENCIAS] Error al obtener incidencia actual:", e);
            return null;
        }
    }

    const incidenciaActual = obtenerIncidenciaActual();


    // ======================================================
    // 3) 🪧 Mostrar panel flotante (siempre)
    // ======================================================
    function mostrarAviso(htmlContenido, codClienteTxt = "") {
        try {
            document.getElementById('panel-incidencias-abiertas')?.remove();

            const panel = document.createElement('div');
            panel.id = 'panel-incidencias-abiertas';
            panel.innerHTML = `
                <div style="
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 450px;
                    max-height: 400px;
                    overflow-y: auto;
                    background: #fffbea;
                    border: 2px solid #e6b800;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    z-index: 9999999;
                    font-family: sans-serif;
                    font-size: 13px;
                    padding: 10px;
                ">
                    <div style="font-weight:bold;color:#a67c00;margin-bottom:8px;">
                        ⚠️ Incidencias del cliente ${codClienteTxt}
                        <button id="cerrar-aviso" style="float:right;border:none;background:none;cursor:pointer;">❌</button>
                    </div>
                    ${htmlContenido}
                </div>
            `;

            document.body.appendChild(panel);

            document.getElementById('cerrar-aviso')
                .addEventListener('click', () => panel.remove());

        } catch (e) {
            console.error("[INCIDENCIAS] Error mostrando panel:", e);
        }
    }

    // Mostrar mensaje inicial
    mostrarAviso(`<p>⏳ Consultando incidencias...</p>`, codCliente || "?");

    if (!codCliente) {
        mostrarAviso(`<p style="color:red;">❌ No se encontró el código de cliente.</p>`);
        return;
    }


    // ======================================================
    // 4) 📡 Consultar incidencias abiertas
    // ======================================================
    const buscarUrl = `/gosbilling/user/incidencias/buscar-incidencias.xhtml?cod_cliente=${codCliente}`;
    console.log("[INCIDENCIAS] Consultando:", buscarUrl);

    fetch(buscarUrl)
        .then(resp => resp.text())
        .then(html => {
            try {
                const doc = new DOMParser().parseFromString(html, "text/html");

                // Buscar tabla de incidencias sin depender de escapes
                const tabla =
                    doc.querySelector('[id="panelResultadosClientes:listadoIncidencias_data"]') ||
                    doc.getElementById("panelResultadosClientes:listadoIncidencias_data");

                if (!tabla) {
                    mostrarAviso(
                        `<p style="color:red;">⚠️ No se encontró la tabla de incidencias (posible sesión expirada).</p>`,
                        codCliente
                    );
                    return;
                }

                const filas = [...tabla.querySelectorAll("tr")];

                // Parseo robusto
                const incidencias = filas.map(tr => {
                    const celdas = [...tr.querySelectorAll("td")]
                        .map(td => (td.textContent || "").trim());

                    return {
                        num: celdas[0] || "",
                        abonado: celdas[3] || "",
                        razon: celdas[4] || "",
                        estado: celdas[5]?.toUpperCase() || "",
                        tipoTrabajo: celdas[9] || "",
                        asignacion: celdas[9] || "",
                        usuario: celdas[10] || "",
                        enlace: tr.querySelector("td:nth-child(1) a")?.href || "#"
                    };
                });

                // Filtrar abiertas
                const abiertas = incidencias.filter(inc =>
                    inc.estado &&
                    !["FINAL", "CERRADA", "RESUELTA", "FINALIZADA"].includes(inc.estado)
                );

                // ======================================================
                // 5) ❗ EXCLUIR la incidencia actual
                // ======================================================
                const abiertasFiltradas = abiertas.filter(inc => inc.num !== incidenciaActual);

                console.log("[INCIDENCIAS] Abiertas:", abiertas);
                console.log("[INCIDENCIAS] Abiertas sin la actual:", abiertasFiltradas);

                if (abiertasFiltradas.length === 0) {
                    mostrarAviso(`<p>✅ Ninguna incidencia abierta adicional a la actual.</p>`, codCliente);
                    return;
                }

                // Construir HTML
                const lista = abiertasFiltradas.map(inc => `
                    <div style="margin-bottom:8px;border-bottom:1px solid #f0e0a0;padding-bottom:6px;">
                        <a href="${inc.enlace}" target="_blank"
                           style="color:#b36b00;font-weight:bold;text-decoration:none;">
                            #${inc.num}
                        </a>
                        <span style="color:#555;"> – ${inc.asignacion} – ${inc.abonado} – <b>${inc.estado}</b></span><br>
                        <span style="font-size:12px;color:#555;">${inc.razon} – ${inc.tipoTrabajo} – ${inc.usuario}</span>
                    </div>
                `).join("");

                mostrarAviso(lista, codCliente);

            } catch (e) {
                console.error("[INCIDENCIAS] Error procesando HTML:", e);
                mostrarAviso(`<p style="color:red;">⚠️ Error procesando incidencias.</p>`, codCliente);
            }
        })
        .catch(err => {
            console.error("[INCIDENCIAS] Error en fetch:", err);
            mostrarAviso(`<p style="color:red;">❌ Error al consultar incidencias.</p>`, codCliente);
        });

})();
