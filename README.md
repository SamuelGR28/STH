# STH – Multitienda creativa

Página de ventas de STH: velas, cuadernos, papelería, vasos personalizados, camisas y ropa.

Es una página estática (HTML, CSS y JavaScript). No necesita base de datos ni servidor de pago y se puede publicar gratis con **GitHub Pages**.

## Qué tiene

- **Sectores**: Velas, Cuadernos, Papelería, Vasos personalizados, Camisas y Ropa.
- **Catálogo** con filtro por sector, buscador y orden por precio o nombre.
- **Ficha de producto** con talla, color y texto para personalizar.
- **Carrito** que se guarda en el navegador del cliente.
- **Pedido por WhatsApp**: el carrito arma un mensaje con productos, cantidades, total y datos del cliente.
- Diseño adaptable a celular, tableta y computador.
- Enlace directo a cada sector, por ejemplo `?sector=velas#catalogo`.

## Estructura

```
index.html          Página principal
css/styles.css      Diseño y colores
js/config.js        Datos de la tienda: WhatsApp, redes, logo
js/productos.js     Sectores y productos
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
  precio: 29000, imagen: "img/productos/vela-coco.jpg",
  personalizable: false, destacado: false },
```

- `id`: único, sin espacios ni tildes.
- `categoria`: uno de `velas`, `cuadernos`, `papeleria`, `vasos`, `camisas`, `ropa`.
- `precio`: número sin puntos ni `$`.
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
