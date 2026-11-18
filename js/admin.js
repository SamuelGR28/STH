/* =========================================================
   STH – Página de administración de precios (admin.html)
   La seguridad real está en firestore.rules: aunque alguien
   abra esta página, solo los administradores pueden guardar.
   ========================================================= */
const CFG = window.STH_CONFIG || {};
const SECTORES = window.STH_SECTORES || [];
const PRODUCTOS = window.STH_PRODUCTOS || [];
const ADMINS = (CFG.administradores || []).map((c) => c.toLowerCase());

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
  $("#groups").innerHTML = SECTORES.map((s) => {
    const items = PRODUCTOS.filter((p) => p.categoria === s.id);
    if (!items.length) return "";
    return `<section class="admin__group"><h2>${esc(s.nombre)}</h2>${items.map((p) => {
      const v = Number(precios[p.id]) > 0 ? Number(precios[p.id]) : "";
      return `<div class="admin__row">
          <label for="p-${esc(p.id)}">${esc(p.nombre)}<small>${esc(p.id)}</small></label>
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
    $("#saveStatus").textContent = "Guardado " + new Date().toLocaleTimeString("es-CO");
    toast("Precios guardados");
  } catch (ex) {
    $("#saveStatus").textContent = window.STH_AUTH.mensaje(ex);
  } finally {
    btn.disabled = false;
  }
});
