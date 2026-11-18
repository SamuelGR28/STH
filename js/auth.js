/* =========================================================
   SJTS – Cuentas de usuario y precios (Firebase)
   - Inicia sesión, registra y cierra sesión.
   - Lee los precios de Firestore solo cuando hay sesión.
   - Avisa a la página con el evento "sth:auth".
   No necesitas editar este archivo: la configuración está en js/config.js.
   ========================================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, sendEmailVerification, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CFG = window.STH_CONFIG || {};
const FB = CFG.firebase || {};
const configurado = Boolean(FB.apiKey && FB.projectId && FB.appId);

const estado = { listo: false, configurado, usuario: null, precios: {}, error: "" };

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
  "permission-denied": "No tienes permiso para esta acción."
};
const mensaje = (e) => MENSAJES[e?.code] || "Ocurrió un error. Intenta de nuevo.";

let auth, db;

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
  }
};

if (!configurado) {
  estado.listo = true;
  estado.error = "Firebase no está configurado (js/config.js).";
  console.warn("[SJTS] " + estado.error);
  avisar();
} else {
  const app = initializeApp(FB);
  auth = getAuth(app);
  db = getFirestore(app);

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
