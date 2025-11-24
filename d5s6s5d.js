(function () {
    'use strict';

    console.log("[INCIDENCIAS] Script iniciado.");

    // ======================================================
    // 1) 🔍 Obtener el código de cliente desde la ficha (robusto)
    // ======================================================
    function obtenerCodigoClienteDesdeFicha() {
        try {
            // Buscar cualquier <td> cuyo contenido sea exactamente "Cliente"
            const celdaCliente = [...document.querySelectorAll('td')]
                .find(td => td.textContent.trim() === "Cliente");

            if (!celdaCliente) {
                console.warn("[INCIDENCIAS] No se encontró la celda 'Cliente'.");
                return null;
            }

            // Su TD hermano tiene el enlace con el código
            const celdaValor = celdaCliente.nextElementSibling;
            if (!celdaValor) return null;

            const enlace = celdaValor.querySelector('a');
            if (!enlace) {
                console.warn("[INCIDENCIAS] No se encontró el enlace dentro del área de cliente.");
                return null;
            }

            const texto = enlace.textContent.trim();  // Ej: "123154 - MARIA SANCHEZ"
            const codigo = texto.split(/[\s\-]+/)[0]; // Extrae "123154"

            console.log("[INCIDENCIAS] Código de cliente detectado:", codigo);
            return codigo;

        } catch (e) {
            console.error("[INCIDENCIAS] Error extrayendo código de cliente:", e);
            return null;
        }
    }

    const codCliente = obtenerCodigoClienteDesdeFicha();

    // ======================================================
    // 2) 🪧 Mostrar panel flotante SIEMPRE
    // ======================================================
    function mostrarAviso(htmlContenido, codClienteTxt = "") {
        try {
            // Eliminar uno previo
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

    // Mostrar panel inicial siempre
    mostrarAviso(`<p>⏳ Consultando incidencias...</p>`, codCliente || "?");

    if (!codCliente) {
        mostrarAviso(`<p style="color:red;">❌ No se pudo detectar el código del cliente.</p>`);
        return;
    }

    // ======================================================
    // 3) 📡 Consultar incidencias
    // ======================================================
    const buscarUrl = `/gosbilling/user/incidencias/buscar-incidencias.xhtml?cod_cliente=${codCliente}`;
    console.log("[INCIDENCIAS] Consultando:", buscarUrl);

    fetch(buscarUrl)
        .then(resp => resp.text())
        .then(html => {
            try {
                const doc = new DOMParser().parseFromString(html, "text/html");

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

                // Filtrado robusto
                const abiertas = filas
                    .map(tr => {
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
                    })
                    .filter(inc => inc.estado &&
                        !["FINAL", "CERRADA", "RESUELTA", "FINALIZADA"].includes(inc.estado)
                    )
                    .slice(0, 2);

                if (abiertas.length === 0) {
                    mostrarAviso(`<p>✅ No hay incidencias abiertas.</p>`, codCliente);
                    return;
                }

                const lista = abiertas.map(inc => `
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
                mostrarAviso(`<p style="color:red;">⚠️ Error procesando las incidencias.</p>`, codCliente);
            }
        })
        .catch(err => {
            console.error("[INCIDENCIAS] Error fetch:", err);
            mostrarAviso(`<p style="color:red;">❌ Error al consultar incidencias.</p>`, codCliente);
        });

})();
