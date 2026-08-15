// Gráficos en SVG, sin librerías.
//
// Reglas que se respetan acá y conviene no romper:
//  · un solo eje de valores — nunca dos escalas en el mismo gráfico;
//  · el color sigue a la entidad (el estado de la sesión), no a su posición,
//    así filtrar no repinta lo que quedó;
//  · con dos o más series siempre hay leyenda, para que la identidad no
//    dependa solo del color;
//  · marcas finas, grilla discreta, y 2px de aire entre segmentos apilados;
//  · siempre hay tooltip: un gráfico en pantalla es interactivo.
//
// La paleta pasó las seis validaciones de contraste y daltonismo en claro y
// en oscuro; los valores viven en app/saama.css como --dato-*.

import { crear } from "./formato.js";

const SVG = "http://www.w3.org/2000/svg";
const nodo = (etiqueta, atributos = {}) => {
  const el = document.createElementNS(SVG, etiqueta);
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
  return el;
};

const leerColor = nombre =>
  getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || "#888";

// ---------- Tooltip compartido ----------

let globo;
const asegurarGlobo = () => {
  if (!globo) {
    globo = crear("div", "grafico-globo");
    globo.setAttribute("role", "tooltip");
    document.body.append(globo);
  }
  return globo;
};

const mostrarGlobo = (evento, lineas) => {
  const g = asegurarGlobo();
  g.replaceChildren(...lineas.map(l => {
    if (typeof l === "string") return crear("div", "globo-titulo", l);
    const fila = crear("div", "globo-fila");
    if (l.color) {
      const punto = crear("span", "globo-punto");
      punto.style.background = l.color;
      fila.append(punto);
    }
    fila.append(crear("span", "globo-etiqueta", l.etiqueta), crear("span", "globo-valor", l.valor));
    return fila;
  }));
  g.classList.add("ver");
  const margen = 14;
  const ancho = g.offsetWidth;
  let x = evento.clientX + margen;
  if (x + ancho > window.innerWidth - 8) x = evento.clientX - ancho - margen;
  g.style.left = x + "px";
  g.style.top = (evento.clientY - g.offsetHeight - 10) + "px";
};

const ocultarGlobo = () => globo && globo.classList.remove("ver");

/**
 * Vuelve a dibujar cuando cambia el ANCHO disponible, y solo entonces.
 * Observar el mismo nodo que se redibuja provoca un bucle infinito si se
 * reacciona a cualquier cambio de tamaño: al repintar cambia el alto, eso
 * dispara el observador, que repinta otra vez. Comparando el ancho se corta.
 */
export function alCambiarAncho(nodo, dibujar) {
  let anchoPrevio = 0;
  const observador = new ResizeObserver(entradas => {
    const ancho = Math.round(entradas[0].contentRect.width);
    if (ancho === anchoPrevio || ancho === 0) return;
    anchoPrevio = ancho;
    dibujar();
  });
  observador.observe(nodo);
  return () => observador.disconnect();
}

// ---------- Escala ----------

/** Un tope "redondo" por encima del máximo, para que la grilla dé números limpios. */
const topeLindo = max => {
  if (max <= 0) return 4;
  const magnitud = Math.pow(10, Math.floor(Math.log10(max)));
  const paso = [1, 2, 2.5, 5, 10].find(p => magnitud * p >= max) ?? 10;
  return magnitud * paso;
};

const marcas = tope => {
  const cantidad = 4;
  return Array.from({ length: cantidad + 1 }, (_, i) => (tope / cantidad) * i);
};

// ---------- Barras verticales, simples o apiladas ----------

/**
 * datos:   [{ etiqueta, valores: {serie: número}, total? }]
 * series:  [{ clave, nombre, color }]   color = nombre de variable CSS
 * formato: función para mostrar valores
 */
export function barras(contenedor, { datos, series, formato = String, formatoEje = formato, alto = 210 }) {
  contenedor.replaceChildren();

  const total = d => series.reduce((s, serie) => s + (d.valores[serie.clave] || 0), 0);
  const maximo = Math.max(...datos.map(total), 0);

  if (!maximo) {
    contenedor.append(crear("p", "grafico-vacio", "Todavía no hay datos en este período."));
    return;
  }

  const tope = topeLindo(maximo);
  // El margen izquierdo se adapta al texto más largo del eje: con pesos
  // ("$ 120.000") un margen fijo recortaría el número.
  const anchoEje = Math.max(...marcas(tope).map(v => formatoEje(v).length));
  const margen = { arriba: 14, derecha: 6, abajo: 26, izquierda: Math.min(90, 14 + anchoEje * 6.6) };
  const ancho = Math.max(contenedor.clientWidth || 520, 320);
  const areaAncho = ancho - margen.izquierda - margen.derecha;
  const areaAlto = alto - margen.arriba - margen.abajo;

  const svg = nodo("svg", {
    viewBox: `0 0 ${ancho} ${alto}`, width: "100%", height: alto,
    role: "img", "aria-label": "Gráfico de barras"
  });

  const y = valor => margen.arriba + areaAlto - (valor / tope) * areaAlto;
  const paso = areaAncho / datos.length;
  const anchoBarra = Math.min(38, paso * 0.62);

  // Grilla y eje de valores: recesivos, por detrás de los datos
  marcas(tope).forEach(valor => {
    svg.append(nodo("line", {
      x1: margen.izquierda, x2: ancho - margen.derecha, y1: y(valor), y2: y(valor),
      stroke: leerColor("--linea-grafico"), "stroke-width": 1
    }));
    const t = nodo("text", {
      x: margen.izquierda - 8, y: y(valor) + 4,
      "text-anchor": "end", class: "eje-texto"
    });
    t.textContent = formatoEje(valor);
    svg.append(t);
  });

  const colores = Object.fromEntries(series.map(s => [s.clave, leerColor(s.color)]));

  datos.forEach((d, i) => {
    const centro = margen.izquierda + paso * i + paso / 2;
    let acumulado = 0;

    const grupo = nodo("g", { class: "barra-grupo" });

    series.forEach(serie => {
      const valor = d.valores[serie.clave] || 0;
      if (!valor) return;
      const desde = y(acumulado);
      const hasta = y(acumulado + valor);
      // 2px de aire entre segmentos apilados, para que se lean separados
      const altura = Math.max(1, desde - hasta - (acumulado > 0 ? 2 : 0));

      grupo.append(nodo("rect", {
        x: centro - anchoBarra / 2, y: hasta, width: anchoBarra, height: altura,
        rx: 3, fill: colores[serie.clave]
      }));
      acumulado += valor;
    });

    // Etiqueta directa del total, sin repetir el número en cada segmento
    const suma = total(d);
    if (suma) {
      const t = nodo("text", {
        x: centro, y: y(suma) - 6, "text-anchor": "middle", class: "valor-directo"
      });
      t.textContent = formato(suma);
      grupo.append(t);
    }

    // Zona de contacto generosa: más ancha que la barra
    const zona = nodo("rect", {
      x: margen.izquierda + paso * i, y: margen.arriba,
      width: paso, height: areaAlto, fill: "transparent"
    });
    zona.addEventListener("mousemove", e => mostrarGlobo(e, [
      d.etiquetaLarga || d.etiqueta,
      ...series
        .filter(s => d.valores[s.clave])
        .map(s => ({ color: colores[s.clave], etiqueta: s.nombre, valor: formato(d.valores[s.clave]) })),
      ...(series.length > 1 ? [{ etiqueta: "Total", valor: formato(suma) }] : [])
    ]));
    zona.addEventListener("mouseleave", ocultarGlobo);
    grupo.append(zona);

    const et = nodo("text", { x: centro, y: alto - 8, "text-anchor": "middle", class: "eje-texto" });
    et.textContent = d.etiqueta;
    grupo.append(et);

    svg.append(grupo);
  });

  contenedor.append(svg);
  if (series.length > 1) contenedor.append(leyenda(series, colores));
  contenedor.append(tablaDeApoyo(datos, series, formato));
}

// ---------- Barras horizontales, para comparar categorías ----------

export function barrasHorizontales(contenedor, { datos, formato = String }) {
  contenedor.replaceChildren();
  const maximo = Math.max(...datos.map(d => d.valor), 0);

  if (!maximo) {
    contenedor.append(crear("p", "grafico-vacio", "Todavía no hay datos en este período."));
    return;
  }

  const lista = crear("div", "barras-h");
  datos.forEach(d => {
    const fila = crear("div", "barra-h");
    fila.append(crear("span", "barra-h-etiqueta", d.etiqueta));

    const riel = crear("div", "barra-h-riel");
    const relleno = crear("div", "barra-h-relleno");
    relleno.style.width = (d.valor / maximo) * 100 + "%";
    relleno.style.background = leerColor(d.color || "--dato-1");
    riel.append(relleno);

    fila.append(riel, crear("span", "barra-h-valor", formato(d.valor)));
    fila.addEventListener("mousemove", e => mostrarGlobo(e, [
      d.etiqueta, { color: leerColor(d.color || "--dato-1"), etiqueta: "Cantidad", valor: formato(d.valor) }
    ]));
    fila.addEventListener("mouseleave", ocultarGlobo);
    lista.append(fila);
  });

  contenedor.append(lista);
}

// ---------- Piezas de apoyo ----------

function leyenda(series, colores) {
  const caja = crear("div", "leyenda");
  series.forEach(s => {
    const item = crear("span", "leyenda-item");
    const punto = crear("span", "leyenda-punto");
    punto.style.background = colores[s.clave];
    item.append(punto, crear("span", null, s.nombre));
    caja.append(item);
  });
  return caja;
}

/** Los mismos números en texto: para lectores de pantalla y para copiar. */
function tablaDeApoyo(datos, series, formato) {
  const detalle = document.createElement("details");
  detalle.className = "tabla-apoyo";
  detalle.append(crear("summary", null, "Ver los números"));

  const tabla = document.createElement("table");
  const encabezado = document.createElement("tr");
  encabezado.append(crear("th", null, "Período"), ...series.map(s => crear("th", null, s.nombre)));
  tabla.append(encabezado);

  datos.forEach(d => {
    const fila = document.createElement("tr");
    fila.append(crear("td", null, d.etiquetaLarga || d.etiqueta));
    series.forEach(s => fila.append(crear("td", null, formato(d.valores[s.clave] || 0))));
    tabla.append(fila);
  });

  detalle.append(tabla);
  return detalle;
}
