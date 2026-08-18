# Guía Rápida: Configuración de WhatsApp Business Cloud API en Meta para Casa Malva

Esta guía te explica cómo asociar tu tarjeta, obtener tus credenciales oficiales de Meta y poner a funcionar los mensajes reales de WhatsApp en 5 minutos.

---

## Paso 1: Acceder a Meta for Developers
1. Entra a [https://developers.facebook.com](https://developers.facebook.com) con tu cuenta de Facebook/Meta.
2. Ve a **Mis Apps (My Apps)** -> Haz clic en **Crear App (Create App)**.
3. Selecciona el tipo de caso de uso: **"Conectar con clientes a través de WhatsApp" (Connect with customers through WhatsApp / Business)**.
4. Asígnale el nombre: `Casa Malva - Reservas` o `MeJorÍA WhatsApp`.

---

## Paso 2: Obtener el Phone Number ID y Token de Prueba
1. En el menú lateral izquierdo de tu app, haz clic en **WhatsApp** -> **Comenzar (API Setup)**.
2. En la sección **"Enviar y recibir mensajes"**, verás:
   - **Identificador de número de teléfono (Phone Number ID):** Un número largo de ~15 dígitos (ej. `104928374928374`).
   - **Identificador de cuenta de WhatsApp Business (WABA ID):** (ej. `102938475628192`).
   - **Token de acceso temporal (Temporary Access Token):** Un token largo que empieza por `EAAG...`.
3. En la casilla **"Para" (To)**, añade tu número de celular personal (`+57 300 670 7219`) y presiona enviar mensaje de prueba desde Meta para que tu número quede autorizado para recibir pruebas.

---

## Paso 3: Configurar tus Variables en `.env.local`
Abre el archivo `d:\MeJorIA\Proyectos\casa-malva\.env.local` y agrega:

```env
# WhatsApp Business Cloud API (Meta)
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id_aqui
WHATSAPP_ACCESS_TOKEN=tu_access_token_aqui
WHATSAPP_BUSINESS_ACCOUNT_ID=tu_waba_id_aqui
```

---

## Paso 4: Asociar tu Tarjeta y Generar Token Permanente (System User)
1. Para que el token nunca expire, en tu **Meta Business Suite** ve a:
   **Configuración del Negocio** -> **Usuarios del Sistema (System Users)**.
2. Crea un usuario del sistema (ej. `Admin-MeJorIA`) con rol de Administrador.
3. Haz clic en **"Generar nuevo token"**, selecciona tu App y marca los permisos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. En **Cuentas de WhatsApp** -> **Métodos de Pago**, añade tu tarjeta de crédito para el consumo de mensajes transaccionales (~$3 COP por cita).

---

## Paso 5: Probar desde Casa Malva
1. Abre [http://localhost:3000/admin/agente](http://localhost:3000/admin/agente).
2. Verás el indicador verde **"Meta Cloud API Conectada"**.
3. Presiona el botón **"Disparar Mensaje de Prueba"** y recibirás el WhatsApp oficial al instante en tu celular.
