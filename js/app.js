/* =========================================================
   SJTS – Lógica de la tienda
   Normalmente no necesitas editar este archivo:
   los productos se administran en admin.html y los datos
   de contacto están en js/config.js.
   ========================================================= */
(() => {
  "use strict";

  const CFG = window.STH_CONFIG || {};
  // Sectores y productos llegan desde Firebase (js/auth.js). Mientras tanto las listas están vacías.
  let SECTORES = [];
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

  let sectorById = {};
  let productById = {};

  function setSectores(lista) {
    SECTORES = Array.isArray(lista) ? lista : [];
    sectorById = Object.fromEntries(SECTORES.map((s) => [s.id, s]));
    if (state.sector !== "todos" && !sectorById[state.sector]) state.sector = "todos";
    renderSectors();
    // Enlace directo a un sector (?sector=velas): se aplica cuando llegan los sectores.
    if (sectorInicial && sectorById[sectorInicial]) {
      const s = sectorInicial;
      sectorInicial = null;
      setSector(s, false);
    }
  }
  let sectorInicial = new URLSearchParams(location.search).get("sector");

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
  const UI = window.STH_UI;
  const icon = (cat) => UI.svg(sectorById[cat]?.icono || cat);
  const sectorColor = (cat) => UI.estilo(sectorById[cat], cat);

  const media = (p) =>
    p.imagen
      ? `<img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy">`
      : icon(p.categoria);

  /* ---------- Estado ---------- */
  const state = { sector: "todos", query: "", sort: "relevancia" };
  let cart = loadCart();

  // Sesión y precios: los llena js/auth.js con el evento "sth:auth".
  let sesion = { listo: false, configurado: true, usuario: null, precios: {}, error: "" };
  // Cada visitante tiene una sesión anónima automática (sin registrarse).
  const conSesion = () => Boolean(sesion.uid);
  // Administrador con su correo (si abrió la tienda con su sesión de admin).
  const esUsuario = () => Boolean(sesion.usuario);

  // Precio de un producto, o null si no hay sesión o no tiene precio cargado.
  function precio(p) {
    const v = Number(sesion.precios[p.id]);
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  // Unidades disponibles: número, o null si no hay límite (por encargo).
  const stockDe = (p) => (Number.isInteger(p?.stock) && p.stock >= 0 ? p.stock : null);

  function stockHTML(p) {
    const s = stockDe(p);
    if (s === null) return "";
    if (s === 0) return '<p class="stock stock--out">Agotado</p>';
    if (s <= 3) return `<p class="stock stock--low">¡Últimas ${s} unidad${s === 1 ? "" : "es"}!</p>`;
    return `<p class="stock stock--ok">${s} disponibles</p>`;
  }

  const LOCK ='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  function precioHTML(p) {
    if (!sesion.listo) return '<span class="price-wait">Cargando…</span>';
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
    sincronizarCarrito();
  }

  // Guarda el carrito en Firebase (si hay sesión) para poder recordarle al cliente
  // que dejó productos. Espera 2 s para no guardar en cada clic.
  let timerSync;
  function sincronizarCarrito() {
    clearTimeout(timerSync);
    timerSync = setTimeout(() => {
      if (!conSesion() || !productosListos || !window.STH_AUTH?.guardarCarrito) return;
      const items = cart.filter((l) => productById[l.id]).map((l) => ({
        id: l.id, nombre: productById[l.id].nombre, qty: l.qty,
        talla: l.talla || "", color: l.color || "", personalizacion: l.personalizacion || ""
      }));
      window.STH_AUTH.guardarCarrito(items, totalCarrito(), clienteGuardado()).catch((ex) =>
        console.warn("[SJTS] No se pudo guardar el carrito:", ex?.code || ex));
    }, 2000);
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

    pintarPortada(null);

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
    return `<article class="card${stockDe(p) === 0 ? " is-out" : ""}" style="${sectorColor(p.categoria)}">
        <button class="card__media" data-open="${esc(p.id)}" aria-label="Ver ${esc(p.nombre)}">
          ${media(p)}
          ${p.personalizable ? '<span class="badge">Personalizable</span>' : ""}
          ${p.fotosExtra > 0 ? `<span class="card__count">${p.fotosExtra + 1} fotos</span>` : ""}
        </button>
        <div class="card__body">
          <span class="card__sector">${esc(s ? s.nombre : "")}</span>
          <h3 class="card__title">${esc(p.nombre)}</h3>
          <p class="card__desc">${esc(p.descripcion)}</p>
          ${stockHTML(p)}
          <div class="card__foot">
            ${precioHTML(p)}
            <button class="btn btn--primary card__add" data-open="${esc(p.id)}">Agregar</button>
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

  // Muestra las fotos del producto en el popup: se deslizan con el dedo o con las flechas.
  function galeria(p, fotos) {
    const box = $("#modalMedia");
    if (!fotos.length) { box.innerHTML = icon(p.categoria); return; }
    const varias = fotos.length > 1;
    box.innerHTML = `<div class="gallery">${fotos.map((f, i) =>
        `<img src="${esc(f)}" alt="${esc(p.nombre)}${varias ? ` – foto ${i + 1}` : ""}">`).join("")}</div>
      ${varias ? `<button type="button" class="gallery__nav gallery__nav--prev" aria-label="Foto anterior">‹</button>
        <button type="button" class="gallery__nav gallery__nav--next" aria-label="Foto siguiente">›</button>
        <div class="gallery__dots">${fotos.map((_, i) => `<span${i ? "" : ' class="on"'}></span>`).join("")}</div>` : ""}`;
    if (!varias) return;
    const g = $(".gallery", box);
    const dots = $$(".gallery__dots span", box);
    const actual = () => Math.round(g.scrollLeft / g.clientWidth);
    const ir = (i) => g.scrollTo({ left: Math.max(0, Math.min(fotos.length - 1, i)) * g.clientWidth, behavior: "smooth" });
    $(".gallery__nav--prev", box).addEventListener("click", () => ir(actual() - 1));
    $(".gallery__nav--next", box).addEventListener("click", () => ir(actual() + 1));
    g.addEventListener("scroll", () => dots.forEach((d, i) => d.classList.toggle("on", i === actual())), { passive: true });
  }

  function openProduct(id) {
    const p = productById[id];
    if (!p) return;
    current = p;
    const s = sectorById[p.categoria];
    $("#modalMedia").setAttribute("style", sectorColor(p.categoria));
    galeria(p, p.imagen ? [p.imagen] : []);
    // Fotos adicionales: se piden al abrir el producto.
    if (p.fotosExtra > 0 && window.STH_AUTH?.obtenerFotos) {
      window.STH_AUTH.obtenerFotos(p.id).then((extras) => {
        if (current === p && modal.open) galeria(p, [p.imagen, ...extras].filter(Boolean));
      }).catch(() => { /* se queda con la portada */ });
    }
    $("#modalSector").textContent = s ? s.nombre : "";
    $("#modalTitle").textContent = p.nombre;
    $("#modalPrice").innerHTML = precioHTML(p);
    $("#modalDesc").textContent = p.descripcion;
    $("#modalStock").innerHTML = stockHTML(p);
    const agotado = stockDe(p) === 0;
    $("#modalAdd").textContent = agotado ? "Agotado" : "Agregar al carrito";
    $("#modalAdd").disabled = agotado;

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
    const libres = current ? disponiblesPara(current) : null;
    const max = libres === null ? 999 : Math.max(1, libres);
    const nuevo = (parseInt(input.value, 10) || 1) + Number(step.dataset.step);
    if (nuevo > max && libres !== null) toast(`Solo quedan ${libres} disponible${libres === 1 ? "" : "s"}`);
    input.value = Math.min(max, Math.max(1, nuevo));
  });

  $("#productForm").addEventListener("submit", (e) => {
    if (e.submitter?.value !== "add" || !current) return;
    const libres = disponiblesPara(current);
    if (libres !== null && libres <= 0) {
      e.preventDefault();
      toast(stockDe(current) === 0 ? "Producto agotado" : "Ya tienes en el carrito todas las unidades disponibles");
      return;
    }
    if (libres !== null && (parseInt($("#modalQty").value, 10) || 1) > libres) {
      e.preventDefault();
      $("#modalQty").value = libres;
      toast(`Solo quedan ${libres} disponible${libres === 1 ? "" : "s"}`);
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

  // Unidades que todavía se pueden agregar (null = sin límite).
  function disponiblesPara(p) {
    const s = stockDe(p);
    if (s === null) return null;
    const enCarrito = cart.filter((l) => l.id === p.id).reduce((n, l) => n + l.qty, 0);
    return Math.max(0, s - enCarrito);
  }

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
    return v ? fmt(v * qty) : "Consultar";
  };

  function renderCart() {
    const count = cart.reduce((n, l) => n + l.qty, 0);
    $("#cartCount").textContent = count;
    $("#cartTotal").textContent = fmt(totalCarrito());
    $("#cartFoot").hidden = cart.length === 0;
    $("#sendOrder").textContent = "Enviar pedido por WhatsApp";
    // Datos del cliente recordados en este navegador (no necesita cuenta).
    const c = clienteGuardado();
    if (!$("#custName").value) $("#custName").value = c.nombre || "";
    if (!$("#custPhone").value) $("#custPhone").value = c.telefono || "";
    if (!$("#custCity").value) $("#custCity").value = c.ciudad || "";

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
      const libres = disponiblesPara(productById[l.id]);
      if (Number(d.dataset.delta) > 0 && libres !== null && libres <= 0) {
        toast(`No hay más unidades disponibles de ${productById[l.id].nombre}`);
        return;
      }
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
    // Revisa que no se pidan más unidades de las disponibles (el stock pudo cambiar).
    const excedido = [...new Set(cart.map((l) => l.id))].map((id) => productById[id]).find((p) => {
      const s = stockDe(p);
      return s !== null && cart.filter((l) => l.id === p.id).reduce((n, l) => n + l.qty, 0) > s;
    });
    if (excedido) {
      const s = stockDe(excedido);
      toast(s === 0 ? `${excedido.nombre} se agotó. Quítalo del carrito.` : `De ${excedido.nombre} solo hay ${s} disponible${s === 1 ? "" : "s"}. Ajusta la cantidad.`);
      return;
    }
    const name = $("#custName").value.trim();
    if (!name) { toast("Escribe tu nombre para enviar el pedido"); $("#custName").focus(); return; }
    const phone = $("#custPhone").value.trim();
    if (phone.replace(/\D/g, "").length < 7) { toast("Escribe tu celular para confirmar el pedido"); $("#custPhone").focus(); return; }
    const city = $("#custCity").value.trim();
    guardarCliente({ nombre: name, telefono: phone, ciudad: city });
    const notes = $("#custNotes").value.trim();
    const total = totalCarrito();

    const lines = cart.map((l, i) => {
      const p = productById[l.id];
      const meta = lineMeta(l);
      return `${i + 1}. ${p.nombre} x${l.qty} = ${subtotal(p, l.qty)}${meta.length ? "\n   " + meta.join(" | ") : ""}`;
    });
    const AUTHX = window.STH_AUTH;
    if (!AUTHX?.crearPedido) { toast("No hay conexión con la tienda. Intenta de nuevo."); return; }

    const mensaje = (token) => [
      `Hola ${CFG.nombre || "SJTS"}, quiero hacer este pedido:`,
      `Pedido: ${token}`,
      "",
      ...lines,
      "",
      `Total productos: ${fmt(total)}`,
      "",
      `Nombre: ${name}`,
      `Celular: ${phone}`,
      ...(city ? [`Ciudad/barrio: ${city}`] : []),
      ...(notes ? [`Notas: ${notes}`] : [])
    ].join("\n");

    const items = cart.map((l) => {
      const p = productById[l.id];
      return { id: l.id, nombre: p.nombre, qty: l.qty, precio: precio(p) || 0,
        talla: l.talla || "", color: l.color || "", personalizacion: l.personalizacion || "" };
    });

    // Se abre la ventana ya (si no, el celular la bloquea) y se llena cuando el pedido quede guardado.
    const ventana = window.open("", "_blank");
    const btn = $("#sendOrder");
    btn.disabled = true;
    btn.textContent = "Registrando pedido…";

    (async () => {
      let token = null, ultimoError = null;
      for (let intento = 0; intento < 3 && !token; intento++) {
        const t = AUTHX.nuevoToken();
        try { await AUTHX.crearPedido(t, { items, total, notas: notes, cliente: { nombre: name, telefono: phone, ciudad: city } }); token = t; }
        catch (ex) { ultimoError = ex; }
      }
      btn.disabled = false;
      renderCart();
      if (!token) {
        try { ventana?.close(); } catch { /* nada */ }
        console.warn("[SJTS] No se pudo registrar el pedido:", ultimoError?.code || ultimoError);
        toast("No se pudo registrar el pedido. Revisa tu conexión e intenta de nuevo.", 5000);
        return;
      }
      const url = waLink(mensaje(token));
      if (ventana && !ventana.closed) ventana.location.href = url;
      else location.href = url;
      cart = [];
      saveCart();
      $("#custNotes").value = "";
      renderCart();
      closeCart();
      toast(`Pedido ${token} registrado. Termina de confirmarlo en WhatsApp.`, 6000);
    })();
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
  function toast(text, ms = 2200) {
    const t = $("#toast");
    t.textContent = text;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), ms);
  }

  /* ---------- Datos del cliente (sin cuenta) ---------- */
  const CLIENTE_KEY = "sth-cliente";
  function clienteGuardado() {
    try { return JSON.parse(localStorage.getItem(CLIENTE_KEY) || "{}") || {}; } catch { return {}; }
  }
  function guardarCliente(c) {
    try { localStorage.setItem(CLIENTE_KEY, JSON.stringify(c)); } catch { /* nada */ }
  }
  // Si escribe su nombre o celular, se guarda para el recordatorio de carrito.
  ["#custName", "#custPhone", "#custCity"].forEach((sel) => $(sel).addEventListener("change", () => {
    guardarCliente({ nombre: $("#custName").value.trim(), telefono: $("#custPhone").value.trim(), ciudad: $("#custCity").value.trim() });
    sincronizarCarrito();
  }));

  /* ---------- Cuenta del administrador (si abre la tienda con su sesión) ---------- */
  const authModal = $("#authModal");
  const AUTH = () => window.STH_AUTH;
  const esAdmin = () => esUsuario() &&
    (CFG.administradores || []).map((c) => c.toLowerCase()).includes((sesion.usuario.correo || "").toLowerCase());

  function openAuth() {
    if (!esUsuario()) return;
    $("#acctName").textContent = sesion.usuario.nombre || "administrador";
    $("#acctEmail").textContent = sesion.usuario.correo;
    $("#adminLink").hidden = !esAdmin();
    if (!authModal.open) authModal.showModal();
  }

  $$("[data-auth-close]", authModal).forEach((b) => b.addEventListener("click", () => authModal.close()));
  authModal.addEventListener("click", (e) => { if (e.target === authModal) authModal.close(); });

  $("#logoutBtn").addEventListener("click", async () => {
    try { await AUTH().salir(); } catch { /* sin conexión */ }
    authModal.close();
    toast("Sesión cerrada");
  });

  // Sin sesión de administrador: lleva al ingreso de admin. Con sesión: muestra "Mi cuenta".
  $("#accountBtn").addEventListener("click", () => {
    if (esUsuario()) openAuth();
    else location.href = "admin.html";
  });

  // Lista de productos en formato que entiende Google (schema.org), con precio y disponibilidad.
  let ldAnterior = "";
  function actualizarDatosGoogle() {
    if (!productosListos || !PRODUCTOS.length) return;
    const base = "https://sjtsmanualidades.com/";
    const datos = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Catálogo SJTS Manualidades",
      "itemListElement": PRODUCTOS.map((p, i) => {
        const v = precio(p);
        const s = stockDe(p);
        const prod = {
          "@type": "Product",
          "name": p.nombre,
          "description": p.descripcion || p.nombre,
          "category": sectorById[p.categoria]?.nombre || "",
          "brand": { "@type": "Brand", "name": "SJTS Manualidades" }
        };
        if (/^https?:\/\//.test(p.imagen || "")) prod.image = p.imagen;
        if (v) {
          prod.offers = {
            "@type": "Offer",
            "price": v,
            "priceCurrency": CFG.moneda || "COP",
            "availability": s === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            "url": `${base}?sector=${encodeURIComponent(p.categoria)}#catalogo`
          };
        }
        return { "@type": "ListItem", "position": i + 1, "item": prod };
      })
    };
    const json = JSON.stringify(datos);
    if (json === ldAnterior) return;
    ldAnterior = json;
    let el = document.getElementById("ld-productos");
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = "ld-productos";
      document.head.appendChild(el);
    }
    el.textContent = json;
  }

  function renderSesion() {
    actualizarDatosGoogle();
    // El botón de cuenta solo se ve si un administrador abrió la tienda con su sesión.
    $("#accountBtn").classList.toggle("is-in", esUsuario());
    $("#accountLabel").textContent = esUsuario() ? "Admin" : "Ingreso admin";
    $("#accountBtn").setAttribute("aria-label", esUsuario() ? "Mi cuenta de administrador" : "Ingreso de administrador");
    const sinPrecio = esAdmin() ? PRODUCTOS.filter((p) => !precio(p)).length : 0;
    $("#adminNotice").hidden = sinPrecio === 0;
    $("#adminMissing").textContent = sinPrecio;
    renderFeatured();
    renderProducts();
    renderCart();
  }

  // Los 4 recuadros de la portada: foto subida en admin.html > Portada, o la ilustración.
  // fotos = null mientras cargan (se ven las ilustraciones).
  let portadaActual = "";
  function pintarPortada(fotos) {
    const clave = JSON.stringify(fotos || []);
    if (fotos && clave === portadaActual) return;
    portadaActual = clave;
    $$(".hero__art .tile").forEach((t, i) => {
      const f = fotos?.[i];
      t.innerHTML = f ? `<img src="${esc(f)}" alt="" loading="eager">` : icon(t.dataset.icon);
    });
  }

  let uidAnterior = null;
  function aplicarEstado(detalle) {
    sesion = { ...sesion, ...detalle };
    if (Array.isArray(detalle.portada)) pintarPortada(detalle.portada);
    if (Array.isArray(detalle.sectores)) setSectores(detalle.sectores);
    if (Array.isArray(detalle.productos)) setProductos(detalle.productos);
    renderSesion();
    // Al iniciar sesión: si este navegador no tiene carrito, recupera el guardado;
    // si tiene, lo guarda para el recordatorio.
    const uid = sesion.uid || null;
    if (uid && uid !== uidAnterior && productosListos) {
      uidAnterior = uid;
      if (cart.length) sincronizarCarrito();
      else window.STH_AUTH?.leerCarrito?.().then((items) => {
        const validos = items.filter((l) => productById[l.id] && l.qty > 0)
          .map(({ id, qty, talla, color, personalizacion }) => ({ id, qty, talla, color, personalizacion }));
        if (!validos.length || cart.length) return;
        cart = validos;
        try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* nada */ }
        renderCart();
        mostrarRecordatorio(true);
      }).catch(() => {});
    }
    if (!uid) uidAnterior = null;
    if (productosListos) mostrarRecordatorio(false);
  }

  /* ---------- Recordatorio de carrito ---------- */
  const VISITA_KEY = "sth-ultima-visita";
  let recordatorioMostrado = false;
  let ultimaVisita = 0;
  try { ultimaVisita = Number(localStorage.getItem(VISITA_KEY)) || 0; } catch { /* nada */ }

  // Si el cliente vuelve (más de 30 min después) y tiene productos, se lo recordamos.
  function mostrarRecordatorio(forzar) {
    if (recordatorioMostrado || !cart.length) return;
    const volvio = ultimaVisita && Date.now() - ultimaVisita > 30 * 60 * 1000;
    if (!forzar && !volvio) return;
    recordatorioMostrado = true;
    const n = cart.reduce((s, l) => s + l.qty, 0);
    const quien = clienteGuardado().nombre || sesion.usuario?.nombre || "";
    const nombre = quien ? quien.split(" ")[0] + ", t" : "T";
    $("#cartReminderText").textContent = `${nombre}ienes ${n} producto${n === 1 ? "" : "s"} esperando en tu carrito.`;
    $("#cartReminder").hidden = false;
  }
  $("#cartReminderOpen").addEventListener("click", () => { $("#cartReminder").hidden = true; openCart(); });
  $("#cartReminderClose").addEventListener("click", () => { $("#cartReminder").hidden = true; });

  // Si cambia de pestaña con productos en el carrito, el título se lo recuerda.
  const tituloOriginal = document.title;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      try { localStorage.setItem(VISITA_KEY, String(Date.now())); } catch { /* nada */ }
      if (cart.length) document.title = "🛒 ¡Olvidaste algo en tu carrito! · SJTS";
    } else {
      document.title = tituloOriginal;
    }
  });
  window.addEventListener("pagehide", () => {
    try { localStorage.setItem(VISITA_KEY, String(Date.now())); } catch { /* nada */ }
  });

  window.addEventListener("sth:auth", (e) => {
    aplicarEstado(e.detail);
    if (sesion.error && esUsuario()) toast(sesion.error);
  });

  // Si js/auth.js no carga (sin internet o bloqueado), no dejamos la página en "Cargando…".
  setTimeout(() => {
    if (!SECTORES.length) setSectores(window.STH_SECTORES || []);
    if (!productosListos) setProductos(window.STH_PRODUCTOS || []);
    if (!sesion.listo) {
      sesion = { ...sesion, listo: true, configurado: false, error: "No se pudo conectar con el servicio de cuentas." };
    }
    renderSesion();
  }, 10000);

  /* ---------- Eventos generales ---------- */
  document.addEventListener("click", (e) => {
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
