/* =========================================================
   SJTS – Página de administración (admin.html)
   - Pedidos: cada pedido web tiene un token; se marca "compró" (descuenta inventario) o "no compró".
   - Carritos: clientes que dejaron productos sin pedir, con recordatorio por WhatsApp o correo.
   - Productos: agregar, editar y eliminar (con foto).
   - Precios: editar todos los precios a la vez.
   - Sectores: agregar, editar, ordenar y eliminar.
   - Inventario: entradas, salidas, conteos e historial de movimientos.
   La seguridad real está en firestore.rules: aunque alguien
   abra esta página, solo los administradores pueden guardar.
   ========================================================= */
const CFG = window.STH_CONFIG || {};
let SECTORES = [];   // llegan desde Firebase (js/auth.js)
const ADMINS = (CFG.administradores || []).map((c) => c.toLowerCase());

// Precios de ejemplo para llenar el formulario de precios la primera vez.
// Solo se usan si ese producto aún no tiene precio guardado en Firebase.
const SUGERIDOS = {
  "vela-lavanda": 28000, "vela-vainilla": 30000, "vela-regalo": 35000,
  "cuaderno-argollado": 22000, "agenda-2027": 38000, "libreta-bolsillo": 12000,
  "stickers": 8000, "tarjetas": 15000, "kit-marcadores": 18000,
  "mug-ceramica": 25000, "vaso-vidrio": 27000, "termo": 45000,
  "camiseta-estampada": 35000, "camiseta-nino": 28000, "camiseta-grupo": 30000,
  "buzo-capota": 75000, "gorra": 32000, "tote-bag": 26000
};

const UI = window.STH_UI;
const sectorDe = (id) => SECTORES.find((s) => s.id === id);
const icon = (cat) => UI.svg(sectorDe(cat)?.icono || cat);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: CFG.moneda || "COP", maximumFractionDigits: 0 });
const AUTH = () => window.STH_AUTH;

const vistas = ["#loading", "#adminLogin", "#noAccess", "#panel"];
const mostrar = (id) => vistas.forEach((v) => ($(v).hidden = v !== id));

let toastTimer;
function toast(t) {
  const el = $("#toast");
  el.textContent = t;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
}

let estado = { productos: [], precios: {} };
const productos = () => estado.productos || [];

/* ---------- Pestañas ---------- */
let pestana = "pedidos";
function verPestana(nombre) {
  pestana = nombre;
  $$(".tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.tab === nombre));
  $$("[data-view]").forEach((v) => (v.hidden = v.dataset.view !== nombre));
}
$$(".tab").forEach((t) => t.addEventListener("click", () => {
  verPestana(t.dataset.tab);
  if (t.dataset.tab === "inventario") cargarHistorial();
  if (t.dataset.tab === "pedidos") cargarPedidos();
  if (t.dataset.tab === "carritos") cargarCarritos();
}));

/* ---------- Lista de productos ---------- */
function renderProductos() {
  const lista = productos();
  const agotados = lista.filter((p) => p.stock === 0).length;
  $("#prodCount").textContent = `${lista.length} producto${lista.length === 1 ? "" : "s"} en la tienda`
    + (agotados ? ` · ${agotados} agotado${agotados === 1 ? "" : "s"}` : "");
  const grupos = SECTORES.map((s) => {
    const items = lista.filter((p) => p.categoria === s.id);
    return `<section class="admin__group"><h2>${esc(s.nombre)} <small>${items.length}</small></h2>${
      items.length ? items.map((p) => {
        const v = Number(estado.precios[p.id]);
        const precio = v > 0 ? money.format(v) : "Sin precio";
        const extras = [p.personalizable && "Personalizable", p.destacado && "Destacado"].filter(Boolean).join(" · ");
        return `<div class="prod">
            <div class="prod__thumb" style="${UI.estilo(sectorDe(p.categoria), p.categoria)}">${p.imagen ? `<img src="${esc(p.imagen)}" alt="">` : icon(p.categoria)}</div>
            <div><p class="prod__name">${esc(p.nombre)} ${etiquetaStock(p)}</p><p class="prod__meta">${precio}${extras ? " · " + extras : ""}</p></div>
            <div class="prod__actions">
              <button type="button" class="btn btn--ghost btn--sm" data-edit="${esc(p.id)}">Editar</button>
              <button type="button" class="btn btn--ghost btn--sm btn--danger" data-del="${esc(p.id)}">Eliminar</button>
            </div>
          </div>`;
      }).join("") : '<p class="muted" style="padding:10px 0;margin:0">Sin productos.</p>'
    }</section>`;
  });
  // Productos con un sector que ya no existe.
  const huerfanos = lista.filter((p) => !SECTORES.some((s) => s.id === p.categoria));
  if (huerfanos.length) {
    grupos.push(`<section class="admin__group"><h2>Sin sector</h2>${huerfanos.map((p) =>
      `<div class="prod"><div class="prod__thumb">${icon("")}</div><div><p class="prod__name">${esc(p.nombre)}</p></div>
        <div class="prod__actions"><button type="button" class="btn btn--ghost btn--sm" data-edit="${esc(p.id)}">Editar</button>
        <button type="button" class="btn btn--ghost btn--sm btn--danger" data-del="${esc(p.id)}">Eliminar</button></div></div>`).join("")}</section>`);
  }
  $("#prodList").innerHTML = grupos.join("");
}

// Eliminar: primer clic pide confirmar, segundo clic elimina.
$("#prodList").addEventListener("click", async (e) => {
  const edit = e.target.closest("[data-edit]");
  if (edit) { abrirForm(edit.dataset.edit); return; }
  const del = e.target.closest("[data-del]");
  if (!del) return;
  if (!del.classList.contains("confirm")) {
    $$(".btn--danger.confirm").forEach((b) => { b.classList.remove("confirm"); b.textContent = "Eliminar"; });
    del.classList.add("confirm");
    del.textContent = "¿Seguro? Eliminar";
    setTimeout(() => { if (del.isConnected) { del.classList.remove("confirm"); del.textContent = "Eliminar"; } }, 4000);
    return;
  }
  const p = productos().find((x) => x.id === del.dataset.del);
  del.disabled = true;
  del.textContent = "Eliminando…";
  try {
    await AUTH().eliminarProducto(del.dataset.del);
    toast(`"${p?.nombre || "Producto"}" eliminado`);
  } catch (ex) {
    toast(AUTH().mensaje(ex));
    renderProductos();
  }
});

// Etiqueta de disponibilidad para la lista del administrador.
function etiquetaStock(p) {
  if (!Number.isInteger(p.stock)) return "";
  if (p.stock === 0) return '<span class="tag tag--out">Agotado</span>';
  if (p.stock <= 3) return `<span class="tag tag--low">Quedan ${p.stock}</span>`;
  return `<span class="tag tag--ok">${p.stock} disponibles</span>`;
}

/* ---------- Formulario de producto ---------- */
const modal = $("#prodModal");
const form = $("#prodForm");
let editando = null;   // id del producto que se edita, o null si es nuevo
const MAX_FOTOS = 5;
let fotos = [];        // fotos del producto (dataURL o ruta); la primera es la portada
let cargandoFotos = false;


function pintarFotos() {
  const celdas = fotos.map((f, i) => `<div class="ph">
      <img src="${esc(f)}" alt="Foto ${i + 1}">
      <button type="button" class="ph__x" data-quitar="${i}" aria-label="Quitar foto ${i + 1}">✕</button>
      ${i === 0 ? '<span class="ph__cover">Portada</span>' : `<button type="button" class="ph__mk" data-portada="${i}">Portada</button>`}
    </div>`);
  if (cargandoFotos) celdas.push('<div class="ph ph--empty">Cargando fotos…</div>');
  else if (fotos.length < MAX_FOTOS) celdas.push(`<div class="ph ph--empty">${fotos.length ? "Puedes agregar más" : "Sin fotos"}</div>`);
  $("#photos").innerHTML = celdas.join("");
  $("#photoAdd").hidden = cargandoFotos || fotos.length >= MAX_FOTOS;
}

$("#photos").addEventListener("click", (e) => {
  const q = e.target.closest("[data-quitar]");
  const c = e.target.closest("[data-portada]");
  if (q) fotos.splice(Number(q.dataset.quitar), 1);
  else if (c) fotos.unshift(...fotos.splice(Number(c.dataset.portada), 1));
  else return;
  pintarFotos();
});

function abrirForm(id) {
  const p = id ? productos().find((x) => x.id === id) : null;
  editando = p ? p.id : null;
  form.reset();
  $("#pfSector").innerHTML = SECTORES.map((s) => `<option value="${esc(s.id)}">${esc(s.nombre)}</option>`).join("")
    + (p && !sectorDe(p.categoria) ? '<option value="">— Elige un sector —</option>' : "");
  $("#pformError").textContent = "";
  $("#pformTitle").textContent = p ? "Editar producto" : "Agregar producto";
  form.nombre.value = p?.nombre || "";
  form.categoria.value = p?.categoria || SECTORES[0]?.id || "";
  form.descripcion.value = p?.descripcion || "";
  form.tallas.value = (p?.tallas || []).join(", ");
  form.colores.value = (p?.colores || []).join(", ");
  form.personalizable.checked = Boolean(p?.personalizable);
  form.destacado.checked = Boolean(p?.destacado);
  const v = p ? Number(estado.precios[p.id]) : 0;
  form.precio.value = v > 0 ? v : "";
  form.stock.value = Number.isInteger(p?.stock) && p.stock >= 0 ? p.stock : "";
  fotos = p?.imagen ? [p.imagen] : [];
  cargandoFotos = Boolean(p && p.fotosExtra > 0);
  pintarFotos();
  modal.showModal();
  if (cargandoFotos) {
    AUTH().obtenerFotos(p.id).then((extras) => {
      if (editando !== p.id) return;
      fotos = [...fotos, ...extras].slice(0, MAX_FOTOS);
    }).catch(() => {
      $("#pformError").textContent = "No se pudieron cargar las fotos adicionales.";
    }).finally(() => { cargandoFotos = false; pintarFotos(); });
  }
  form.nombre.focus();
}

$("#addProduct").addEventListener("click", () => abrirForm(null));
// Botones − / + de unidades disponibles.
$$("[data-stock]", form).forEach((b) => b.addEventListener("click", () => {
  const actual = parseInt(String(form.stock.value).replace(/\D/g, ""), 10);
  const base = Number.isFinite(actual) ? actual : 0;
  form.stock.value = Math.max(0, base + Number(b.dataset.stock));
}));
$("#prodClose").addEventListener("click", () => modal.close());
modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });


// Reduce la foto y la guarda como JPG liviano (máx. ~120 KB) para que la tienda cargue rápido.
// Firebase admite hasta 1 MB por documento: 4 fotos extra x 120 KB caben de sobra.
const MAX_CARACTERES = 160000;
function comprimir(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let data = "";
      for (const max of [1000, 820, 680, 560, 460]) {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        const g = c.getContext("2d");
        g.fillStyle = "#ffffff";
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        for (const q of [0.82, 0.72, 0.62]) {
          data = c.toDataURL("image/jpeg", q);
          if (data.length <= MAX_CARACTERES) return resolve(data);
        }
      }
      resolve(data);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen.")); };
    img.src = url;
  });
}

$("#photoInput").addEventListener("change", async (e) => {
  const archivos = [...(e.target.files || [])].filter((f) => f.type.startsWith("image/"));
  e.target.value = "";
  if (!archivos.length) return;
  const libres = MAX_FOTOS - fotos.length;
  $("#pformError").textContent = archivos.length > libres
    ? `Solo caben ${MAX_FOTOS} fotos. Se agregaron las primeras ${libres}.` : "";
  cargandoFotos = true;
  pintarFotos();
  for (const f of archivos.slice(0, libres)) {
    try { fotos.push(await comprimir(f)); }
    catch (ex) { $("#pformError").textContent = ex.message; }
  }
  cargandoFotos = false;
  pintarFotos();
});

const lista = (txt) => String(txt || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
const slug = (txt) => String(txt).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "producto";

function nuevoId(nombre) {
  const base = slug(nombre);
  const usados = new Set(productos().map((p) => p.id));
  let id = base, n = 2;
  while (usados.has(id)) id = `${base}-${n++}`;
  return id;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#pformError");
  err.textContent = "";
  const nombre = form.nombre.value.trim();
  if (!nombre) { err.textContent = "Escribe el nombre del producto."; form.nombre.focus(); return; }
  if (!form.categoria.value) { err.textContent = "Elige un sector."; return; }
  const precio = parseInt(String(form.precio.value).replace(/\D/g, ""), 10) || 0;
  const stockTxt = String(form.stock.value).replace(/\D/g, "");
  const stock = stockTxt === "" ? null : Math.min(99999, parseInt(stockTxt, 10));

  const anterior = editando ? productos().find((p) => p.id === editando) : null;
  const producto = {
    id: editando || nuevoId(nombre),
    nombre,
    categoria: form.categoria.value,
    descripcion: form.descripcion.value.trim(),
    imagen: fotos[0] || "",
    personalizable: form.personalizable.checked,
    destacado: form.destacado.checked,
    stock,   // null = sin límite / por encargo
    orden: anterior?.orden ?? Date.now()
  };
  const tallas = lista(form.tallas.value);
  const colores = lista(form.colores.value);
  if (tallas.length) producto.tallas = tallas;
  if (colores.length) producto.colores = colores;

  if (cargandoFotos) { err.textContent = "Espera a que terminen de cargar las fotos."; return; }
  const btn = $("#pformSave");
  btn.disabled = true;
  btn.textContent = "Guardando…";
  try {
    await AUTH().guardarProducto(producto, precio, fotos.slice(1));
    modal.close();
    toast(anterior ? "Producto actualizado" : "Producto agregado a la tienda");
  } catch (ex) {
    console.error(ex);
    err.textContent = AUTH().mensaje(ex);
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar producto";
  }
});

/* ---------- Pedidos (token) ---------- */
let pedidos = [];
let pedidosCargados = false;
let filtroPed = "pendiente";
const ESTADOS = { pendiente: "Pendiente", comprado: "Compró", "no-comprado": "No compró" };
const fechaPed = new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

async function cargarPedidos() {
  pedidosCargados = true;
  try {
    pedidos = await AUTH().cargarPedidos(200);
    renderPedidos();
  } catch (ex) {
    console.error(ex);
    $("#pedList").innerHTML = `<p class="auth__error">${esc(AUTH().mensaje(ex))}</p>`;
  }
}

function renderPedidos() {
  const pend = pedidos.filter((p) => (p.estado || "pendiente") === "pendiente").length;
  $("#pedBadge").hidden = pend === 0;
  $("#pedBadge").textContent = pend;

  const q = $("#pedBuscar").value.trim().toLowerCase();
  const lista = pedidos.filter((p) => {
    const est = p.estado || "pendiente";
    if (!q && filtroPed !== "todos" && est !== filtroPed) return false;
    if (!q) return true;
    const c = p.cliente || {};
    return [p.token, c.nombre, c.correo, c.telefono].filter(Boolean).join(" ").toLowerCase().includes(q);
  });

  if (!lista.length) {
    $("#pedList").innerHTML = `<p class="muted">${q ? "Ningún pedido coincide con la búsqueda." : filtroPed === "pendiente" ? "No hay pedidos pendientes." : "No hay pedidos en este filtro."}</p>`;
    return;
  }

  $("#pedList").innerHTML = lista.map((p) => {
    const est = p.estado || "pendiente";
    const c = p.cliente || {};
    const items = (p.items || []).map((it) => {
      const extra = [it.talla && `Talla ${it.talla}`, it.color, it.personalizacion && `“${it.personalizacion}”`].filter(Boolean).map(esc).join(" · ");
      const prod = productos().find((x) => x.id === it.id);
      const stock = Number.isInteger(prod?.stock) ? ` · hay ${prod.stock}` : "";
      return `<li><span>${esc(it.nombre)} <strong>x${it.qty | 0}</strong><small>${extra}${est === "pendiente" ? esc(stock) : ""}</small></span>
        <span>${it.precio ? money.format(it.precio * it.qty) : "Consultar"}</span></li>`;
    }).join("");
    const acciones = est === "pendiente"
      ? `<button type="button" class="btn btn--ok btn--sm" data-ped="${esc(p.token)}" data-a="comprado">✓ Compró · descontar</button>
         <button type="button" class="btn btn--ghost btn--sm btn--danger" data-ped="${esc(p.token)}" data-a="no-comprado">✗ No compró</button>`
      : est === "comprado"
        ? `<button type="button" class="btn btn--ghost btn--sm btn--danger" data-ped="${esc(p.token)}" data-a="no-comprado">Anular compra · devolver unidades</button>`
        : `<button type="button" class="btn btn--ghost btn--sm" data-ped="${esc(p.token)}" data-a="pendiente">Volver a pendiente</button>`;
    const cierre = p.cerrado ? ` · ${est === "pendiente" ? "reabierto" : "cerrado"} ${fechaPed.format(p.cerrado)}${p.cerradoPor ? " por " + esc(p.cerradoPor) : ""}` : "";
    return `<article class="ped ped--${est}">
        <div class="ped__head">
          <span class="ped__token">${esc(p.token)}</span>
          <span class="ped__estado ped__estado--${est}">${ESTADOS[est] || est}</span>
        </div>
        <p class="ped__meta">${p.fecha ? fechaPed.format(p.fecha) : ""}${cierre}<br>
          <strong style="color:var(--ink)">${esc(c.nombre || "Cliente")}</strong>
          ${[c.telefono, c.correo, c.ciudad].filter(Boolean).map(esc).join(" · ")}
          ${p.notas ? `<br>Notas: ${esc(p.notas)}` : ""}</p>
        <ul class="ped__items">${items}</ul>
        <div class="ped__total"><span>Total</span><span>${p.total ? money.format(p.total) : "—"}</span></div>
        <div class="ped__acc">${acciones}</div>
      </article>`;
  }).join("");
}

$("#pedFiltro").addEventListener("click", (e) => {
  const b = e.target.closest("[data-f]");
  if (!b) return;
  filtroPed = b.dataset.f;
  $$("#pedFiltro .chip").forEach((c) => c.setAttribute("aria-selected", c === b));
  renderPedidos();
});
$("#pedBuscar").addEventListener("input", renderPedidos);
$("#pedReload").addEventListener("click", cargarPedidos);

// Botones de cada pedido: primer clic pide confirmar, segundo clic aplica.
const TEXTO_CONFIRMAR = { comprado: "¿Confirmar compra?", "no-comprado": "¿Confirmar?", pendiente: "¿Reabrir?" };
$("#pedList").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-ped]");
  if (!b) return;
  if (!b.classList.contains("confirm")) {
    $$("#pedList .confirm").forEach((x) => { x.classList.remove("confirm"); x.textContent = x.dataset.txt; });
    b.dataset.txt = b.textContent;
    b.classList.add("confirm");
    b.textContent = TEXTO_CONFIRMAR[b.dataset.a] || "¿Seguro?";
    setTimeout(() => { if (b.isConnected && b.classList.contains("confirm")) { b.classList.remove("confirm"); b.textContent = b.dataset.txt; } }, 4000);
    return;
  }
  b.disabled = true;
  b.textContent = "Guardando…";
  const token = b.dataset.ped, nuevo = b.dataset.a;
  try {
    const cambios = await AUTH().cambiarEstadoPedido(token, nuevo);
    const n = Object.keys(cambios || {}).length;
    toast(nuevo === "comprado"
      ? `Pedido ${token} comprado${n ? ` · inventario descontado en ${n} producto${n === 1 ? "" : "s"}` : ""}`
      : nuevo === "no-comprado"
        ? `Pedido ${token} marcado como no comprado${n ? " · unidades devueltas" : ""}`
        : `Pedido ${token} pendiente de nuevo`);
    await cargarPedidos();
    if (historialCargado) cargarHistorial();
  } catch (ex) {
    console.error(ex);
    toast(ex?.message && !ex.code ? ex.message : AUTH().mensaje(ex));
    renderPedidos();
  }
});

/* ---------- Carritos abandonados ---------- */
let carritos = [];
let carritosCargados = false;
let filtroCar = "abandonados";
const HORA = 60 * 60 * 1000;

function haceCuanto(fecha) {
  if (!fecha) return "";
  const min = Math.round((Date.now() - fecha.getTime()) / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} día${d === 1 ? "" : "s"}`;
}

// Celular colombiano de 10 dígitos (3xx...) -> 573xx...; si ya trae indicativo se deja.
function numeroWhatsApp(tel) {
  const d = String(tel || "").replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("3")) return "57" + d;
  return d.length >= 10 ? d : "";
}

function mensajeRecordatorio(c) {
  const nombre = (c.cliente?.nombre || "").split(" ")[0];
  const tienda = new URL("./", location.href).href;
  const lineas = (c.items || []).map((it) => `• ${it.nombre} x${it.qty}`);
  return [
    `Hola${nombre ? " " + nombre : ""} 👋, te escribimos de ${CFG.nombre || "SJTS"}.`,
    "Vimos que dejaste estos productos en tu carrito:",
    ...lineas,
    "",
    "¿Te ayudamos a terminar tu pedido? Aquí lo tienes guardado:",
    tienda
  ].join("\n");
}

async function cargarCarritos() {
  carritosCargados = true;
  try {
    carritos = await AUTH().cargarCarritos();
    renderCarritos();
  } catch (ex) {
    console.error(ex);
    $("#carList").innerHTML = `<p class="auth__error">${esc(AUTH().mensaje(ex))}</p>`;
  }
}

function renderCarritos() {
  const abandonados = carritos.filter((c) => c.actualizado && Date.now() - c.actualizado.getTime() > HORA);
  const sinRecordar = abandonados.filter((c) => !c.recordado).length;
  $("#carBadge").hidden = sinRecordar === 0;
  $("#carBadge").textContent = sinRecordar;

  const lista = filtroCar === "abandonados" ? abandonados : carritos;
  if (!lista.length) {
    $("#carList").innerHTML = `<p class="muted">${filtroCar === "abandonados"
      ? "No hay carritos abandonados (más de 1 hora sin enviar el pedido)."
      : "Ningún cliente tiene productos en el carrito."}</p>`;
    return;
  }

  $("#carList").innerHTML = lista.map((c) => {
    const cl = c.cliente || {};
    const wa = numeroWhatsApp(cl.telefono);
    const items = (c.items || []).map((it) => {
      const extra = [it.talla && `Talla ${it.talla}`, it.color, it.personalizacion && `“${it.personalizacion}”`].filter(Boolean).map(esc).join(" · ");
      return `<li><span>${esc(it.nombre)} <strong>x${it.qty | 0}</strong>${extra ? `<small>${extra}</small>` : ""}</span></li>`;
    }).join("");
    const enlaceWa = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(mensajeRecordatorio(c))}` : "";
    const enlaceMail = cl.correo
      ? `mailto:${encodeURIComponent(cl.correo)}?subject=${encodeURIComponent("Tienes productos en tu carrito de " + (CFG.nombre || "SJTS"))}&body=${encodeURIComponent(mensajeRecordatorio(c))}`
      : "";
    return `<article class="ped ${c.recordado ? "ped--comprado" : "ped--pendiente"}">
        <div class="ped__head">
          <strong>${esc(cl.nombre || "Cliente")}</strong>
          <span class="ped__estado ${c.recordado ? "ped__estado--comprado" : "ped__estado--pendiente"}">${c.recordado ? "Recordado " + haceCuanto(c.recordado) : "Sin recordar"}</span>
        </div>
        <p class="ped__meta">Último cambio ${haceCuanto(c.actualizado)} · ${[cl.telefono, cl.correo].filter(Boolean).map(esc).join(" · ")}</p>
        <ul class="ped__items">${items}</ul>
        <div class="ped__total"><span>Total</span><span>${c.total ? money.format(c.total) : "—"}</span></div>
        <div class="ped__acc">
          ${enlaceWa ? `<a class="btn btn--ok btn--sm" href="${enlaceWa}" target="_blank" rel="noopener" data-recordar="${esc(c.uid)}">Recordar por WhatsApp</a>` : ""}
          ${enlaceMail ? `<a class="btn btn--ghost btn--sm" href="${enlaceMail}" data-recordar="${esc(c.uid)}">Recordar por correo</a>` : ""}
          <button type="button" class="btn btn--ghost btn--sm btn--danger" data-quitar-car="${esc(c.uid)}">Quitar de la lista</button>
        </div>
      </article>`;
  }).join("");
}

$("#carFiltro").addEventListener("click", (e) => {
  const b = e.target.closest("[data-f]");
  if (!b) return;
  filtroCar = b.dataset.f;
  $$("#carFiltro .chip").forEach((c) => c.setAttribute("aria-selected", c === b));
  renderCarritos();
});
$("#carReload").addEventListener("click", cargarCarritos);

$("#carList").addEventListener("click", async (e) => {
  const r = e.target.closest("[data-recordar]");
  if (r) {
    // El enlace abre WhatsApp o el correo; aquí solo dejamos constancia de que se recordó.
    try {
      await AUTH().marcarRecordado(r.dataset.recordar);
      const c = carritos.find((x) => x.uid === r.dataset.recordar);
      if (c) c.recordado = new Date();
      renderCarritos();
    } catch (ex) { console.warn(ex); }
    return;
  }
  const q = e.target.closest("[data-quitar-car]");
  if (!q) return;
  if (!q.classList.contains("confirm")) {
    q.classList.add("confirm");
    q.textContent = "¿Seguro? Quitar";
    setTimeout(() => { if (q.isConnected) { q.classList.remove("confirm"); q.textContent = "Quitar de la lista"; } }, 4000);
    return;
  }
  try {
    await AUTH().borrarCarritoDe(q.dataset.quitarCar);
    carritos = carritos.filter((x) => x.uid !== q.dataset.quitarCar);
    renderCarritos();
    toast("Carrito quitado de la lista");
  } catch (ex) { toast(AUTH().mensaje(ex)); }
});

/* ---------- Inventario ---------- */
let filtroInv = "todos";
let historialCargado = false;

const stockDe = (p) => (Number.isInteger(p?.stock) && p.stock >= 0 ? p.stock : null);

function renderInventario() {
  const lista = productos();
  const controlados = lista.filter((p) => stockDe(p) !== null);
  const unidades = controlados.reduce((n, p) => n + p.stock, 0);
  const agotados = controlados.filter((p) => p.stock === 0).length;
  const bajos = controlados.filter((p) => p.stock > 0 && p.stock <= 3).length;
  $("#invSum").innerHTML = `
    <div><strong>${unidades}</strong><span>unidades en inventario</span></div>
    <div><strong>${controlados.length}</strong><span>productos con control</span></div>
    <div><strong style="color:#a15c00">${bajos}</strong><span>por agotarse (≤ 3)</span></div>
    <div><strong style="color:#b42318">${agotados}</strong><span>agotados</span></div>`;

  const visibles = lista.filter((p) => {
    const s = stockDe(p);
    if (filtroInv === "bajo") return s !== null && s > 0 && s <= 3;
    if (filtroInv === "agotado") return s === 0;
    if (filtroInv === "libre") return s === null;
    return true;
  });

  $("#invList").innerHTML = visibles.length ? visibles.map((p) => {
    const s = stockDe(p);
    const cls = s === null ? "free" : s === 0 ? "out" : s <= 3 ? "low" : "";
    const sector = sectorDe(p.categoria);
    return `<div class="inv">
        <div class="prod__thumb" style="${UI.estilo(sector, p.categoria)}">${p.imagen ? `<img src="${esc(p.imagen)}" alt="">` : icon(p.categoria)}</div>
        <div><p class="prod__name">${esc(p.nombre)}</p><p class="prod__meta">${esc(sector?.nombre || "Sin sector")}</p></div>
        <div class="inv__qty">
          ${s === null
            ? `<span class="inv__num free">Sin control</span>`
            : `<button type="button" data-rapido="-1" data-id="${esc(p.id)}" aria-label="Restar una unidad" ${s === 0 ? "disabled" : ""}>−</button>
               <span class="inv__num ${cls}">${s}</span>
               <button type="button" data-rapido="1" data-id="${esc(p.id)}" aria-label="Sumar una unidad">+</button>`}
        </div>
        <div class="inv__mov"><button type="button" class="btn btn--ghost btn--sm" data-mov="${esc(p.id)}">${s === null ? "Controlar" : "Movimiento"}</button></div>
      </div>`;
  }).join("") : '<p class="muted" style="margin:0">No hay productos en este filtro.</p>';
}

$("#invFiltro").addEventListener("click", (e) => {
  const b = e.target.closest("[data-f]");
  if (!b) return;
  filtroInv = b.dataset.f;
  $$("#invFiltro .chip").forEach((c) => c.setAttribute("aria-selected", c === b));
  renderInventario();
});

// − / + rápidos: registran una salida o entrada de 1 unidad.
$("#invList").addEventListener("click", async (e) => {
  const r = e.target.closest("[data-rapido]");
  if (r) {
    const delta = Number(r.dataset.rapido);
    $$("[data-rapido]", r.parentElement).forEach((b) => (b.disabled = true));
    try {
      await AUTH().moverInventario(r.dataset.id, delta > 0 ? "entrada" : "salida", 1, "Ajuste rápido");
      cargarHistorial();
    } catch (ex) {
      toast(AUTH().mensaje(ex));
      renderInventario();
    }
    return;
  }
  const m = e.target.closest("[data-mov]");
  if (m) abrirMovimiento(m.dataset.mov);
});

const movModal = $("#movModal");
const movForm = $("#movForm");
let movProducto = null;

function previewMovimiento() {
  const p = productos().find((x) => x.id === movProducto);
  if (!p) return;
  const tipo = movForm.tipo.value;
  const actual = stockDe(p);
  const n = parseInt(String(movForm.cantidad.value).replace(/\D/g, ""), 10);
  const etiquetas = { entrada: "Unidades que entran", salida: "Unidades que salen", ajuste: "Unidades contadas (el inventario queda en este número)" };
  $("#movCantWrap").hidden = tipo === "sin-limite";
  $("#movCantLabel").textContent = etiquetas[tipo] || "";
  let resultado = "";
  if (tipo === "sin-limite") resultado = "El producto queda sin control de inventario (por encargo).";
  else if (Number.isFinite(n)) {
    const base = actual ?? 0;
    const final = tipo === "entrada" ? base + n : tipo === "salida" ? Math.max(0, base - n) : n;
    resultado = `Quedarán ${final} unidad${final === 1 ? "" : "es"}.`;
  }
  $("#movResultado").textContent = resultado;
}

function abrirMovimiento(id) {
  const p = productos().find((x) => x.id === id);
  if (!p) return;
  movProducto = id;
  movForm.reset();
  const s = stockDe(p);
  $("#movTitle").textContent = p.nombre;
  $("#movActual").textContent = s === null ? "Hoy: sin control de inventario." : `Hoy hay ${s} unidad${s === 1 ? "" : "es"}.`;
  movForm.tipo.value = s === null ? "ajuste" : "entrada";
  $("#movError").textContent = "";
  previewMovimiento();
  movModal.showModal();
  movForm.cantidad.focus();
}

["input", "change"].forEach((ev) => movForm.addEventListener(ev, previewMovimiento));
$("#movClose").addEventListener("click", () => movModal.close());
movModal.addEventListener("click", (e) => { if (e.target === movModal) movModal.close(); });

movForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const tipo = movForm.tipo.value;
  const txt = String(movForm.cantidad.value).replace(/\D/g, "");
  const err = $("#movError");
  err.textContent = "";
  if (tipo !== "sin-limite" && txt === "") { err.textContent = "Escribe la cantidad."; movForm.cantidad.focus(); return; }
  const n = parseInt(txt || "0", 10);
  if ((tipo === "entrada" || tipo === "salida") && n <= 0) { err.textContent = "La cantidad debe ser mayor que 0."; return; }
  const btn = $("#movSave");
  btn.disabled = true;
  btn.textContent = "Guardando…";
  try {
    await AUTH().moverInventario(movProducto, tipo, n, movForm.nota.value.trim());
    movModal.close();
    toast("Movimiento registrado");
    cargarHistorial();
  } catch (ex) {
    err.textContent = ex?.message && !ex.code ? ex.message : AUTH().mensaje(ex);
  } finally {
    btn.disabled = false;
    btn.textContent = "Registrar movimiento";
  }
});

const TIPOS = { pedido: "Pedido comprado", devolucion: "Compra anulada",entrada: "Entrada", salida: "Salida", ajuste: "Conteo / ajuste", "sin-limite": "Sin control" };
const fechaCorta = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

async function cargarHistorial() {
  historialCargado = true;
  try {
    const movs = await AUTH().cargarMovimientos(100);
    $("#invHist").innerHTML = movs.length ? movs.map((m) => {
      const q = Number(m.cantidad) || 0;
      const qTxt = m.tipo === "sin-limite" ? "—" : `${q > 0 ? "+" : ""}${q}`;
      const final = Number.isInteger(m.stockDespues) ? `queda ${m.stockDespues}` : "sin control";
      const detalle = [m.cliente, m.nota, m.tipo !== "pedido" && m.por].filter(Boolean).map(esc).join(" · ");
      return `<div class="hist">
          <time>${m.fecha ? fechaCorta.format(m.fecha) : "ahora"}</time>
          <div><strong>${esc(m.producto)}</strong> · ${esc(TIPOS[m.tipo] || m.tipo)}<small>${detalle}</small></div>
          <div class="hist__q ${q > 0 ? "mas" : q < 0 ? "menos" : ""}">${qTxt}<small>${final}</small></div>
        </div>`;
    }).join("") : '<p class="muted" style="margin:0">Aún no hay movimientos. Aparecerán aquí las entradas, salidas y los pedidos web.</p>';
  } catch (ex) {
    console.error(ex);
    $("#invHist").innerHTML = `<p class="auth__error" style="margin:0">${esc(AUTH().mensaje(ex))}</p>`;
  }
}
$("#invReload").addEventListener("click", cargarHistorial);

/* ---------- Sectores ---------- */
function renderSectores() {
  const lista = productos();
  $("#secList").innerHTML = SECTORES.length ? SECTORES.map((s, i) => {
    const n = lista.filter((p) => p.categoria === s.id).length;
    return `<div class="sec">
        <div class="sec__sw" style="${UI.estilo(s, s.id)}">${UI.svg(s.icono || s.id)}</div>
        <div><p class="prod__name">${esc(s.nombre)}</p><p class="prod__meta">${n} producto${n === 1 ? "" : "s"}${s.descripcion ? " · " + esc(s.descripcion) : ""}</p></div>
        <div class="prod__actions">
          <div class="sec__move">
            <button type="button" data-up="${i}" aria-label="Subir" ${i === 0 ? "disabled" : ""}>↑</button>
            <button type="button" data-down="${i}" aria-label="Bajar" ${i === SECTORES.length - 1 ? "disabled" : ""}>↓</button>
          </div>
          <button type="button" class="btn btn--ghost btn--sm" data-sedit="${esc(s.id)}">Editar</button>
          <button type="button" class="btn btn--ghost btn--sm btn--danger" data-sdel="${esc(s.id)}">Eliminar</button>
        </div>
      </div>`;
  }).join("") : '<p class="muted" style="margin:0">No hay sectores. Agrega el primero.</p>';
}

async function guardarSectores(lista, mensajeOk) {
  try {
    await AUTH().guardarSectores(lista);
    if (mensajeOk) toast(mensajeOk);
    return true;
  } catch (ex) {
    toast(AUTH().mensaje(ex));
    renderSectores();
    return false;
  }
}

$("#secList").addEventListener("click", async (e) => {
  const up = e.target.closest("[data-up]");
  const down = e.target.closest("[data-down]");
  if (up || down) {
    const i = Number(up ? up.dataset.up : down.dataset.down);
    const j = up ? i - 1 : i + 1;
    const lista = SECTORES.slice();
    [lista[i], lista[j]] = [lista[j], lista[i]];
    await guardarSectores(lista);
    return;
  }
  const ed = e.target.closest("[data-sedit]");
  if (ed) { abrirSector(ed.dataset.sedit); return; }
  const del = e.target.closest("[data-sdel]");
  if (!del) return;
  const s = sectorDe(del.dataset.sdel);
  const n = productos().filter((p) => p.categoria === s.id).length;
  if (n > 0) {
    toast(`"${s.nombre}" tiene ${n} producto${n === 1 ? "" : "s"}. Muévelos a otro sector o elimínalos primero.`);
    return;
  }
  // Primer clic pide confirmar, segundo clic elimina.
  if (!del.classList.contains("confirm")) {
    $$(".btn--danger.confirm").forEach((b) => { b.classList.remove("confirm"); b.textContent = "Eliminar"; });
    del.classList.add("confirm");
    del.textContent = "¿Seguro? Eliminar";
    setTimeout(() => { if (del.isConnected) { del.classList.remove("confirm"); del.textContent = "Eliminar"; } }, 4000);
    return;
  }
  del.disabled = true;
  await guardarSectores(SECTORES.filter((x) => x.id !== s.id), `Sector "${s.nombre}" eliminado`);
});

const secModal = $("#secModal");
const secForm = $("#secForm");
let sectorEditando = null;
let iconoElegido = "estrella";

function pintarSectorPreview() {
  const s = { nombre: secForm.nombre.value || "Nombre del sector", descripcion: secForm.descripcion.value, color: secForm.color.value, icono: iconoElegido };
  $("#secPreview").setAttribute("style", UI.estilo(s, ""));
  $("#secPreview").innerHTML = `<strong>${esc(s.nombre)}</strong><span>${esc(s.descripcion)}</span>${UI.svg(s.icono)}`;
  $$("#iconPick button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.icono === iconoElegido));
}

$("#iconPick").innerHTML = Object.entries(UI.ICONOS).map(([k, v]) =>
  `<button type="button" data-icono="${k}" title="${esc(v.nombre)}" aria-label="${esc(v.nombre)}">${UI.svg(k)}</button>`).join("");
$("#iconPick").addEventListener("click", (e) => {
  const b = e.target.closest("[data-icono]");
  if (!b) return;
  iconoElegido = b.dataset.icono;
  pintarSectorPreview();
});
["input", "change"].forEach((ev) => secForm.addEventListener(ev, pintarSectorPreview));

function abrirSector(id) {
  const s = id ? sectorDe(id) : null;
  sectorEditando = s ? s.id : null;
  secForm.reset();
  $("#sformError").textContent = "";
  $("#sformTitle").textContent = s ? "Editar sector" : "Agregar sector";
  secForm.nombre.value = s?.nombre || "";
  secForm.descripcion.value = s?.descripcion || "";
  secForm.color.value = /^#[0-9a-f]{6}$/i.test(s?.color || "") ? s.color : "#f4ebe0";
  iconoElegido = s?.icono || (s && UI.ICONOS[s.id] ? s.id : "estrella");
  pintarSectorPreview();
  secModal.showModal();
  secForm.nombre.focus();
}

$("#addSector").addEventListener("click", () => abrirSector(null));
$("#secClose").addEventListener("click", () => secModal.close());
secModal.addEventListener("click", (e) => { if (e.target === secModal) secModal.close(); });

secForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#sformError");
  err.textContent = "";
  const nombre = secForm.nombre.value.trim();
  if (!nombre) { err.textContent = "Escribe el nombre del sector."; secForm.nombre.focus(); return; }
  if (SECTORES.some((s) => s.id !== sectorEditando && s.nombre.toLowerCase() === nombre.toLowerCase())) {
    err.textContent = "Ya existe un sector con ese nombre.";
    return;
  }
  const datos = { nombre, descripcion: secForm.descripcion.value.trim(), color: secForm.color.value, icono: iconoElegido };
  let lista;
  if (sectorEditando) {
    lista = SECTORES.map((s) => (s.id === sectorEditando ? { ...s, ...datos } : s));
  } else {
    const base = slug(nombre);
    let id = base, n = 2;
    while (SECTORES.some((s) => s.id === id)) id = `${base}-${n++}`;
    lista = [...SECTORES, { id, ...datos }];
  }
  const btn = $("#sformSave");
  btn.disabled = true;
  btn.textContent = "Guardando…";
  const ok = await guardarSectores(lista, sectorEditando ? "Sector actualizado" : "Sector agregado");
  btn.disabled = false;
  btn.textContent = "Guardar sector";
  if (ok) secModal.close();
});

/* ---------- Precios ---------- */
function renderPrecios() {
  const precios = estado.precios || {};
  const lista = productos();
  const pendientes = lista.filter((p) => !(p.id in precios) && SUGERIDOS[p.id]).length;
  $("#pendingNote").hidden = pendientes === 0;
  $("#pendingCount").textContent = pendientes;

  $("#groups").innerHTML = SECTORES.map((s) => {
    const items = lista.filter((p) => p.categoria === s.id);
    if (!items.length) return "";
    return `<section class="admin__group"><h2>${esc(s.nombre)}</h2>${items.map((p) => {
      const guardado = p.id in precios;
      const base = guardado ? Number(precios[p.id]) : Number(SUGERIDOS[p.id]);
      const v = base > 0 ? base : "";
      const nota = guardado ? "" : (v ? " · sugerido, sin guardar" : " · sin precio");
      return `<div class="admin__row">
          <label for="p-${esc(p.id)}">${esc(p.nombre)}<small>${esc(p.id)}${nota}</small></label>
          <span class="admin__price">$<input id="p-${esc(p.id)}" name="${esc(p.id)}" inputmode="numeric" value="${v}" placeholder="Consultar"></span>
        </div>`;
    }).join("")}</section>`;
  }).join("");
}

$("#priceEditor").addEventListener("submit", async (e) => {
  e.preventDefault();
  const mapa = {};
  for (const [id, valor] of new FormData(e.target)) {
    const n = parseInt(String(valor).replace(/\D/g, ""), 10);
    mapa[id] = Number.isFinite(n) && n > 0 ? n : 0;
  }
  const btn = $("#saveBtn");
  btn.disabled = true;
  $("#saveStatus").textContent = "Guardando…";
  try {
    await AUTH().guardarPrecios(mapa);
    $("#saveStatus").textContent = "Guardado " + new Date().toLocaleTimeString("es-CO");
    toast("Precios guardados");
  } catch (ex) {
    $("#saveStatus").textContent = AUTH().mensaje(ex);
  } finally {
    btn.disabled = false;
  }
});

/* ---------- Sesión ---------- */
function render(nuevo) {
  estado = nuevo;
  SECTORES = Array.isArray(nuevo.sectores) ? nuevo.sectores : (window.STH_SECTORES || []);
  if (!nuevo.listo || !Array.isArray(nuevo.productos)) return mostrar("#loading");
  if (!nuevo.configurado) {
    $("#loading").textContent = "Firebase no está configurado todavía. Revisa js/config.js (ver README).";
    return mostrar("#loading");
  }
  if (!nuevo.usuario) return mostrar("#adminLogin");
  const correo = (nuevo.usuario.correo || "").toLowerCase();
  if (!ADMINS.includes(correo)) {
    $("#noAccessEmail").textContent = nuevo.usuario.correo;
    $("#noAccessHint").textContent = "Agrega este correo en js/config.js (administradores) y en firestore.rules.";
    return mostrar("#noAccess");
  }
  renderProductos();
  renderSectores();
  renderInventario();
  if (pestana === "inventario" && !historialCargado) cargarHistorial();
  if (!pedidosCargados) cargarPedidos(); else renderPedidos();
  if (!carritosCargados) cargarCarritos(); else renderCarritos();
  // No redibujamos los precios mientras se están escribiendo.
  if (!$("#priceEditor").contains(document.activeElement)) renderPrecios();
  mostrar("#panel");
  verPestana(pestana);
}

window.addEventListener("sth:auth", (e) => render(e.detail));
if (window.STH_AUTH?.estado) render(window.STH_AUTH.estado);

$("#adminLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { correo, clave } = Object.fromEntries(new FormData(e.target));
  $("#loginError").textContent = "";
  try {
    await AUTH().ingresar(correo, clave);
  } catch (ex) {
    $("#loginError").textContent = AUTH().mensaje(ex);
  }
});

const salir = () => AUTH().salir();
$("#adminLogout").addEventListener("click", salir);
$("#noAccessLogout").addEventListener("click", salir);
