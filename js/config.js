/* =========================================================
   CONFIGURACIÓN DE LA TIENDA SJTS
   Cambia aquí los datos de contacto. No necesitas tocar app.js.
   ========================================================= */
window.STH_CONFIG = {
  nombre: "SJTS",
  eslogan: "Multitienda creativa: hecho a mano y personalizado para ti",

  // Número de WhatsApp con indicativo del país, sin "+", espacios ni guiones.
  // Ejemplo Colombia: 573001234567
  whatsapp: "573006640237",

  instagram: "https://instagram.com/",   // enlace a tu perfil
  facebook: "",                          // déjalo vacío si no tienes
  correo: "contacto@sth.com",
  ciudad: "Colombia",
  horario: "Lunes a sábado, 9:00 a.m. – 6:00 p.m.",

  // Ruta al logo. Mientras esté vacío se muestra el texto "SJTS".
  // Ejemplo: "img/logo.png"
  logo: "img/logo.png",

  moneda: "COP",
  envio: "Hacemos envíos a todo el país. El costo se confirma por WhatsApp.",

  // Correos de los administradores que pueden editar precios en admin.html.
  // Deben coincidir con la lista de firestore.rules.
  administradores: ["samuelgira237@gmail.com"],

  // Configuración de Firebase (cuentas de usuario y precios).
  // Cópiala de: Consola de Firebase > Configuración del proyecto > Tus apps > Web.
  // Estos datos son públicos por diseño; la seguridad está en firestore.rules.
  firebase: {
    apiKey: "AIzaSyAqshfJMam9wCFDX-stwyxXMlFSYkHxTmE",
    authDomain: "sth-tienda.firebaseapp.com",
    projectId: "sth-tienda",
    storageBucket: "sth-tienda.firebasestorage.app",
    messagingSenderId: "911161714070",
    appId: "1:911161714070:web:6f02e2d7b29d832282e9b7"
  }
};
