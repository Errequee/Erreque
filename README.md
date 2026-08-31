# Taller Libre — herramientas DTF gratis

Suite de 13 herramientas para impresión DTF, serigrafía y vinil de corte. Corre entera
en el navegador: sin cuenta, sin suscripción, sin marcas de agua y sin subir archivos a
ningún servidor. No hay backend porque no hace falta — todo el proceso de imagen ocurre
en tu equipo con Canvas y JavaScript.

## Las herramientas

**Limpieza de recortes**

| Herramienta | Qué hace |
|---|---|
| Eliminar fondos | Varita por color (tolerancia y zona conectada) más pinceles de borrar y restaurar. |
| Reducir bordes | Contrae o expande el contorno con precisión subpíxel, quita el halo del recorte y limpia motas y huecos. |
| Quitar semitransparencias | Convierte el alfa parcial —que la impresora no puede imprimir— en sólido o transparente. Incluye diagnóstico en magenta. |

**Preparación del arte**

| Herramienta | Qué hace |
|---|---|
| Mejorar y ampliar | Remuestreo progresivo hasta 4×, máscara de enfoque, mediana para ruido de JPG y ajuste de color. |
| Vectorizar y separar colores | Cuantiza con k-medias, traza el contorno real de cada tinta y exporta SVG, PNG y un ZIP con la separación por capas. |
| Redimensionar | Tamaño en cm o pulgadas con DPI grabados en el PNG (chunk `pHYs`), y encuadre ajustar/rellenar/estirar. |
| Conversor de formatos | PNG, JPG y WEBP con calidad, límite de tamaño y aplanado de fondo. |

**Efectos de impresión**

| Herramienta | Qué hace |
|---|---|
| Semitonos y desvanecidos | Trama de puntos con ángulo, forma y grosor; degradados que se disuelven en puntos sólidos; separación CMYK con los ángulos clásicos. |
| Marcos y grunge | Desgaste con ruido fractal (todo el diseño o solo el contorno), textura sucia y marcos. |

**Producción**

| Herramienta | Qué hace |
|---|---|
| Hojas de impresión | Acomoda varios diseños en el rollo por estanterías de altura, mide el metraje y exporta el PNG a los DPI reales. |
| Mockups | Camiseta y tote dibujados por código, o tu propia foto, con sombra y textura de tela recortadas a la prenda. |
| Calculadora de precios | Costo real por pieza (film, tinta, polvo, mano de obra, merma) y precio de venta. Guarda tus valores. |
| Medidas estándar | Tamaños por talla, colocaciones, referencia de plancha y conversor de cm a píxeles. |

## Cómo usarlo

Abre `index.html`. Nada más — funciona desde el disco (`file://`) y sin conexión.

Para publicarlo, sube el repositorio a cualquier hosting estático (GitHub Pages,
Netlify, Cloudflare Pages) o levántalo en local:

```sh
npm run serve      # http://localhost:8080
```

También hay una versión de un solo archivo, útil para pasarla por USB o WhatsApp:

```sh
npm run build      # genera dist/taller-libre.html con todo dentro
```

## Cómo está hecho

Sin dependencias, sin compilación, sin frameworks. JavaScript clásico con un espacio
de nombres global, por eso funciona igual servido que abierto desde el disco.

```
index.html               cascarón: fuentes, estilos y orden de carga
assets/css/app.css       sistema visual y los tres estados de tema (claro, oscuro, del sistema)
assets/js/imglib.js      proceso de imagen: distancia euclídea exacta, desenfoque de caja,
                         k-medias, trazado de contornos, ruido fractal
assets/js/core.js        registro de herramientas, enrutado por hash, visor con zoom y
                         comparación, controles, exportación, ZIP y DPI en PNG
assets/js/tools/*.js     una herramienta por archivo
build.py                 empaqueta todo en un solo HTML
test/smoke.js            prueba de humo en Chromium
```

Algunas decisiones que vale la pena conocer:

- **Contraer el contorno usa un campo de distancia con signo**, no una erosión por
  vecinos. Sale del algoritmo exacto de Felzenszwalb y Huttenlocher, así que admite
  radios fraccionarios y bordes suaves sin escalones.
- **El desvanecido en puntos** calcula el radio como `0,708 × celda × √cobertura`. Con
  cobertura 1 los círculos cubren exactamente la celda, así que la zona sólida queda
  sólida de verdad y la transición no deja alfa parcial.
- **La vista previa trabaja a 1500 px como máximo** y escala los parámetros que están en
  píxeles. La descarga siempre se calcula a resolución completa.
- **El vectorizador traza las aristas reales del píxel** y encadena bucles cerrados, con
  regla `evenodd` para que los huecos salgan bien sin lógica aparte.

### Añadir una herramienta

Crea `assets/js/tools/mi-herramienta.js`, regístrala y añade la etiqueta `<script>` en
`index.html`. Para una herramienta que transforma una imagen basta con declarar los
controles y una función `process`:

```js
NV.register({
  slug: 'mi-herramienta',
  name: 'Mi herramienta',
  group: 'Efectos de impresión',
  tagline: 'Lo que hace, en una línea.',
  icon: NV.svg('<circle cx="12" cy="12" r="8"/>'),
  controls: [
    { k: 'range', id: 'fuerza', label: 'Fuerza', min: 0, max: 100, step: 1, def: 50, unit: ' %' }
  ],
  process: function (c) {
    return IM.adjust(c.src, { contrast: c.p.fuerza });
  }
});
```

El resto —zona de carga, visor, comparación, descarga— lo pone el núcleo. Para algo que
no encaje en «entra una imagen, sale una imagen», usa `kind: 'custom'` y `render(host)`.

## Pruebas

```sh
npm install
npm test
```

Abre las 13 herramientas en Chromium, carga imágenes de prueba generadas al vuelo, mueve
todos los deslizadores, alterna los segmentos y las casillas, y falla si aparece
cualquier error de consola.

## Privacidad

No hay servidor, ni analítica, ni peticiones de red salvo las fuentes de Google (que
caen a las del sistema si no hay conexión). Los archivos que abres no salen de tu
navegador.

## Independencia

Proyecto propio, sin afiliación ni relación con ninguna tienda o suite comercial. Las
herramientas se escribieron desde cero.
