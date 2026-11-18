/* =========================================================
   STH – Página de administración de precios (admin.html)
   La seguridad real está en firestore.rules: aunque alguien
   abra esta página, solo los administradores pueden guardar.
   ========================================================= */
const CFG = window.STH_CONFIG || {};
const SECTORES = window.STH_SECTORES || [];
const PRODUCTOS = window.STH_PRODUCTOS || [];
const ADMINS = (CFG.administradores || []).map((c) => c.toLowerCase());

// Precios de ejemplo para llenar el formulario la primera vez.
// Solo se usan si ese producto aún no tiene precio guardado en Firebase.
// Corrígelos en admin.html y pulsa "Guardar precios".
const SUGERIDOS = {
  "vela-lavanda": 28000, "vela-vainilla": 30000, "vela-regalo": 35000,
  "cuaderno-argollado": 22000, "agenda-2027": 38000, "libreta-bolsillo": 12000,
  "stickers": 8000, "tarjetas": 15000, "kit-marcadores": 18000,
  "mug-ceramica": 25000, "vaso-vidrio": 27000, "termo": 45000,
  "camiseta-estampada": 35000, "camiseta-nino": 28000, "camiseta-grupo": 30000,
  "buzo-capota": 75000, "gorra": 32000, "tote-bag": 26000
};

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const vistas = ["#loading", "#adminLogin", "#noAccess", "#priceEditor"];
const mostrar = (id) => vistas.forEach((v) => ($(v).hidden = v !== id));

let toastTimer;
function toast(t) {
  const el = $("#toast");
  el.textContent = t;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
}

function renderEditor(precios) {
  // Si un producto nunca se ha guardado, se sugiere el precio de ejemplo.
  const pendientes = PRODUCTOS.filter((p) => !(p.id in precios) && SUGERIDOS[p.id]).length;
  $("#pendingNote").hidden = pendientes === 0;
  $("#pendingCount").textContent = pendientes;

  $("#groups").innerHTML = SECTORES.map((s) => {
    const items = PRODUCTOS.filter((p) => p.categoria === s.id);
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

function render(estado) {
  if (!estado.listo) return mostrar("#loading");
  if (!estado.configurado) {
    $("#loading").textContent = "Firebase no está configurado todavía. Revisa js/config.js (ver README).";
    return mostrar("#loading");
  }
  if (!estado.usuario) return mostrar("#adminLogin");
  const correo = (estado.usuario.correo || "").toLowerCase();
  if (!ADMINS.includes(correo)) {
    $("#noAccessEmail").textContent = estado.usuario.correo;
    $("#noAccessHint").textContent = "Agrega este correo en js/config.js (administradores) y en firestore.rules.";
    return mostrar("#noAccess");
  }
  renderEditor(estado.precios || {});
  $("#saveStatus").textContent = estado.usuario.verificado === false
    ? "Verifica tu correo (revisa tu bandeja) para poder guardar."
    : "";
  mostrar("#priceEditor");
}

window.addEventListener("sth:auth", (e) => render(e.detail));
if (window.STH_AUTH?.estado?.listo) render(window.STH_AUTH.estado);

$("#adminLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { correo, clave } = Object.fromEntries(new FormData(e.target));
  $("#loginError").textContent = "";
  try {
    await window.STH_AUTH.ingresar(correo, clave);
  } catch (ex) {
    $("#loginError").textContent = window.STH_AUTH.mensaje(ex);
  }
});

const salir = () => window.STH_AUTH.salir();
$("#adminLogout").addEventListener("click", salir);
$("#noAccessLogout").addEventListener("click", salir);

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
    await window.STH_AUTH.guardarPrecios(mapa);
    renderEditor(window.STH_AUTH.estado.precios || mapa);
    $("#saveStatus").textContent = "Guardado " + new Date().toLocaleTimeString("es-CO");
    toast("Precios guardados");
  } catch (ex) {
    $("#saveStatus").textContent = window.STH_AUTH.mensaje(ex);
  } finally {
    btn.disabled = false;
  }
});
