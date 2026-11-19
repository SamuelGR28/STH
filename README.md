# SJTS – Multitienda creativa

Página de ventas de SJTS: velas, cuadernos, papelería, vasos personalizados, camisas y ropa.

Es una página estática (HTML, CSS y JavaScript) publicada gratis con **GitHub Pages**. Las cuentas de clientes y los precios usan **Firebase** (plan gratuito).

## Qué tiene

- **Sectores**: Velas, Cuadernos, Papelería, Vasos personalizados, Camisas y Ropa.
- **Catálogo** con filtro por sector, buscador y orden por precio o nombre.
- **Sin registro de clientes**: cualquiera ve los precios y pide escribiendo solo su nombre y celular. Cada visitante recibe una sesión anónima automática, que permite llevar control de pedidos y carritos sin pedirle una cuenta.
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

### Agregar, editar o quitar productos

Se hace desde la página de administración, sin tocar código:

1. Abre `admin.html` (o **Mi cuenta > Administrar tienda**) e ingresa con un correo de administrador.
2. En la pestaña **Productos**:
   - **+ Agregar producto**: nombre, sector, precio, descripción, foto, tallas, colores y opciones.
   - **Editar**: cambia cualquier dato o la foto.
   - **Eliminar**: pulsa dos veces para confirmar.
3. Los cambios se ven en la tienda al recargarla.

La foto se reduce sola a 800 px y se guarda en Firebase. No hace falta subirla a GitHub.

`js/productos.js` solo tiene los productos de ejemplo. La tienda los muestra hasta que hagas el primer cambio en **Productos**. En ese momento se copian a Firebase, y desde entonces se ignora el archivo.

### Fotos de la portada

En `admin.html`, pestaña **Portada**, puedes cambiar los 4 recuadros que aparecen junto al título de la tienda:

- **Subir foto / Cambiar foto**: la foto se reduce sola y se recorta a la forma del recuadro. Funcionan mejor las fotos cuadradas con el producto centrado.
- **Quitar**: vuelve a mostrar la ilustración.

### Carritos abandonados (recordatorio)

- **En la tienda:**
  - Si un cliente vuelve más de 30 minutos después con productos en el carrito, le sale el aviso "Tienes N productos esperando en tu carrito" con el botón **Ver carrito**.
  - Si cambia de pestaña, el título dice "🛒 ¡Olvidaste algo en tu carrito!".
- **El carrito del visitante se guarda en Firebase.** Si escribió su nombre y celular, aparece con esos datos en admin.
- **En `admin.html`, pestaña Carritos:**
  - Lista a los clientes que dejaron productos hace más de 1 hora sin enviar el pedido.
  - **Recordar por WhatsApp** abre WhatsApp con el mensaje ya escrito para ese cliente: solo tienes que pulsar enviar.
  - También existe **Recordar por correo**.
  - Queda marcado cuándo se recordó.

El envío no es 100 % automático: mandar mensajes solos sin que nadie pulse enviar requiere un servidor (plan Blaze de Firebase) o la API de WhatsApp Business, que son de pago.

### Inventario

En `admin.html`, pestaña **Inventario**:

- Arriba ves el resumen: unidades totales, productos con control, productos por agotarse (3 o menos) y agotados.
- **− / +**: resta o suma 1 unidad al instante.
- **Movimiento**:
  - **Entrada**: llegó mercancía.
  - **Salida**: venta en local, daño, regalo…
  - **Conteo**: fija el número exacto después de contar.
  - **Sin control**: el producto es por encargo y no tiene límite de unidades.
- **Historial de movimientos**: cada cambio queda registrado con fecha, cantidad, unidades que quedan, nota y quién lo hizo.

### Pedidos (token)

Cada pedido que un cliente envía por WhatsApp se guarda con un código, por ejemplo `SJTS-7K3Q9P`. El código va en el mensaje de WhatsApp y el pedido queda **pendiente**: todavía no descuenta nada del inventario.

En `admin.html`, pestaña **Pedidos**:

- Filtros: Pendientes, Comprados, No comprados y Todos. También se puede buscar por token, nombre, correo o celular.
- **✓ Compró · descontar**: el pedido queda como comprado y sus unidades salen del inventario. En el historial queda como "Pedido comprado".
- **✗ No compró**: el pedido se cierra sin tocar el inventario.
- **Anular compra**: si un pedido comprado se cae, devuelve las unidades al inventario.
- **Volver a pendiente**: reabre un pedido marcado como no comprado.

Cada botón pide confirmación con un segundo clic.

### Agregar, editar, ordenar o quitar sectores

En `admin.html`, pestaña **Sectores**:

- **+ Agregar sector**: nombre, descripción corta, color de fondo e ilustración.
- **Editar**: cambia cualquiera de esos datos.
- **↑ ↓**: cambia el orden en que aparecen en la tienda.
- **Eliminar**: pulsa dos veces para confirmar. Solo se puede eliminar un sector sin productos. Primero mueve sus productos a otro sector (Productos > Editar) o elimínalos.

Los sectores de `js/productos.js` son solo de ejemplo. Se usan hasta el primer cambio en **Sectores**. Las ilustraciones disponibles están en `js/iconos.js`.

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

## Firebase: precios, pedidos y acceso

Los clientes **no se registran**. La tienda usa el **acceso anónimo** de Firebase: cada visitante recibe automáticamente una sesión invisible, sin correo ni contraseña. Con esa sesión puede ver precios, guardar su carrito y enviar pedidos con token. Las reglas de `firestore.rules` impiden que cambie productos, precios o inventario.

Solo los administradores entran con correo y contraseña, en `admin.html`.

### Configurar Firebase (una sola vez)

1. Entra a https://console.firebase.google.com y crea un proyecto.
2. **Authentication > Método de acceso**: activa **Correo electrónico/contraseña** (para los administradores) y **Anónimo** (para los visitantes).
3. **Authentication > Configuración > Dominios autorizados**: agrega `samuelgr28.github.io`. `localhost` ya viene incluido.
4. **Firestore Database > Crear base de datos**: ubicación `southamerica-east1`, en **modo de producción**.
5. **Firestore > Reglas**: pega todo `firestore.rules` y pulsa **Publicar**. Los correos de administrador deben ser los mismos de `js/config.js` > `administradores`.
6. **Configuración del proyecto > Tus apps > Web `</>`**: copia `firebaseConfig` en `js/config.js`.

Los datos de `firebaseConfig` (como `apiKey`) son públicos por diseño. La seguridad la dan las reglas.

### Crear la cuenta de un administrador

1. Firebase > **Authentication > Usuarios > Agregar usuario**: correo y contraseña.
2. Agrega ese correo en `js/config.js` (`administradores`) y en `firestore.rules` (`esAdmin`), y publica las reglas.
3. El administrador entra en `https://samuelgr28.github.io/STH/admin.html`. También hay un enlace **Administrar** al pie de la tienda.

### Poner o cambiar precios

En `admin.html`, pestaña **Precios**. Un producto sin precio muestra "Consultar".
