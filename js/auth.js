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
  getFirestore, doc, getDoc, getDocs, setDoc, collection, writeBatch, deleteField, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CFG = window.STH_CONFIG || {};
const FB = CFG.firebase || {};
const configurado = Boolean(FB.apiKey && FB.projectId && FB.appId);
const EJEMPLO = (window.STH_PRODUCTOS || []).map((p, i) => ({ orden: i, ...p }));

const estado = {
  listo: false,              // ya se sabe si hay sesión
  configurado,
  usuario: null,
  precios: {},
  productos: null,           // null = cargando; luego, lista de productos
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

const ordenar = (lista) => lista.slice().sort((a, b) =>
  (a.orden ?? 1e9) - (b.orden ?? 1e9) || String(a.nombre).localeCompare(String(b.nombre), "es"));

async function cargarProductos() {
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

  async recuperar(correo) { await sendPasswordResetEmail(auth, correo.trim()); },

  async guardarPrecios(mapa) {
    await setDoc(doc(db, "precios", "catalogo"), mapa, { merge: true });
    estado.precios = { ...estado.precios, ...mapa };
    avisar();
  },

  // Crea o actualiza un producto. "precio" es opcional (número o 0).
  async guardarProducto(producto, precio) {
    await asegurarGestionado();
    const { id, ...datos } = producto;
    const batch = writeBatch(db);
    batch.set(doc(db, "productos", id), datos);
    batch.set(doc(db, "precios", "catalogo"), { [id]: Number(precio) > 0 ? Number(precio) : 0 }, { merge: true });
    await batch.commit();
    const lista = estado.productos.filter((p) => p.id !== id);
    lista.push({ id, ...datos });
    estado.productos = ordenar(lista);
    estado.precios = { ...estado.precios, [id]: Number(precio) > 0 ? Number(precio) : 0 };
    avisar();
  },

  async eliminarProducto(id) {
    await asegurarGestionado();
    const batch = writeBatch(db);
    batch.delete(doc(db, "productos", id));
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
