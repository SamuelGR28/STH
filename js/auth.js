/* =========================================================
   SJTS – Cuentas, productos y precios (Firebase)
   - Inicia sesión, registra y cierra sesión.
   - Lee los productos de Firestore (públicos).
   - Lee los precios de Firestore solo cuando hay sesión.
   - Avisa a la página con el evento "sth:auth".
   No necesitas editar este archivo: la configuración está en js/config.js.

   Productos: mientras el administrador no haya guardado ningún
   producto desde admin.html, la tienda muestra los de js/productos.js.
   Al primer cambio en admin.html esos productos se copian a Firebase
   y desde entonces Firebase es la única fuente.
   ========================================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, sendEmailVerification, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, getDocs, setDoc, collection, writeBatch, deleteField, serverTimestamp, runTransaction,
  query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CFG = window.STH_CONFIG || {};
const FB = CFG.firebase || {};
const configurado = Boolean(FB.apiKey && FB.projectId && FB.appId);
const EJEMPLO = (window.STH_PRODUCTOS || []).map((p, i) => ({ orden: i, ...p }));
const SECTORES_EJEMPLO = window.STH_SECTORES || [];

const estado = {
  listo: false,              // ya se sabe si hay sesión
  configurado,
  usuario: null,
  precios: {},
  productos: null,           // null = cargando; luego, lista de productos
  sectores: null,            // null = cargando; luego, lista de sectores
  catalogoGestionado: false, // true = los productos vienen de Firebase
  error: ""
};

function avisar() {
  window.STH_AUTH.estado = { ...estado };
  window.dispatchEvent(new CustomEvent("sth:auth", { detail: window.STH_AUTH.estado }));
}

const MENSAJES = {
  "auth/invalid-email": "El correo no es válido.",
  "auth/missing-password": "Escribe la contraseña.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese correo. Inicia sesión.",
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/wrong-password": "Correo o contraseña incorrectos.",
  "auth/user-not-found": "No existe una cuenta con ese correo.",
  "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
  "auth/network-request-failed": "Sin conexión. Revisa tu internet.",
  "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase (Authentication > Settings > Authorized domains).",
  "auth/operation-not-allowed": "El registro con correo no está activado en Firebase.",
  "permission-denied": "No tienes permiso para esta acción. Revisa las reglas de Firestore.",
  "invalid-argument": "La foto es demasiado grande. Usa una imagen más liviana."
};
const mensaje = (e) => MENSAJES[e?.code] || "Ocurrió un error. Intenta de nuevo.";

let auth, db;
const cacheFotos = {};

// Registro de un cambio de inventario (colección "movimientos").
function movimiento(productoId, nombre, tipo, antes, despues, nota) {
  const a = Number.isInteger(antes) ? antes : null;
  const d = Number.isInteger(despues) ? despues : null;
  return {
    productoId,
    producto: nombre || productoId,
    tipo,
    cantidad: a !== null && d !== null ? d - a : (d ?? 0),
    stockAntes: a,
    stockDespues: d,
    nota: String(nota || "").slice(0, 200),
    por: estado.usuario?.correo || "",
    fecha: serverTimestamp()
  };
}

const ordenar = (lista) => lista.slice().sort((a, b) =>
  (a.orden ?? 1e9) - (b.orden ?? 1e9) || String(a.nombre).localeCompare(String(b.nombre), "es"));

async function cargarProductos() {
  try {
    const sect = await getDoc(doc(db, "ajustes", "sectores"));
    const lista = sect.exists() ? sect.data().lista : null;
    estado.sectores = Array.isArray(lista) ? lista : SECTORES_EJEMPLO;
  } catch (e) {
    console.warn("[SJTS] Sectores desde js/productos.js:", e?.code || e);
    estado.sectores = SECTORES_EJEMPLO;
  }
  try {
    const ajustes = await getDoc(doc(db, "ajustes", "catalogo"));
    if (ajustes.exists() && ajustes.data().gestionado) {
      const snap = await getDocs(collection(db, "productos"));
      estado.productos = ordenar(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      estado.catalogoGestionado = true;
    } else {
      estado.productos = EJEMPLO;
      estado.catalogoGestionado = false;
    }
  } catch (e) {
    // Si las reglas aún no permiten leer productos, usamos js/productos.js.
    console.warn("[SJTS] Productos desde js/productos.js:", e?.code || e);
    estado.productos = EJEMPLO;
    estado.catalogoGestionado = false;
  }
  avisar();
}

// La primera vez que el administrador cambia algo, copia los productos de ejemplo a Firebase.
async function asegurarGestionado() {
  if (estado.catalogoGestionado) return;
  const batch = writeBatch(db);
  EJEMPLO.forEach(({ id, ...datos }) => batch.set(doc(db, "productos", id), datos));
  batch.set(doc(db, "ajustes", "catalogo"), { gestionado: true }, { merge: true });
  await batch.commit();
  estado.productos = EJEMPLO.slice();
  estado.catalogoGestionado = true;
}

window.STH_AUTH = {
  estado: { ...estado },
  configurado,
  mensaje,

  async ingresar(correo, clave) {
    await signInWithEmailAndPassword(auth, correo.trim(), clave);
  },

  async registrar({ nombre, telefono, correo, clave }) {
    const cred = await createUserWithEmailAndPassword(auth, correo.trim(), clave);
    await updateProfile(cred.user, { displayName: nombre.trim() });
    await setDoc(doc(db, "usuarios", cred.user.uid), {
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      correo: correo.trim(),
      creado: serverTimestamp()
    });
    try { await sendEmailVerification(cred.user); } catch { /* opcional */ }
    estado.usuario = { uid: cred.user.uid, correo: cred.user.email, nombre: nombre.trim(), telefono: telefono.trim() };
    avisar();
  },

  async salir() { await signOut(auth); },

  // Guarda la lista completa de sectores (en el orden en que se muestran).
  async guardarSectores(lista) {
    const limpia = lista.map(({ id, nombre, descripcion, icono, color }) =>
      ({ id, nombre, descripcion: descripcion || "", icono: icono || "estrella", color: color || "#f4ebe0" }));
    await setDoc(doc(db, "ajustes", "sectores"), { lista: limpia });
    estado.sectores = limpia;
    avisar();
  },

  async recuperar(correo) { await sendPasswordResetEmail(auth, correo.trim()); },

  async guardarPrecios(mapa) {
    await setDoc(doc(db, "precios", "catalogo"), mapa, { merge: true });
    estado.precios = { ...estado.precios, ...mapa };
    avisar();
  },

  // Fotos adicionales de un producto (la portada está en producto.imagen).
  // Se guardan aparte para que el catálogo cargue rápido.
  async obtenerFotos(id) {
    if (cacheFotos[id]) return cacheFotos[id];
    if (!db) return [];
    const snap = await getDoc(doc(db, "fotos", id));
    const lista = snap.exists() && Array.isArray(snap.data().lista) ? snap.data().lista : [];
    cacheFotos[id] = lista;
    return lista;
  },

  // Crea o actualiza un producto. "precio" es opcional (número o 0).
  // "extras" = fotos adicionales (sin la portada); null = no cambiarlas.
  async guardarProducto(producto, precio, extras = null) {
    await asegurarGestionado();
    const { id, ...datos } = producto;
    const batch = writeBatch(db);
    if (Array.isArray(extras)) {
      datos.fotosExtra = extras.length;
      if (extras.length) batch.set(doc(db, "fotos", id), { lista: extras });
      else batch.delete(doc(db, "fotos", id));
      cacheFotos[id] = extras;
    }
    batch.set(doc(db, "productos", id), datos);
    batch.set(doc(db, "precios", "catalogo"), { [id]: Number(precio) > 0 ? Number(precio) : 0 }, { merge: true });
    // Si cambiaron las unidades desde el formulario, queda registrado en el inventario.
    const antes = estado.productos.find((p) => p.id === id);
    const stockAntes = Number.isInteger(antes?.stock) ? antes.stock : null;
    const stockDespues = Number.isInteger(datos.stock) ? datos.stock : null;
    if (stockAntes !== stockDespues) {
      batch.set(doc(collection(db, "movimientos")), movimiento(id, datos.nombre, "ajuste",
        stockAntes, stockDespues, antes ? "Editado desde Productos" : "Producto nuevo"));
    }
    await batch.commit();
    const lista = estado.productos.filter((p) => p.id !== id);
    lista.push({ id, ...datos });
    estado.productos = ordenar(lista);
    estado.precios = { ...estado.precios, [id]: Number(precio) > 0 ? Number(precio) : 0 };
    avisar();
  },

  /* ----- Pedidos con token -----
     Cada pedido enviado por WhatsApp se guarda con un código (token) y queda "pendiente".
     El administrador lo marca como "comprado" (se descuenta del inventario)
     o "no-comprado" (no se descuenta). */

  // Código corto y fácil de dictar: SJTS-XXXXXX (sin 0/O ni 1/I/L).
  nuevoToken() {
    const letras = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    const r = crypto.getRandomValues(new Uint32Array(6));
    return "SJTS-" + Array.from(r, (n) => letras[n % letras.length]).join("");
  },

  // Guarda el pedido del cliente con estado "pendiente". No toca el inventario.
  async crearPedido(token, { items, total, ciudad, notas }) {
    const u = estado.usuario;
    if (!db || !u) throw new Error("Inicia sesión para enviar el pedido.");
    await setDoc(doc(db, "pedidos", token), {
      token,
      estado: "pendiente",
      uid: u.uid,
      cliente: { nombre: u.nombre || "", correo: u.correo || "", telefono: u.telefono || "", ciudad: ciudad || "" },
      notas: String(notas || "").slice(0, 500),
      items: items.slice(0, 50),
      total: Number(total) || 0,
      fecha: serverTimestamp()
    });
  },

  // Últimos pedidos (solo administradores).
  async cargarPedidos(cuantos = 200) {
    const snap = await getDocs(query(collection(db, "pedidos"), orderBy("fecha", "desc"), limit(cuantos)));
    return snap.docs.map((d) => {
      const p = d.data();
      return { ...p, token: d.id, fecha: p.fecha?.toDate ? p.fecha.toDate() : null, cerrado: p.cerrado?.toDate ? p.cerrado.toDate() : null };
    });
  },

  // Cambia el estado de un pedido y ajusta el inventario:
  //   pendiente  -> comprado     : descuenta las unidades
  //   comprado   -> no-comprado  : devuelve las unidades
  //   cualquiera -> no-comprado / pendiente sin pasar por "comprado": no toca el inventario
  async cambiarEstadoPedido(token, nuevo) {
    await asegurarGestionado();
    const refPedido = doc(db, "pedidos", token);
    const cambios = await runTransaction(db, async (tx) => {
      const sp = await tx.get(refPedido);
      if (!sp.exists()) throw new Error("No existe el pedido " + token);
      const pedido = sp.data();
      const antes = pedido.estado || "pendiente";
      if (antes === nuevo) return {};
      const signo = nuevo === "comprado" ? -1 : antes === "comprado" ? 1 : 0;

      // Unidades por producto.
      const porProducto = {};
      (pedido.items || []).forEach((it) => { porProducto[it.id] = (porProducto[it.id] || 0) + Math.max(0, it.qty | 0); });
      const ids = signo ? Object.keys(porProducto) : [];
      const refs = ids.map((id) => doc(db, "productos", id));
      const snaps = await Promise.all(refs.map((r) => tx.get(r)));

      const res = {};
      snaps.forEach((s, i) => {
        if (!s.exists()) return;
        const actual = s.data().stock;
        if (!Number.isInteger(actual)) return; // sin control de inventario
        const final = Math.max(0, actual + signo * porProducto[ids[i]]);
        if (final === actual) return;
        res[ids[i]] = final;
        tx.update(refs[i], { stock: final });
        tx.set(doc(collection(db, "movimientos")), {
          ...movimiento(ids[i], s.data().nombre, signo < 0 ? "pedido" : "devolucion", actual, final,
            signo < 0 ? `Pedido ${token} comprado` : `Pedido ${token} anulado`),
          cliente: [pedido.cliente?.nombre, pedido.cliente?.correo].filter(Boolean).join(" · "),
          pedido: token
        });
      });
      tx.update(refPedido, { estado: nuevo, cerrado: serverTimestamp(), cerradoPor: estado.usuario?.correo || "" });
      return res;
    });
    estado.productos = estado.productos.map((p) => (p.id in cambios ? { ...p, stock: cambios[p.id] } : p));
    avisar();
    return cambios;
  },

  // Movimiento de inventario hecho por el administrador.
  // tipo: "entrada" (suma), "salida" (resta), "ajuste" (fija el valor), "sin-limite" (deja de controlar).
  async moverInventario(id, tipo, cantidad, nota = "") {
    await asegurarGestionado();
    const n = Math.max(0, Math.min(99999, cantidad | 0));
    const ref = doc(db, "productos", id);
    const nuevo = await runTransaction(db, async (tx) => {
      const s = await tx.get(ref);
      if (!s.exists()) throw new Error("El producto ya no existe.");
      const actual = Number.isInteger(s.data().stock) ? s.data().stock : null;
      let resultado;
      if (tipo === "entrada") resultado = (actual ?? 0) + n;
      else if (tipo === "salida") resultado = Math.max(0, (actual ?? 0) - n);
      else if (tipo === "ajuste") resultado = n;
      else resultado = null; // sin límite
      tx.update(ref, { stock: resultado });
      tx.set(doc(collection(db, "movimientos")), movimiento(id, s.data().nombre, tipo, actual, resultado, nota));
      return resultado;
    });
    estado.productos = estado.productos.map((p) => (p.id === id ? { ...p, stock: nuevo } : p));
    avisar();
    return nuevo;
  },

  // Últimos movimientos del inventario (solo administradores).
  async cargarMovimientos(cuantos = 100) {
    const snap = await getDocs(query(collection(db, "movimientos"), orderBy("fecha", "desc"), limit(cuantos)));
    return snap.docs.map((d) => {
      const m = d.data();
      return { id: d.id, ...m, fecha: m.fecha?.toDate ? m.fecha.toDate() : null };
    });
  },

  async eliminarProducto(id) {
    await asegurarGestionado();
    const batch = writeBatch(db);
    batch.delete(doc(db, "productos", id));
    batch.delete(doc(db, "fotos", id));
    delete cacheFotos[id];
    batch.set(doc(db, "precios", "catalogo"), { [id]: deleteField() }, { merge: true });
    await batch.commit();
    estado.productos = estado.productos.filter((p) => p.id !== id);
    const { [id]: _, ...resto } = estado.precios;
    estado.precios = resto;
    avisar();
  }
};

if (!configurado) {
  estado.listo = true;
  estado.productos = EJEMPLO;
  estado.sectores = SECTORES_EJEMPLO;
  estado.error = "Firebase no está configurado (js/config.js).";
  console.warn("[SJTS] " + estado.error);
  avisar();
} else {
  const app = initializeApp(FB);
  auth = getAuth(app);
  db = getFirestore(app);

  cargarProductos();

  onAuthStateChanged(auth, async (user) => {
    estado.error = "";
    if (!user) {
      estado.usuario = null;
      estado.precios = {};
      estado.listo = true;
      avisar();
      return;
    }
    estado.usuario = { uid: user.uid, correo: user.email, nombre: user.displayName || "", telefono: "", verificado: user.emailVerified };
    try {
      const [precios, perfil] = await Promise.all([
        getDoc(doc(db, "precios", "catalogo")),
        getDoc(doc(db, "usuarios", user.uid))
      ]);
      estado.precios = precios.exists() ? precios.data() : {};
      if (perfil.exists()) {
        const p = perfil.data();
        estado.usuario.nombre = p.nombre || estado.usuario.nombre;
        estado.usuario.telefono = p.telefono || "";
      }
    } catch (e) {
      console.error("[SJTS]", e);
      estado.precios = {};
      estado.error = mensaje(e);
    }
    estado.listo = true;
    avisar();
  });
}
