/* =========================================================
   SECTORES Y PRODUCTOS DE SJTS
   - Para agregar un producto, copia un bloque { ... } y cambia sus datos.
   - "categoria" debe ser el "id" de uno de los sectores.
   - "imagen": ruta a la foto, por ejemplo "img/productos/vela-lavanda.jpg".
     Si la dejas vacía ("") se muestra una ilustración del sector.
   - Los PRECIOS no van aquí: este archivo es público. Se guardan en
     Firebase y se editan en admin.html (solo los ven usuarios registrados).
   - "personalizable": true si el cliente puede escribir un nombre o frase.
   - "tallas" y "colores": opcionales; bórralos si no aplican.
   - "destacado": true para que aparezca en "Lo más pedido".
   ========================================================= */

window.STH_SECTORES = [
  { id: "velas",     nombre: "Velas",                 descripcion: "Aromáticas, decorativas y para regalo." },
  { id: "cuadernos", nombre: "Cuadernos",             descripcion: "Libretas y agendas con portada a tu gusto." },
  { id: "papeleria", nombre: "Papelería",             descripcion: "Stickers, tarjetas, marcadores y más." },
  { id: "vasos",     nombre: "Vasos personalizados",  descripcion: "Vasos, mugs y termos con tu diseño." },
  { id: "camisas",   nombre: "Camisas",               descripcion: "Camisetas estampadas con tu idea." },
  { id: "ropa",      nombre: "Ropa",                  descripcion: "Buzos, gorras y prendas personalizadas." }
];

window.STH_PRODUCTOS = [
  // ---------- VELAS ----------
  { id: "vela-lavanda", categoria: "velas", nombre: "Vela aromática de lavanda",
    descripcion: "Cera de soya en frasco de vidrio, 200 g. Aprox. 40 horas de duración.",
    imagen: "", personalizable: false, destacado: true },
  { id: "vela-vainilla", categoria: "velas", nombre: "Vela de vainilla y canela",
    descripcion: "Aroma cálido para la casa. Frasco ámbar con tapa.",
    imagen: "", personalizable: false },
  { id: "vela-regalo", categoria: "velas", nombre: "Vela personalizada para regalo",
    descripcion: "Etiqueta con nombre o frase. Ideal para cumpleaños y fechas especiales.",
    imagen: "", personalizable: true, colores: ["Blanco", "Rosa", "Azul"] },

  // ---------- CUADERNOS ----------
  { id: "cuaderno-argollado", categoria: "cuadernos", nombre: "Cuaderno argollado personalizado",
    descripcion: "100 hojas, tapa dura con tu nombre o diseño.",
    imagen: "", personalizable: true, destacado: true,
    colores: ["Cuadriculado", "Rayado", "Hojas blancas"] },
  { id: "agenda-2027", categoria: "cuadernos", nombre: "Agenda 2027",
    descripcion: "Planeador semanal y mensual con portada personalizada.",
    imagen: "", personalizable: true },
  { id: "libreta-bolsillo", categoria: "cuadernos", nombre: "Libreta de bolsillo",
    descripcion: "Tamaño A6, ideal para notas rápidas. Paquete x2.",
    imagen: "", personalizable: false },

  // ---------- PAPELERÍA ----------
  { id: "stickers", categoria: "papeleria", nombre: "Plancha de stickers",
    descripcion: "Stickers troquelados con diseños propios o los tuyos.",
    imagen: "", personalizable: true },
  { id: "tarjetas", categoria: "papeleria", nombre: "Tarjetas de regalo x10",
    descripcion: "Tarjetas impresas con mensaje para tus detalles.",
    imagen: "", personalizable: true },
  { id: "kit-marcadores", categoria: "papeleria", nombre: "Kit de marcadores pastel",
    descripcion: "6 resaltadores en tonos pastel.",
    imagen: "", personalizable: false },

  // ---------- VASOS ----------
  { id: "mug-ceramica", categoria: "vasos", nombre: "Mug de cerámica personalizado",
    descripcion: "11 oz, impresión con foto, nombre o frase.",
    imagen: "", personalizable: true, destacado: true,
    colores: ["Blanco", "Negro interior", "Mágico (cambia con el calor)"] },
  { id: "vaso-vidrio", categoria: "vasos", nombre: "Vaso de vidrio con tapa y pitillo",
    descripcion: "16 oz, vinilo personalizado con tu nombre.",
    imagen: "", personalizable: true },
  { id: "termo", categoria: "vasos", nombre: "Termo en acero",
    descripcion: "500 ml, mantiene frío y caliente. Grabado personalizado.",
    imagen: "", personalizable: true, colores: ["Negro", "Blanco", "Rosa", "Azul"] },

  // ---------- CAMISAS ----------
  { id: "camiseta-estampada", categoria: "camisas", nombre: "Camiseta estampada",
    descripcion: "Algodón 100 %, estampado con tu diseño o frase.",
    imagen: "", personalizable: true, destacado: true,
    tallas: ["S", "M", "L", "XL"], colores: ["Blanco", "Negro", "Gris"] },
  { id: "camiseta-nino", categoria: "camisas", nombre: "Camiseta para niño",
    descripcion: "Algodón suave, estampado con nombre o personaje.",
    imagen: "", personalizable: true,
    tallas: ["2", "4", "6", "8", "10", "12"], colores: ["Blanco", "Azul", "Rosa"] },
  { id: "camiseta-grupo", categoria: "camisas", nombre: "Camisetas para grupos y eventos",
    descripcion: "Precio por unidad desde 10 camisetas. Cotiza tu evento.",
    imagen: "", personalizable: true,
    tallas: ["S", "M", "L", "XL"] },

  // ---------- ROPA ----------
  { id: "buzo-capota", categoria: "ropa", nombre: "Buzo con capota",
    descripcion: "Perchado por dentro, estampado o bordado.",
    imagen: "", personalizable: true,
    tallas: ["S", "M", "L", "XL"], colores: ["Negro", "Gris", "Beige"] },
  { id: "gorra", categoria: "ropa", nombre: "Gorra bordada",
    descripcion: "Gorra ajustable con bordado de tu logo o iniciales.",
    imagen: "", personalizable: true, colores: ["Negro", "Blanco", "Azul"] },
  { id: "tote-bag", categoria: "ropa", nombre: "Bolso tote en lona",
    descripcion: "Lona resistente con estampado personalizado.",
    imagen: "", personalizable: true }
];
