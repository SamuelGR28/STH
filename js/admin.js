/* =========================================================
   SJTS – Página de administración (admin.html)
   - Productos: agregar, editar y eliminar (con foto).
   - Precios: editar todos los precios a la vez.
   La seguridad real está en firestore.rules: aunque alguien
   abra esta página, solo los administradores pueden guardar.
   ========================================================= */
const CFG = window.STH_CONFIG || {};
const SECTORES = window.STH_SECTORES || [];
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

const ICONS = {
  velas: '<path d="M24 30h16v26H24z"/><path d="M32 30v-6"/><path d="M32 10c4 5 5 8 0 12-5-4-4-7 0-12z"/><path d="M20 56h24"/>',
  cuadernos: '<rect x="16" y="8" width="34" height="48" rx="3"/><path d="M16 16h-4M16 26h-4M16 36h-4M16 46h-4"/><path d="M26 20h16M26 28h16M26 36h10"/>',
  papeleria: '<path d="M14 50 44 20l6 6-30 30h-6z"/><path d="m40 24 6 6"/><path d="M14 50l-2 8 8-2"/><circle cx="48" cy="48" r="6"/>',
  vasos: '<path d="M14 18h30l-4 38H18z"/><path d="M44 26h4a6 6 0 0 1 0 12h-6"/><path d="M24 6c-2 3 2 5 0 8M32 6c-2 3 2 5 0 8"/>',
  camisas: '<path d="M22 8 8 16l6 12 6-3v31h24V25l6 3 6-12-14-8c-2 5-6 7-10 7s-8-2-10-7z"/>',
  ropa: '<path d="M32 14a5 5 0 1 1 5 5c-3 0-5 2-5 4v2"/><path d="M32 25 6 46h52z"/><path d="M6 46v4h52v-4"/>'
};
const icon = (cat) =>
  `<svg viewBox="0 0 64 64" fill="none" stroke="#2b2220" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[cat] || ICONS.papeleria}</svg>`;

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
let pestana = "productos";
function verPestana(nombre) {
  pestana = nombre;
  $$(".tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.tab === nombre));
  $$("[data-view]").forEach((v) => (v.hidden = v.dataset.view !== nombre));
}
$$(".tab").forEach((t) => t.addEventListener("click", () => verPestana(t.dataset.tab)));

/* ---------- Lista de productos ---------- */
function renderProductos() {
  const lista = productos();
  $("#prodCount").textContent = `${lista.length} producto${lista.length === 1 ? "" : "s"} en la tienda`;
  const grupos = SECTORES.map((s) => {
    const items = lista.filter((p) => p.categoria === s.id);
    return `<section class="admin__group"><h2>${esc(s.nombre)} <small>${items.length}</small></h2>${
      items.length ? items.map((p) => {
        const v = Number(estado.precios[p.id]);
        const precio = v > 0 ? money.format(v) : "Sin precio";
        const extras = [p.personalizable && "Personalizable", p.destacado && "Destacado"].filter(Boolean).join(" · ");
        return `<div class="prod">
            <div class="prod__thumb" style="--sc: var(--c-${esc(p.categoria)}, var(--tint))">${p.imagen ? `<img src="${esc(p.imagen)}" alt="">` : icon(p.categoria)}</div>
            <div><p class="prod__name">${esc(p.nombre)}</p><p class="prod__meta">${precio}${extras ? " · " + extras : ""}</p></div>
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

/* ---------- Formulario de producto ---------- */
const modal = $("#prodModal");
const form = $("#prodForm");
let editando = null;   // id del producto que se edita, o null si es nuevo
const MAX_FOTOS = 5;
let fotos = [];        // fotos del producto (dataURL o ruta); la primera es la portada
let cargandoFotos = false;

$("#pfSector").innerHTML = SECTORES.map((s) => `<option value="${esc(s.id)}">${esc(s.nombre)}</option>`).join("");

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

  const anterior = editando ? productos().find((p) => p.id === editando) : null;
  const producto = {
    id: editando || nuevoId(nombre),
    nombre,
    categoria: form.categoria.value,
    descripcion: form.descripcion.value.trim(),
    imagen: fotos[0] || "",
    personalizable: form.personalizable.checked,
    destacado: form.destacado.checked,
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
