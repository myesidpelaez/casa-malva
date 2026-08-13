# Spec 23 — Informe de avance para el cliente

- **Estado:** aprobado para implementar
- **Arquitecto:** `ClaudeCode/claude-opus-5` · **Implementa:** `Antigravity/gemini-3.6-flash`
- **Fecha:** 2026-08-13
- **Encargo de Mario:** *"un artefacto muy pedagógico… para explicarle a nuestros clientes el
  progreso del proyecto… que puedan entender cómo funciona el proyecto que nos está comprando"*

---

## 1. Qué es esto y qué no es

Es **el documento que MeJorÍA le entrega a un cliente** para que entienda qué compró, en qué va
y por qué puede confiar en ello. Casa Malva es el primer caso; el formato se reutiliza.

**No es** un resumen técnico traducido. Es un documento distinto, con otra audiencia y otro
objetivo. La materia prima está en `D:\MEMORIA\01-PROYECTOS\spa-demo\que-paso-en-casa-malva.md`,
pero **no se copia**: se traduce.

### Quién lo lee

**La dueña de un estudio de belleza en Medellín.** No sabe programar y no tiene por qué. Sabe
perfectamente qué le duele: que una clienta se quede sin cupo, que dos lleguen a la misma hora,
que el teléfono no pare de sonar para agendar.

Escribe **para ella**, no para su sobrino que estudia sistemas.

## 2. La regla editorial

> **Cada cosa que se afirme tiene que significar algo para su negocio.**

Prueba de una frase: si al leerla ella no puede decir *"ah, eso me sirve"* o *"ah, eso me
habría costado plata"*, sobra.

| En vez de… | Escribe… |
|---|---|
| "Migramos a Cloud Firestore con transacciones atómicas" | "Su agenda vive en los servidores de Google. Si dos clientas piden la misma hora en el mismo segundo, solo una la consigue — y a la otra el sistema le ofrece alternativas al instante" |
| "Corregimos el manejo de zona horaria" | "Las horas que ve su clienta son las horas de Medellín, siempre. Aunque el servidor esté en otro país" |
| "Optimizamos las lecturas de Firestore" | "El costo de operar su agenda no crece cuando crece su negocio. Con 10.000 citas cuesta lo mismo que con 10" |

**Toda idea técnica va con una analogía cotidiana.** Las que ya funcionaron y puedes reusar:
el cuaderno de citas, el candado de la puerta, el bibliotecario que saca todos los libros del
estante para saber si uno está prestado.

## 3. Lo que NO entra — leer dos veces

Esto no es pudor: es que **incluirlo daña la confianza sin informar de nada**.

| Prohibido | Por qué |
|---|---|
| **Nombres de agentes y sus fallos** | Al cliente le compra MeJorÍA. Que un agente renumerara unos gates es asunto interno |
| **Detalle de un fallo de seguridad** | Se dice *"se encontró y se cerró antes de salir a producción"*. **Nunca** cómo se explotaba. Publicar la receta es irresponsable aunque esté arreglado |
| **El incidente de datos borrados en el demo** | Fue en datos de maqueta y quedó reparado. Contarlo asusta sin enseñar nada |
| **Rutas, credenciales, nombres de archivo, comandos** | Nada de `src/lib/db.ts` ni `npm run verificar` |
| **Cifras inventadas de ROI o de ahorro** | Si no está medido, no se escribe. Ni una |

**Y lo que tampoco entra: exageración.** Nada de "sistema de clase mundial" ni "arquitectura de
última generación". El documento convence por lo concreto, no por los adjetivos.

## 4. Cómo se habla de los problemas encontrados

Esta es la parte delicada, y la que decide si el documento suma o resta.

Se encontraron 17 defectos **en una revisión propia, antes de que llegaran a una clienta real**.
Eso, bien contado, es **el mejor argumento de venta que tiene MeJorÍA**: no que el código salga
perfecto a la primera —eso no le pasa a nadie— sino que **hay un proceso que los caza**.

**El marco correcto:**

> "Todo software tiene defectos. La diferencia está en si alguien los busca antes que su
> clienta. En este proyecto revisamos nuestro propio trabajo línea por línea y encontramos 17.
> Los que podían afectar a su negocio están cerrados y comprobados. Aquí está la lista."

**El marco incorrecto**, y no lo uses:

- Ocultarlos → cuando aparezca uno, no habrá crédito.
- Regodearse en ellos → "casi la cagamos" no da confianza.
- Enumerarlos sin decir qué significaban → una lista de 17 tecnicismos asusta.

**Agrupa por consecuencia de negocio**, no por tipo técnico. Tres grupos bastan:

1. **Le habría costado citas** (el reloj corrido, la agenda que ofrecía horas y luego las negaba)
2. **Le habría costado dinero** (el costo que crecía con la historia)
3. **Le habría costado confianza** (datos de sus clientas que debían estar cerrados)

## 5. Estructura del documento

Seis secciones. Ni una más.

1. **Qué tiene hoy, funcionando** — con el enlace público. Lo primero es lo que ya puede tocar.
2. **Cómo funciona, en cinco minutos** — el recorrido de una clienta desde que entra hasta que
   queda agendada, y qué ve ella en el panel. Con una analogía por concepto.
3. **Qué revisamos y qué encontramos** — §4. Honesto, agrupado por consecuencia.
4. **Qué le cuesta tener esto en línea** — hoy **cero**: escala a cero y la capa gratuita de
   Google lo cubre. Y por qué seguirá siendo barato cuando crezca. *(Solo cifras medidas.)*
5. **Cómo sabemos que funciona** — que hay comprobaciones automáticas que corren antes de cada
   entrega, y que **quien construye no es quien aprueba**. En dos párrafos, sin nombres.
6. **Qué sigue** — lo próximo, en su idioma: agenda por WhatsApp, recordatorios, publicidad.

## 6. Formato

Un **HTML autocontenido**: `docs/informe-cliente/casa-malva.html`.

- Todo dentro del archivo: estilos en `<style>`, sin CDN, sin fuentes externas, sin `<script>`.
  Tiene que abrirse con doble clic y verse igual en el portátil de Mario y en el celular de la
  clienta, con o sin internet.
- **Responsive de verdad.** Se va a leer en un celular, en una mesa de café.
- Sobrio y legible: fondo claro, buen contraste, tipografía de sistema, columna de lectura
  cómoda (~70 caracteres). Puedes tomar la paleta malva del proyecto
  (`docs/specs/10-sistema-diseno.md`) para que se sienta de la misma familia.
- **Imprimible**: que un `Ctrl+P` produzca algo presentable, porque va a acabar en PDF.
- Sin logos ni marcas de terceros. Sin imágenes externas.

## 7. Además: la plantilla reutilizable

El mismo archivo, con el contenido de Casa Malva sustituido por marcadores claros
(`{{NOMBRE_DEL_NEGOCIO}}`, `{{ENLACE}}`, …), en
`docs/informe-cliente/PLANTILLA.html`, con un comentario arriba explicando qué va en cada
sección y qué **no** puede entrar (§3).

Es lo que hace que el próximo cliente cueste una hora y no un día.

## 8. Gate de terminado

No hay pruebas automáticas para un documento. El gate es de lectura, y son **cinco preguntas
que respondes tú mismo por escrito** en el reporte:

| # | Pregunta |
|---|---|
| G1 | ¿Hay alguna frase que la dueña del spa no entendería sin preguntar? Cítala o escribe "ninguna" |
| G2 | ¿Aparece algún nombre de agente, ruta, comando, credencial o detalle de un fallo de seguridad? |
| G3 | ¿Hay alguna cifra que no esté medida? Cítala o escribe "ninguna" |
| G4 | ¿Se abre con doble clic, sin internet, y se lee bien en un ancho de 375 px? |
| G5 | ¿La sección 3 deja al lector más tranquilo o más nervioso? Justifica |

Además: `npm run verificar` tiene que seguir pasando (no deberías tocar código, pero se comprueba).

## 9. Si el plano está mal

Detente y dilo. Y en esta tarea hay un riesgo particular: **es fácil escribir un folleto de
ventas en vez de un informe.** Si al releerlo te suena a publicidad, está mal. El objetivo es que
la clienta entienda y confíe, no que se impresione.
