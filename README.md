# 📍 WooCommerce Geo Delivery Cost

Un plugin para WordPress/WooCommerce que calcula dinámicamente el costo de envío basándose en la distancia real (en kilómetros) entre la ubicación de tu tienda y la dirección de entrega exacta seleccionada por el cliente mediante un mapa interactivo en el Checkout.

---

## 🚀 Características Principales

* **Cálculo de Envío por Distancia Real:** Utiliza la fórmula del semiverseno (Haversine) para calcular la distancia exacta en línea recta entre las coordenadas de la tienda y el cliente.
* **Mapa Interactivo en Checkout:** Agrega un mapa en la página de finalizar compra donde los clientes deben mover un marcador (pin) para especificar su punto de entrega exacto.
* **Múltiples Proveedores de Mapas:** Soporta **Leaflet (OpenStreetMap)** (gratuito y sin necesidad de API keys) y **Google Maps**.
* **Estructura de Precios Flexible:** Configurable a nivel de *Zona de Envío* de WooCommerce. Permite definir:
  * Radio base de entrega (KM incluidos en el precio base).
  * Costo base del envío.
  * Costo adicional por cada KM extra fuera del radio base.
* **Campo de Referencias Obligatorio:** Asegura que los repartidores tengan instrucciones claras sobre cómo encontrar el domicilio.
* **Integración Nativa con Pedidos:** Guarda la Latitud, Longitud y Referencias como metadatos del pedido (`order_meta`).
* **Panel de Administración:** En la vista del pedido en WooCommerce, muestra las referencias y un enlace directo a Google Maps con la ubicación exacta del cliente.

---

## 🛠️ Requisitos

* WordPress 5.0 o superior.
* WooCommerce 4.0 o superior.
* (Opcional) Clave API de Google Maps si decides no utilizar Leaflet.

---

## 📦 Instalación

1. Descarga el repositorio o comprime la carpeta `woocommerce-geo-delivery-cost` en un archivo `.zip`.
2. Ve al panel de administración de tu WordPress.
3. Navega a **Plugins > Añadir nuevo > Subir plugin**.
4. Selecciona el archivo `.zip` y haz clic en "Instalar ahora".
5. **Activa** el plugin.

---

## ⚙️ Configuración

### 1. Configuración Global (Ubicación de la tienda)
1. Ve a **WooCommerce > Ajustes > Geo Delivery**.
2. Selecciona tu proveedor de mapas preferido (Leaflet o Google Maps).
3. Si seleccionas Google Maps, ingresa tu API Key.
4. Ingresa las coordenadas de tu tienda (**Latitud** y **Longitud**). Puedes obtenerlas haciendo clic derecho sobre tu ubicación en Google Maps.
5. Guarda los cambios.

### 2. Configurar el Método de Envío
1. Ve a **WooCommerce > Ajustes > Envío**.
2. Selecciona o crea una **Zona de envío**.
3. Haz clic en **Añadir método de envío** y selecciona **Envío por Geolocalización**.
4. Edita el método recién creado para definir:
   * **Título:** El nombre que verá el cliente (Ej. "Envío a Domicilio").
   * **Radio Base (KM):** La distancia que cubrirá el costo inicial.
   * **Costo Base ($):** El valor a cobrar dentro de ese radio.
   * **Costo Extra por KM Adicional ($):** Lo que se sumará por cada kilómetro fuera del radio base.

---

## 💻 Detalles Técnicos para Desarrolladores

* **AJAX Seguro:** Las actualizaciones de coordenadas se realizan de forma asíncrona mediante el endpoint nativo `admin-ajax.php`, protegidas por *nonces* de seguridad, previniendo errores de caché y *race conditions* durante el renderizado del checkout.
* **Sincronización de Estado:** Se previene la herencia de sesiones limpiando explícitamente `WC()->session->get('wcgdc_lat')` justo después de registrar el pedido.
* **Dependencias Controladas:** Los scripts del SDK del mapa se cargan encolados con las dependencias correctas para evitar errores si el DOM del checkout es modificado dinámicamente por otros plugins (bloqueo UI mediante la librería estándar de WooCommerce).

---

## 📄 Licencia

Este proyecto es software de código abierto.
