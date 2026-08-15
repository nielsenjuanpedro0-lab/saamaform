// Reportes: cómo evoluciona el consultorio en el período elegido.

import {
  crear, claveMes, mesesEntre, inicioDeMes, sumarMeses,
  formatearPesos, formatearNumero
} from "../formato.js";
import { estado } from "../datos.js";
import { ESTADOS, SESION_ESTADOS, etiquetaEstado, CAMPOS, mostrarValor } from "../ficha.js";
import { barras, barrasHorizontales, alCambiarAncho } from "../grafico.js";

const PERIODOS = [
  { clave: "3m", label: "3 meses", meses: 3 },
  { clave: "6m", label: "6 meses", meses: 6 },
  { clave: "12m", label: "12 meses", meses: 12 },
  { clave: "todo", label: "Todo", meses: null }
];

let raiz;
let periodo = "6m";

export function montarReportes(contenedor) {
  raiz = contenedor;
  pintar();
}

export function refrescarReportes() {
  if (raiz) pintar();
}

/** Fecha de corte inferior según el período elegido. */
function desdeCuando() {
  const p = PERIODOS.find(x => x.clave === periodo);
  if (!p.meses) {
    const fechas = [
      ...estado.fichas.map(f => new Date(f.creado_en)),
      ...estado.sesiones.map(s => new Date(s.inicia_en))
    ];
    return fechas.length ? inicioDeMes(new Date(Math.min(...fechas))) : inicioDeMes(new Date());
  }
  return inicioDeMes(sumarMeses(new Date(), -(p.meses - 1)));
}

function pintar() {
  const caja = crear("div", "contenido");
  caja.append(crear("h2", "titulo-vista", "Reportes"));
  caja.append(crear("p", "subtitulo", "Todo lo de abajo responde al período elegido."));
  caja.append(filtros());

  const desde = desdeCuando();
  const meses = mesesEntre(desde, new Date());

  const fichasPeriodo = estado.fichas.filter(f => new Date(f.creado_en) >= desde);
  const sesionesPeriodo = estado.sesiones.filter(s => new Date(s.inicia_en) >= desde);

  caja.append(
    graficoFichas(meses, fichasPeriodo),
    graficoSesiones(meses, sesionesPeriodo),
    graficoEstados(fichasPeriodo),
    graficoIngresos(meses, sesionesPeriodo),
    tablaPacientes(sesionesPeriodo),
    exportaciones(fichasPeriodo, sesionesPeriodo)
  );

  raiz.replaceChildren(caja);
}

function filtros() {
  const caja = crear("div", "filtros");
  caja.append(crear("span", "hint", "Período:"));
  PERIODOS.forEach(p => {
    const b = crear("button", "pastilla", p.label);
    b.type = "button";
    b.setAttribute("aria-pressed", periodo === p.clave ? "true" : "false");
    b.addEventListener("click", () => { periodo = p.clave; pintar(); });
    caja.append(b);
  });
  return caja;
}

/** Arma el contenedor + redibujo por ancho, para no repetirlo en cada gráfico. */
function conLienzo(caja, dibujar) {
  const lienzo = crear("div", null);
  caja.append(lienzo);
  dibujar(lienzo);
  alCambiarAncho(lienzo, () => dibujar(lienzo));
  return caja;
}

// ---------- Fichas recibidas ----------

function graficoFichas(meses, fichas) {
  const caja = crear("div", "grafico-caja");
  caja.append(crear("h3", null, "Fichas recibidas por mes"));
  caja.append(crear("p", "nota", "Cuánta gente llegó por el formulario."));

  const datos = meses.map(m => ({
    etiqueta: m.etiqueta,
    etiquetaLarga: `${m.etiqueta} ${m.fecha.getFullYear()}`,
    valores: { fichas: 0 }
  }));
  const indice = Object.fromEntries(meses.map((m, i) => [m.clave, datos[i]]));
  fichas.forEach(f => {
    const fila = indice[claveMes(new Date(f.creado_en))];
    if (fila) fila.valores.fichas++;
  });

  // Una sola serie: sin leyenda, el título ya la nombra
  return conLienzo(caja, lienzo => barras(lienzo, {
    datos,
    series: [{ clave: "fichas", nombre: "Fichas", color: "--dato-1" }],
    formato: v => formatearNumero(Math.round(v))
  }));
}

// ---------- Sesiones ----------

function graficoSesiones(meses, sesiones) {
  const caja = crear("div", "grafico-caja");
  caja.append(crear("h3", null, "Sesiones por mes"));
  caja.append(crear("p", "nota", "Apiladas por cómo terminó cada una."));

  const datos = meses.map(m => ({
    etiqueta: m.etiqueta,
    etiquetaLarga: `${m.etiqueta} ${m.fecha.getFullYear()}`,
    valores: Object.fromEntries(SESION_ESTADOS.map(e => [e.valor, 0]))
  }));
  const indice = Object.fromEntries(meses.map((m, i) => [m.clave, datos[i]]));
  sesiones.forEach(s => {
    const fila = indice[claveMes(new Date(s.inicia_en))];
    if (fila) fila.valores[s.estado] = (fila.valores[s.estado] || 0) + 1;
  });

  return conLienzo(caja, lienzo => barras(lienzo, {
    datos,
    series: SESION_ESTADOS.map(e => ({ clave: e.valor, nombre: e.label, color: e.color })),
    formato: v => formatearNumero(Math.round(v))
  }));
}

// ---------- Estados de las fichas ----------

function graficoEstados(fichas) {
  const caja = crear("div", "grafico-caja");
  caja.append(crear("h3", null, "En qué estado están las fichas"));
  caja.append(crear("p", "nota", "De las recibidas en el período."));

  const colorDe = { nueva: "--dato-1", contactada: "--dato-2", en_terapia: "--dato-3", cerrada: "--dato-neutro" };
  const datos = ESTADOS.map(e => ({
    etiqueta: e.label,
    valor: fichas.filter(f => f.estado === e.valor).length,
    color: colorDe[e.valor]
  }));

  const lienzo = crear("div", null);
  caja.append(lienzo);
  barrasHorizontales(lienzo, { datos, formato: v => formatearNumero(v) });
  return caja;
}

// ---------- Ingresos ----------

function graficoIngresos(meses, sesiones) {
  const conArancel = sesiones.filter(s => s.arancel != null && s.estado === "realizada");

  const caja = crear("div", "grafico-caja");
  caja.append(crear("h3", null, "Ingresos por mes"));

  if (!conArancel.length) {
    caja.append(crear("p", "nota", "Aparece cuando cargues aranceles en las sesiones realizadas."));
    return caja;
  }

  caja.append(crear("p", "nota", "Solo sesiones realizadas, separadas por si ya se cobraron."));

  const datos = meses.map(m => ({
    etiqueta: m.etiqueta,
    etiquetaLarga: `${m.etiqueta} ${m.fecha.getFullYear()}`,
    valores: { cobrado: 0, pendiente: 0 }
  }));
  const indice = Object.fromEntries(meses.map((m, i) => [m.clave, datos[i]]));
  conArancel.forEach(s => {
    const fila = indice[claveMes(new Date(s.inicia_en))];
    if (!fila) return;
    fila.valores[s.pagada ? "cobrado" : "pendiente"] += Number(s.arancel);
  });

  return conLienzo(caja, lienzo => barras(lienzo, {
    datos,
    series: [
      { clave: "cobrado", nombre: "Cobrado", color: "--dato-3" },
      { clave: "pendiente", nombre: "Por cobrar", color: "--dato-2" }
    ],
    formato: v => formatearPesos(v),
    // En el eje van montos abreviados; el número completo está en el globo
    formatoEje: v => v >= 1000 ? "$" + Math.round(v / 1000) + "k" : "$" + Math.round(v)
  }));
}

// ---------- Tabla de pacientes ----------

function tablaPacientes(sesiones) {
  const caja = crear("div", "grafico-caja");
  caja.append(crear("h3", null, "Pacientes con más sesiones"));

  const cuenta = new Map();
  sesiones.forEach(s => {
    const nombre = s.fichas ? s.fichas.nombre : "—";
    const fila = cuenta.get(nombre) || { nombre, total: 0, realizadas: 0, ausencias: 0 };
    fila.total++;
    if (s.estado === "realizada") fila.realizadas++;
    if (s.estado === "ausente") fila.ausencias++;
    cuenta.set(nombre, fila);
  });

  const filas = [...cuenta.values()].sort((a, b) => b.total - a.total).slice(0, 12);
  if (!filas.length) {
    caja.append(crear("p", "grafico-vacio", "Todavía no hay sesiones en este período."));
    return caja;
  }

  const tabla = crear("table", "tabla-datos");
  const encabezado = document.createElement("tr");
  ["Paciente", "Sesiones", "Realizadas", "Ausencias"].forEach((t, i) => {
    const th = crear("th", i ? "num" : null, t);
    if (i) th.style.textAlign = "right";
    encabezado.append(th);
  });
  tabla.append(encabezado);

  filas.forEach(f => {
    const tr = document.createElement("tr");
    tr.append(
      crear("td", null, f.nombre),
      crear("td", "num", formatearNumero(f.total)),
      crear("td", "num", formatearNumero(f.realizadas)),
      crear("td", "num", formatearNumero(f.ausencias))
    );
    tabla.append(tr);
  });

  caja.append(tabla);
  return caja;
}

// ---------- Exportaciones ----------

const escapar = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';

function bajarCSV(nombre, filas) {
  // El BOM hace que Excel abra bien los acentos.
  const csv = "﻿" + filas.map(f => f.map(escapar).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

function exportaciones(fichas, sesiones) {
  const caja = crear("div", "grafico-caja");
  caja.append(crear("h3", null, "Exportar"));
  caja.append(crear("p", "nota", "Se baja lo del período elegido, listo para abrir en Excel."));

  const fila = crear("div", "filtros");

  const bFichas = crear("button", "ghost compacto", "Fichas del período");
  bFichas.type = "button";
  bFichas.addEventListener("click", () => bajarCSV("fichas-saama.csv", [
    ["Recibida", "Estado", ...CAMPOS.map(c => c.label), "Notas"],
    ...fichas.map(f => [
      f.creado_en, etiquetaEstado(f.estado),
      ...CAMPOS.map(c => mostrarValor(c, f[c.col])), f.notas
    ])
  ]));

  const bSesiones = crear("button", "ghost compacto", "Sesiones del período");
  bSesiones.type = "button";
  bSesiones.addEventListener("click", () => bajarCSV("sesiones-saama.csv", [
    ["Fecha", "Paciente", "Duración (min)", "Estado", "Arancel", "Pagada", "Notas"],
    ...sesiones.map(s => [
      s.inicia_en, s.fichas ? s.fichas.nombre : "", s.duracion_min,
      SESION_ESTADOS.find(e => e.valor === s.estado)?.label || s.estado,
      s.arancel ?? "", s.pagada ? "Sí" : "No", s.notas
    ])
  ]));

  fila.append(bFichas, bSesiones);
  caja.append(fila);
  return caja;
}
