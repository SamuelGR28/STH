/* =========================================================
   SJTS – Lógica de la tienda
   Normalmente no necesitas editar este archivo:
   los productos se administran en admin.html y los datos
   de contacto están en js/config.js.
   ========================================================= */
(() => {
  "use strict";

  const CFG = window.STH_CONFIG || {};
  const SECTORES = window.STH_SECTORES || [];
  // Los productos llegan desde Firebase (js/auth.js). Mientras tanto la lista está vacía.
  let PRODUCTOS = [];
  let productosListos = false;
  const CART_KEY = "sth-carrito-v1";

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const money = new Intl.NumberFormat("es-CO", {
    style: "currency", currency: CFG.moneda || "COP", maximumFractionDigits: 0
  });
  const fmt = (n) => money.format(n);

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  const sectorById = Object.fromEntries(SECTORES.map((s) => [s.id, s]));
  let productById = {};

  function setProductos(lista) {
    PRODUCTOS = Array.isArray(lista) ? lista : [];
    productById = Object.fromEntries(PRODUCTOS.map((p) => [p.id, p]));
    productosListos = true;
    // Quita del carrito los productos que ya no existen.
    const antes = cart.length;
    cart = cart.filter((l) => productById[l.id]);
    if (cart.length !== antes) saveCart();
    renderSectors();
  }

  /* ---------- Ilustraciones por sector (se usan si no hay foto) ---------- */
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

  const sectorColor = (cat) => `--sc: var(--c-${cat}, var(--tint))`;

  const media = (p) =>
    p.imagen
      ? `<img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy">`
      : icon(p.categoria);

  /* ---------- Estado ---------- */
  const state = { sector: "todos", query: "", sort: "relevancia" };
  let cart = loadCart();

  // Sesión y precios: los llena js/auth.js con el evento "sth:auth".
  let sesion = { listo: false, configurado: true, usuario: null, precios: {}, error: "" };
  const conSesion = () => Boolean(sesion.usuario);

  // Precio de un producto, o null si no hay sesión o no tiene precio cargado.
  function precio(p) {
    if (!conSesion()) return null;
    const v = Number(sesion.precios[p.id]);
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  function precioHTML(p) {
    if (!sesion.listo) return '<span class="price-wait">Cargando…</span>';
    if (!conSesion()) return `<button type="button" class="price-lock" data-auth="ingresar">${LOCK}Ver precio</button>`;
    const v = precio(p);
    return v ? `<span class="price">${fmt(v)}</span>` : '<span class="price-wait">Consultar</span>';
  }

  function loadCart() {
    try {
      const data = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(data) ? data.filter((l) => l && typeof l.id === "string" && l.qty > 0) : [];
    } catch { return []; }
  }
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* sin almacenamiento */ }
  }

  /* ---------- Datos de la marca ---------- */
  function waLink(text) {
    const num = String(CFG.whatsapp || "").replace(/\D/g, "");
    return `https://wa.me/${num}${text ? "?text=" + encodeURIComponent(text) : ""}`;
  }

  function renderBrand() {
    if (CFG.logo) {
      $("#brand").innerHTML = `<img src="${esc(CFG.logo)}" alt="${esc(CFG.nombre || "SJTS")}">`;
    } else {
      $("#brand").textContent = CFG.nombre || "SJTS";
    }
    if (CFG.eslogan) $("#eslogan").textContent = CFG.eslogan;
    if (CFG.envio) $("#envioTxt").textContent = CFG.envio;
    $("#year").textContent = new Date().getFullYear();

    const hola = `Hola ${CFG.nombre || "SJTS"}, quiero información sobre sus productos.`;
    $("#heroWhatsapp").href = waLink(hola);
    $("#contactWhatsapp").href = waLink(hola);

    $$(".hero__art .tile").forEach((t) => (t.innerHTML = icon(t.dataset.icon)));

    const items = [];
    if (CFG.whatsapp) items.push(["WhatsApp", `<a href="${waLink("")}" target="_blank" rel="noopener">+${esc(CFG.whatsapp)}</a>`]);
    if (CFG.instagram) items.push(["Instagram", `<a href="${esc(CFG.instagram)}" target="_blank" rel="noopener">Ver perfil</a>`]);
    if (CFG.facebook) items.push(["Facebook", `<a href="${esc(CFG.facebook)}" target="_blank" rel="noopener">Ver página</a>`]);
    if (CFG.correo) items.push(["Correo", `<a href="mailto:${esc(CFG.correo)}">${esc(CFG.correo)}</a>`]);
    if (CFG.ciudad) items.push(["Ubicación", esc(CFG.ciudad)]);
    if (CFG.horario) items.push(["Horario", esc(CFG.horario)]);
    $("#contactList").innerHTML = items.map(([k, v]) => `<li><strong>${k}</strong><span>${v}</span></li>`).join("");
  }

  /* ---------- Sectores ---------- */
  function renderSectors() {
    $("#sectorsGrid").innerHTML = SECTORES.map((s) => {
      const n = PRODUCTOS.filter((p) => p.categoria === s.id).length;
      return `<button class="sector" style="${sectorColor(s.id)}" data-sector="${esc(s.id)}">
          <div><h3>${esc(s.nombre)}</h3><p>${esc(s.descripcion)}</p></div>
          <span class="sector__count">${n} producto${n === 1 ? "" : "s"} →</span>
          <span class="sector__icon">${icon(s.id)}</span>
        </button>`;
    }).join("");

    $("#chips").innerHTML = [{ id: "todos", nombre: "Todos" }, ...SECTORES].map((s) =>
      `<button class="chip" role="tab" data-sector="${esc(s.id)}" aria-selected="${state.sector === s.id}">${esc(s.nombre)}</button>`
    ).join("");
  }

  function setSector(id, scroll) {
    state.sector = sectorById[id] ? id : "todos";
    $$(".chip").forEach((c) => c.setAttribute("aria-selected", c.dataset.sector === state.sector));
    const url = new URL(location.href);
    if (state.sector === "todos") url.searchParams.delete("sector");
    else url.searchParams.set("sector", state.sector);
    history.replaceState(null, "", url);
    renderProducts();
    if (scroll) $("#catalogo").scrollIntoView({ behavior: "smooth" });
  }

  /* ---------- Productos ---------- */
  function cardHTML(p) {
    const s = sectorById[p.categoria];
    return `<article class="card" style="${sectorColor(p.categoria)}">
        <button class="card__media" data-open="${esc(p.id)}" aria-label="Ver ${esc(p.nombre)}">
          ${media(p)}
          ${p.personalizable ? '<span class="badge">Personalizable</span>' : ""}
        </button>
        <div class="card__body">
          <span class="card__sector">${esc(s ? s.nombre : "")}</span>
          <h3 class="card__title">${esc(p.nombre)}</h3>
          <p class="card__desc">${esc(p.descripcion)}</p>
          <div class="card__foot">
            ${precioHTML(p)}
            <button class="btn btn--primary card__add" data-open="${esc(p.id)}">${conSesion() ? "Agregar" : "Ver"}</button>
          </div>
        </div>
      </article>`;
  }

  const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  function renderProducts() {
    const q = norm(state.query.trim());
    let list = PRODUCTOS.filter((p) =>
      (state.sector === "todos" || p.categoria === state.sector) &&
      (!q || norm(`${p.nombre} ${p.descripcion} ${sectorById[p.categoria]?.nombre || ""}`).includes(q))
    );
    const pv = (p, alto) => precio(p) ?? (alto ? Infinity : -Infinity);
    if (state.sort === "precio-asc") list.sort((a, b) => pv(a, true) - pv(b, true));
    else if (state.sort === "precio-desc") list.sort((a, b) => pv(b, false) - pv(a, false));
    else if (state.sort === "nombre") list.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    else list.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));

    $("#productsGrid").innerHTML = list.map(cardHTML).join("");
    $("#emptyMsg").hidden = list.length > 0;
    $("#emptyMsg").textContent = !productosListos
      ? "Cargando productos…"
      : (PRODUCTOS.length ? "No encontramos productos con esa búsqueda." : "Pronto agregaremos productos.");
    const sec = sectorById[state.sector];
    $("#catalogInfo").textContent = `${list.length} producto${list.length === 1 ? "" : "s"}${sec ? " en " + sec.nombre : ""}`;
  }

  function renderFeatured() {
    const feat = PRODUCTOS.filter((p) => p.destacado).slice(0, 4);
    $("#destacados").hidden = feat.length === 0;
    $("#featuredGrid").innerHTML = feat.map(cardHTML).join("");
  }

  /* ---------- Modal de producto ---------- */
  const modal = $("#productModal");
  let current = null;

  function pills(name, label, values, preselect) {
    return `<fieldset class="option" style="border:0;padding:0;margin:0 0 14px">
        <legend class="option__label">${label}</legend>
        <div class="pills">${values.map((v, i) => `
          <input type="radio" name="${name}" id="${name}-${i}" value="${esc(v)}" ${preselect && i === 0 ? "checked" : ""}>
          <label for="${name}-${i}">${esc(v)}</label>`).join("")}
        </div></fieldset>`;
  }

  function openProduct(id) {
    const p = productById[id];
    if (!p) return;
    current = p;
    const s = sectorById[p.categoria];
    $("#modalMedia").setAttribute("style", sectorColor(p.categoria));
    $("#modalMedia").innerHTML = media(p);
    $("#modalSector").textContent = s ? s.nombre : "";
    $("#modalTitle").textContent = p.nombre;
    $("#modalPrice").innerHTML = precioHTML(p);
    $("#modalDesc").textContent = p.descripcion;
    $("#modalAdd").textContent = conSesion() ? "Agregar al carrito" : "Ingresa para ver el precio y pedir";

    let opts = "";
    if (p.tallas?.length) opts += pills("talla", "Talla", p.tallas, false);
    if (p.colores?.length) opts += pills("color", "Color / estilo", p.colores, true);
    if (p.personalizable) {
      opts += `<label class="field">Texto para personalizar
          <input type="text" name="personalizacion" maxlength="80" placeholder="Nombre, frase o idea (opcional)">
        </label>`;
    }
    $("#modalOptions").innerHTML = opts;
    $("#modalQty").value = 1;
    modal.showModal();
  }

  $("#productForm").addEventListener("click", (e) => {
    const step = e.target.closest("[data-step]");
    if (!step) return;
    const input = $("#modalQty");
    input.value = Math.min(999, Math.max(1, (parseInt(input.value, 10) || 1) + Number(step.dataset.step)));
  });

  $("#productForm").addEventListener("submit", (e) => {
    if (e.submitter?.value !== "add" || !current) return;
    if (!conSesion()) {
      // El diálogo se cierra solo (method="dialog"); luego abrimos el de ingreso.
      setTimeout(() => openAuth("ingresar"), 0);
      return;
    }
    const form = e.target;
    const talla = form.querySelector('input[name="talla"]:checked')?.value || "";
    if (current.tallas?.length && !talla) {
      e.preventDefault();
      toast("Elige una talla");
      return;
    }
    const color = form.querySelector('input[name="color"]:checked')?.value || "";
    const personalizacion = (form.querySelector('input[name="personalizacion"]')?.value || "").trim();
    const qty = Math.min(999, Math.max(1, parseInt($("#modalQty").value, 10) || 1));
    addToCart({ id: current.id, talla, color, personalizacion, qty });
  });

  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });

  /* ---------- Carrito ---------- */
  const lineKey = (l) => [l.id, l.talla, l.color, l.personalizacion].join("|");

  function addToCart(item) {
    const existing = cart.find((l) => lineKey(l) === lineKey(item));
    if (existing) existing.qty = Math.min(999, existing.qty + item.qty);
    else cart.push(item);
    saveCart();
    renderCart();
    const badge = $("#cartCount");
    badge.classList.remove("bump"); void badge.offsetWidth; badge.classList.add("bump");
    toast(`${productById[item.id].nombre} agregado al carrito`);
  }

  function lineMeta(l) {
    return [l.talla && `Talla ${l.talla}`, l.color, l.personalizacion && `“${l.personalizacion}”`].filter(Boolean);
  }

  const totalCarrito = () => cart.reduce((n, l) => n + l.qty * (precio(productById[l.id]) || 0), 0);
  const subtotal = (p, qty) => {
    const v = precio(p);
    return v ? fmt(v * qty) : (conSesion() ? "Consultar" : "—");
  };

  function renderCart() {
    const count = cart.reduce((n, l) => n + l.qty, 0);
    $("#cartCount").textContent = count;
    $("#cartTotal").textContent = conSesion() ? fmt(totalCarrito()) : "Ingresa para ver";
    $("#cartFoot").hidden = cart.length === 0;
    $("#sendOrder").textContent = conSesion() ? "Enviar pedido por WhatsApp" : "Ingresa para enviar tu pedido";
    if (conSesion() && !$("#custName").value) $("#custName").value = sesion.usuario.nombre || "";

    $("#cartItems").innerHTML = cart.length === 0
      ? `<div class="cart__empty"><p>Tu carrito está vacío.</p><a href="#catalogo" class="btn btn--ghost" data-close-cart>Ver catálogo</a></div>`
      : cart.map((l, i) => {
          const p = productById[l.id];
          return `<div class="line">
              <div class="line__thumb" style="${sectorColor(p.categoria)}">${media(p)}</div>
              <div>
                <p class="line__name">${esc(p.nombre)}</p>
                <p class="line__meta">${lineMeta(l).map(esc).join(" · ") || esc(sectorById[p.categoria]?.nombre || "")}</p>
                <div class="qty">
                  <button data-line="${i}" data-delta="-1" aria-label="Menos">−</button>
                  <span>${l.qty}</span>
                  <button data-line="${i}" data-delta="1" aria-label="Más">+</button>
                </div>
              </div>
              <div class="line__right">
                <strong>${subtotal(p, l.qty)}</strong>
                <button class="remove" data-remove="${i}">Quitar</button>
              </div>
            </div>`;
        }).join("");
  }

  $("#cartItems").addEventListener("click", (e) => {
    const d = e.target.closest("[data-delta]");
    const r = e.target.closest("[data-remove]");
    if (d) {
      const l = cart[d.dataset.line];
      l.qty = Math.min(999, l.qty + Number(d.dataset.delta));
      if (l.qty < 1) cart.splice(d.dataset.line, 1);
    } else if (r) {
      cart.splice(r.dataset.remove, 1);
    } else if (e.target.closest("[data-close-cart]")) {
      closeCart();
      return;
    } else return;
    saveCart();
    renderCart();
  });

  $("#clearCart").addEventListener("click", () => {
    if (!confirm("¿Vaciar el carrito?")) return;
    cart = [];
    saveCart();
    renderCart();
  });

  $("#sendOrder").addEventListener("click", () => {
    if (!conSesion()) { closeCart(); openAuth("ingresar"); return; }
    const name = $("#custName").value.trim();
    if (!name) { toast("Escribe tu nombre para enviar el pedido"); $("#custName").focus(); return; }
    const city = $("#custCity").value.trim();
    const notes = $("#custNotes").value.trim();
    const total = totalCarrito();

    const lines = cart.map((l, i) => {
      const p = productById[l.id];
      const meta = lineMeta(l);
      return `${i + 1}. ${p.nombre} x${l.qty} = ${subtotal(p, l.qty)}${meta.length ? "\n   " + meta.join(" | ") : ""}`;
    });
    const u = sesion.usuario;

    const msg = [
      `Hola ${CFG.nombre || "SJTS"}, quiero hacer este pedido:`,
      "",
      ...lines,
      "",
      `Total productos: ${fmt(total)}`,
      "",
      `Nombre: ${name}`,
      `Correo: ${u.correo}`,
      ...(u.telefono ? [`Celular: ${u.telefono}`] : []),
      ...(city ? [`Ciudad/barrio: ${city}`] : []),
      ...(notes ? [`Notas: ${notes}`] : [])
    ].join("\n");

    window.open(waLink(msg), "_blank", "noopener");
  });

  const cartEl = $("#cart");
  const overlay = $("#overlay");
  function openCart() {
    cartEl.classList.add("open");
    cartEl.setAttribute("aria-hidden", "false");
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeCart() {
    cartEl.classList.remove("open");
    cartEl.setAttribute("aria-hidden", "true");
    overlay.hidden = true;
    document.body.style.overflow = "";
  }
  $("#openCart").addEventListener("click", openCart);
  $("#closeCart").addEventListener("click", closeCart);
  overlay.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });

  /* ---------- Aviso breve ---------- */
  let toastTimer;
  function toast(text) {
    const t = $("#toast");
    t.textContent = text;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ---------- Cuenta: ingresar, registrarse, recuperar ---------- */
  const authModal = $("#authModal");
  const AUTH = () => window.STH_AUTH;
  const esAdmin = () => conSesion() &&
    (CFG.administradores || []).map((c) => c.toLowerCase()).includes((sesion.usuario.correo || "").toLowerCase());

  function openAuth(panel) {
    if (conSesion()) panel = "cuenta";
    $$(".auth__panel", authModal).forEach((el) => {
      el.hidden = el.dataset.panel !== panel;
      const err = $(".auth__error", el);
      if (err) err.textContent = "";
    });
    if (panel === "cuenta") {
      $("#acctName").textContent = sesion.usuario.nombre || "cliente";
      $("#acctEmail").textContent = sesion.usuario.correo;
      $("#adminLink").hidden = !esAdmin();
    } else if (!sesion.configurado) {
      $(`[data-panel="${panel}"] .auth__error`, authModal).textContent =
        "El inicio de sesión aún no está activado en esta tienda.";
    }
    if (!authModal.open) authModal.showModal();
    $(`[data-panel="${panel}"] input`, authModal)?.focus();
  }

  $$("[data-auth-close]", authModal).forEach((b) => b.addEventListener("click", () => authModal.close()));
  authModal.addEventListener("click", (e) => { if (e.target === authModal) authModal.close(); });

  // Envía un formulario de cuenta mostrando "procesando" y los errores en español.
  function manejar(form, accion) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = $(".auth__error", form);
      const btn = $('button[type="submit"]', form);
      err.textContent = "";
      if (!AUTH() || !sesion.configurado) { err.textContent = "El inicio de sesión aún no está activado en esta tienda."; return; }
      const datos = Object.fromEntries(new FormData(form));
      const texto = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Un momento…";
      try {
        await accion(datos, err);
      } catch (ex) {
        err.textContent = AUTH().mensaje(ex);
      } finally {
        btn.disabled = false;
        btn.textContent = texto;
      }
    });
  }

  manejar($("#loginForm"), async ({ correo, clave }, err) => {
    if (!correo || !clave) { err.textContent = "Escribe tu correo y contraseña."; return; }
    await AUTH().ingresar(correo, clave);
    authModal.close();
    $("#loginForm").reset();
    toast("Sesión iniciada. Ya puedes ver los precios.");
  });

  manejar($("#registerForm"), async (d, err) => {
    if (!d.nombre.trim() || !d.telefono.trim() || !d.correo.trim() || !d.clave) {
      err.textContent = "Completa todos los campos.";
      return;
    }
    if (d.clave.length < 6) { err.textContent = "La contraseña debe tener al menos 6 caracteres."; return; }
    await AUTH().registrar(d);
    authModal.close();
    $("#registerForm").reset();
    toast("¡Cuenta creada! Ya puedes ver los precios.");
  });

  manejar($("#resetForm"), async ({ correo }, err) => {
    if (!correo) { err.textContent = "Escribe tu correo."; return; }
    await AUTH().recuperar(correo);
    err.textContent = "";
    toast("Te enviamos un enlace a tu correo. Revisa también la carpeta de spam.");
    openAuth("ingresar");
  });

  $("#logoutBtn").addEventListener("click", async () => {
    try { await AUTH().salir(); } catch { /* sin conexión */ }
    authModal.close();
    toast("Sesión cerrada");
  });

  $("#accountBtn").addEventListener("click", () => openAuth("ingresar"));

  function renderSesion() {
    const btn = $("#accountBtn");
    btn.classList.toggle("is-in", conSesion());
    const nombre = conSesion() ? (sesion.usuario.nombre || "").split(" ")[0] || "Mi cuenta" : "Ingresar";
    $("#accountLabel").textContent = nombre;
    btn.setAttribute("aria-label", conSesion() ? "Mi cuenta" : "Ingresar o crear cuenta");
    $("#priceNotice").hidden = !sesion.listo || conSesion();
    const sinPrecio = esAdmin() ? PRODUCTOS.filter((p) => !precio(p)).length : 0;
    $("#adminNotice").hidden = sinPrecio === 0;
    $("#adminMissing").textContent = sinPrecio;
    renderFeatured();
    renderProducts();
    renderCart();
  }

  function aplicarEstado(detalle) {
    sesion = { ...sesion, ...detalle };
    if (Array.isArray(detalle.productos)) setProductos(detalle.productos);
    renderSesion();
  }

  window.addEventListener("sth:auth", (e) => {
    aplicarEstado(e.detail);
    if (sesion.error && conSesion()) toast(sesion.error);
  });

  // Si js/auth.js no carga (sin internet o bloqueado), no dejamos la página en "Cargando…".
  setTimeout(() => {
    if (!productosListos) setProductos(window.STH_PRODUCTOS || []);
    if (!sesion.listo) {
      sesion = { ...sesion, listo: true, configurado: false, error: "No se pudo conectar con el servicio de cuentas." };
    }
    renderSesion();
  }, 10000);

  /* ---------- Eventos generales ---------- */
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-auth]");
    if (a) { openAuth(a.dataset.auth); return; }
    const open = e.target.closest("[data-open]");
    if (open) { openProduct(open.dataset.open); return; }
    const sec = e.target.closest("[data-sector]");
    if (sec) setSector(sec.dataset.sector, sec.classList.contains("sector"));
  });

  $("#searchInput").addEventListener("input", (e) => { state.query = e.target.value; renderProducts(); });
  $("#sortSelect").addEventListener("change", (e) => { state.sort = e.target.value; renderProducts(); });

  const menuBtn = $("#menuBtn");
  menuBtn.addEventListener("click", () => {
    const open = $("#nav").classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  $$("#nav a").forEach((a) => a.addEventListener("click", () => {
    $("#nav").classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }));

  /* ---------- Inicio ---------- */
  renderBrand();
  renderSectors();
  renderFeatured();
  const initial = new URLSearchParams(location.search).get("sector");
  setSector(initial || "todos", false);
  renderCart();
  // Si auth.js terminó antes que este archivo, tomamos su estado.
  if (window.STH_AUTH?.estado) aplicarEstado(window.STH_AUTH.estado);
})();
