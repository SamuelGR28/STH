# SJTS – Multitienda creativa

Página de ventas de SJTS: velas, cuadernos, papelería, vasos personalizados, camisas y ropa.

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

Cuando un cliente envía un pedido por WhatsApp, la tienda descuenta esas unidades y lo registra como **Pedido web** con el nombre, correo y celular del cliente. Es informativo: si el pedido no se concreta, registra una **Entrada** para devolver las unidades.

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
4. Abre `https://samuelgr28.github.io/STH/admin.html` (o **Mi cuenta > Administrar tienda**).
5. Escribe los precios y pulsa **Guardar precios**. Los clientes los ven al instante.

Un producto sin precio muestra "Consultar".

### Ver los clientes registrados

- Cuentas: **Authentication > Usuarios**.
- Nombre y celular: **Firestore Database > usuarios**.
