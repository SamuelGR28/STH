# STH – Multitienda creativa

Página de ventas de STH: velas, cuadernos, papelería, vasos personalizados, camisas y ropa.

Es una página estática (HTML, CSS y JavaScript) publicada gratis con **GitHub Pages**. Las cuentas de clientes y los precios usan **Firebase** (plan gratuito).

## Qué tiene

- **Sectores**: Velas, Cuadernos, Papelería, Vasos personalizados, Camisas y Ropa.
- **Catálogo** con filtro por sector, buscador y orden por precio o nombre.
- **Cuentas de clientes**: registro e inicio de sesión con correo. Los precios solo se ven con sesión iniciada.
- **Administración** (`admin.html`): el dueño cambia los precios sin tocar código.
- **Ficha de producto** con talla, color y texto para personalizar.
- **Carrito** que se guarda en el navegador del cliente.
- **Pedido por WhatsApp**: el carrito arma un mensaje con productos, cantidades, total y datos del cliente.
- Diseño adaptable a celular, tableta y computador.
- Enlace directo a cada sector, por ejemplo `?sector=velas#catalogo`.

## Estructura

```
index.html          Página principal
admin.html          Edición de precios (solo administradores)
firestore.rules     Reglas de seguridad de Firebase
css/styles.css      Diseño y colores
js/config.js        Datos de la tienda: WhatsApp, redes, logo, Firebase
js/productos.js     Sectores y productos (sin precios)
js/auth.js          Cuentas y lectura de precios (no hace falta editarlo)
js/admin.js         Lógica de admin.html
js/app.js           Lógica de la tienda (no hace falta editarlo)
img/                Logo
img/productos/      Fotos de productos
server.js           Servidor local para probar (opcional)
```

## Tareas comunes

### Cambiar el número de WhatsApp y los contactos

Abre `js/config.js` y cambia `whatsapp`. Escribe el número con el indicativo del país, sin `+` ni espacios. Ejemplo para Colombia: `573001234567`.

En ese mismo archivo están Instagram, Facebook, correo, ciudad y horario.

### Poner el logo

1. Guarda el logo en `img/`, por ejemplo `img/logo.png`.
2. En `js/config.js`, cambia `logo: ""` por `logo: "img/logo.png"`.

### Agregar o cambiar un producto

1. Guarda la foto en `img/productos/`, por ejemplo `img/productos/vela-coco.jpg`. Usa fotos cuadradas o 4:3 de menos de 300 KB.
2. Abre `js/productos.js`, copia un producto existente y cambia sus datos:

```js
{ id: "vela-coco", categoria: "velas", nombre: "Vela de coco",
  descripcion: "Cera de soya, 200 g.",
  imagen: "img/productos/vela-coco.jpg",
  personalizable: false, destacado: false },
```

- `id`: único, sin espacios ni tildes.
- `categoria`: uno de `velas`, `cuadernos`, `papeleria`, `vasos`, `camisas`, `ropa`.
- El precio no va aquí: se pone en `admin.html` (ver más abajo).
- `tallas` y `colores`: opcionales, por ejemplo `tallas: ["S", "M", "L"]`.
- `destacado: true`: lo muestra en "Lo más pedido" (máximo 4).

Para quitar un producto, borra su bloque `{ ... },`.

### Agregar un sector nuevo

1. En `js/productos.js`, agrega una línea en `STH_SECTORES`, por ejemplo `{ id: "regalos", nombre: "Regalos", descripcion: "Cajas y detalles." }`.
2. En `css/styles.css`, agrega su color en `:root`: `--c-regalos: #f5d5c8;`.

### Cambiar los colores de la marca

Edita las variables al inicio de `css/styles.css` (`--accent`, `--bg`, `--ink`, etc.).

## Probar en tu computador

Con [Node.js](https://nodejs.org) instalado:

```
node server.js
```

Luego abre http://localhost:3000.

## Publicar gratis con GitHub Pages

1. En GitHub, abre el repositorio y ve a **Settings > Pages**.
2. En **Source**, elige **Deploy from a branch**.
3. Elige la rama `main` y la carpeta `/ (root)`. Pulsa **Save**.
4. En uno o dos minutos la página queda en `https://<tu-usuario>.github.io/<nombre-del-repo>/`.

Cada cambio que subas a `main` se publica solo.

## Cuentas de clientes y precios (Firebase)

Los precios **no** están en el código de la página, porque el código es público. Se guardan en Firebase y solo se entregan a usuarios con sesión iniciada. Las reglas de `firestore.rules` lo garantizan.

### Configurar Firebase (una sola vez, unos 10 minutos)

1. Entra a https://console.firebase.google.com con tu cuenta de Google y pulsa **Crear un proyecto**. Puedes desactivar Google Analytics.
2. **Activar el registro con correo:** menú **Compilación > Authentication > Comenzar**. En **Método de acceso**, activa **Correo electrónico/contraseña** y guarda.
3. **Autorizar el dominio:** en **Authentication > Configuración > Dominios autorizados**, agrega `samuelgr28.github.io`. (`localhost` ya viene incluido).
4. **Crear la base de datos:** menú **Compilación > Firestore Database > Crear base de datos**. Elige una ubicación (por ejemplo `southamerica-east1`) y **modo de producción**.
5. **Reglas de seguridad:** en Firestore, pestaña **Reglas**. Borra lo que hay, pega todo el contenido de `firestore.rules`, cambia `correo-del-dueno@ejemplo.com` por tu correo y pulsa **Publicar**.
6. **Conectar la página:** en **Configuración del proyecto** (ícono de engranaje) > **Tus apps**, pulsa el ícono web `</>`, ponle un nombre y registra la app. Copia los valores de `firebaseConfig` en `js/config.js`, dentro de `firebase: { ... }`.
7. En `js/config.js`, cambia `administradores` por tu correo (el mismo del paso 5).
8. Sube los cambios a GitHub.

Los datos de `firebaseConfig` (como `apiKey`) son públicos por diseño. La seguridad la dan las reglas del paso 5.

### Poner o cambiar precios

1. En la tienda, pulsa **Ingresar > Crear cuenta** y regístrate con el correo de administrador.
2. Abre el correo de verificación que te llega y confirma tu cuenta. Revisa también spam.
3. Cierra sesión y vuelve a ingresar, para que Firebase reconozca la verificación.
4. Abre `https://samuelgr28.github.io/STH/admin.html` (o **Mi cuenta > Administrar precios**).
5. Escribe los precios y pulsa **Guardar precios**. Los clientes los ven al instante.

Un producto sin precio muestra "Consultar".

### Ver los clientes registrados

- Cuentas: **Authentication > Usuarios**.
- Nombre y celular: **Firestore Database > usuarios**.
