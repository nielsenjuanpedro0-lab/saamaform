// Tablero: la foto del consultorio al abrir. Primero el resumen, después el
// detalle — lo que necesita atención tiene que leerse de un vistazo.

import {
  crear, claveMes, ultimosMeses, inicioDeMes, finDeMes,
  formatearMomento, formatearHora, formatearPesos, formatearNumero, cercania
} from "../formato.js";
import { estado, proximasSesiones } from "../datos.js";
import { SESION_ESTADOS } from "../ficha.js";
import { barras, alCambiarAncho } from "../grafico.js";
import { abrirEditorSesion } from "./editor-sesion.js";

let raiz, irAFicha;

export function montarTablero(contenedor, { alElegirFicha }) {
  raiz = contenedor;
  irAFicha = alElegirFicha;
  pintar();
}

export function refrescarTablero() {
  if (raiz) pintar();
}

function pintar() {
  const caja = crear("div", "contenido");
  caja.append(crear("h2", "titulo-vista", "Consultorio"));
  caja.append(crear("p", "subtitulo", "Cómo viene el mes, y qué necesita atención."));

  if (estado.faltaAgenda) {
    const aviso = crear("div", "aviso-linea");
    aviso.append(crear("strong", null, "La agenda todavía no está activa. "));
    aviso.append(document.createTextNode("Corré supabase/002_sesiones.sql en Supabase para habilitar sesiones y reportes."));
    caja.append(aviso);
  }

  caja.append(indicadores(), columnas(), graficoMeses());
  raiz.replaceChildren(caja);
}

// ---------- Indicadores ----------

function indicador(cifra, rotulo, pie, clase) {
  const el = crear("div", "indicador" + (clase ? " " + clase : ""));
  el.append(crear("span", "cifra", cifra), crear("span", "rotulo", rotulo));
  if (pie) el.append(crear("span", "pie", pie));
  return el;
}

function indicadores() {
  const caja = crear("div", "indicadores");
  const ahora = new Date();
  const desde = inicioDeMes(ahora);
  const hasta = finDeMes(ahora);

  const enElMes = estado.sesiones.filter(s => {
    const f = new Date(s.inicia_en);
    return f >= desde && f <= hasta;
  });
  const realizadas = enElMes.filter(s => s.estado === "realizada");
  const cobrado = realizadas
    .filter(s => s.pagada && s.arancel != null)
    .reduce((t, s) => t + Number(s.arancel), 0);
  const porCobrar = realizadas
    .filter(s => !s.pagada && s.arancel != null)
    .reduce((t, s) => t + Number(s.arancel), 0);

  const nuevas = estado.fichas.filter(f => f.estado === "nueva").length;
  const enTerapia = estado.fichas.filter(f => f.estado === "en_terapia").length;
  const fichasDelMes = estado.fichas.filter(f => new Date(f.creado_en) >= desde).length;

  caja.append(
    indicador(formatearNumero(estado.fichas.length), "Pacientes", `${fichasDelMes} este mes`),
    indicador(formatearNumero(nuevas), "Sin contactar", nuevas ? "Esperan respuesta" : "Al día",
      nuevas ? "atencion" : null),
    indicador(formatearNumero(enTerapia), "En terapia", "Con proceso abierto", "destacado"),
    indicador(formatearNumero(enElMes.length), "Sesiones del mes", `${realizadas.length} ya realizadas`)
  );

  // El dinero solo aparece si efectivamente se cargan aranceles
  if (cobrado || porCobrar) {
    caja.append(indicador(formatearPesos(cobrado), "Cobrado en el mes",
      porCobrar ? `${formatearPesos(porCobrar)} por cobrar` : "Todo al día",
      porCobrar ? "atencion" : "destacado"));
  }

  return caja;
}

// ---------- Listas ----------

function columnas() {
  const caja = crear("div", "columnas");
  caja.style.marginBottom = "18px";
  caja.append(bloqueProximas(), bloqueNuevas());
  return caja;
}

function bloqueProximas() {
  const bloque = crear("div", "bloque");
  bloque.append(crear("h3", null, "Próximas sesiones"));

  const proximas = proximasSesiones(6);
  if (!proximas.length) {
    const vacio = crear("p", "grafico-vacio", "No hay sesiones agendadas.");
    bloque.append(vacio);
    const agendar = crear("button", "ghost compacto", "Agendar una");
    agendar.type = "button";
    agendar.addEventListener("click", () => abrirEditorSesion({ alTerminar: pintar }));
    bloque.append(agendar);
    return bloque;
  }

  const lista = crear("div", "lista-simple");
  proximas.forEach(s => {
    const fila = crear("button", null);
    fila.type = "button";
    fila.append(
      crear("span", "nombre", s.fichas ? s.fichas.nombre : "—"),
      crear("span", "hint", formatearHora(s.inicia_en)),
      crear("span", "cuando", cercania(s.inicia_en))
    );
    fila.addEventListener("click", () => abrirEditorSesion({ sesion: s, alTerminar: pintar }));
    lista.append(fila);
  });
  bloque.append(lista);
  return bloque;
}

function bloqueNuevas() {
  const bloque = crear("div", "bloque");
  bloque.append(crear("h3", null, "Fichas sin contactar"));

  const nuevas = estado.fichas.filter(f => f.estado === "nueva").slice(0, 6);
  if (!nuevas.length) {
    bloque.append(crear("p", "grafico-vacio", "Ninguna ficha pendiente. Todo contestado."));
    return bloque;
  }

  const lista = crear("div", "lista-simple");
  nuevas.forEach(f => {
    const fila = crear("button", null);
    fila.type = "button";
    fila.append(
      crear("span", "nombre", f.nombre),
      crear("span", "cuando", formatearMomento(f.creado_en))
    );
    fila.addEventListener("click", () => irAFicha(f.id));
    lista.append(fila);
  });
  bloque.append(lista);
  return bloque;
}

// ---------- Gráfico ----------

function graficoMeses() {
  const caja = crear("div", "grafico-caja");
  caja.append(crear("h3", null, "Sesiones de los últimos 6 meses"));
  caja.append(crear("p", "nota", "Apiladas por cómo terminó cada sesión."));

  const meses = ultimosMeses(6);
  const datos = meses.map(m => ({
    etiqueta: m.etiqueta,
    etiquetaLarga: m.etiqueta + " " + m.fecha.getFullYear(),
    valores: Object.fromEntries(SESION_ESTADOS.map(e => [e.valor, 0]))
  }));
  const porClave = Object.fromEntries(meses.map((m, i) => [m.clave, datos[i]]));

  estado.sesiones.forEach(s => {
    const fila = porClave[claveMes(new Date(s.inicia_en))];
    if (fila) fila.valores[s.estado] = (fila.valores[s.estado] || 0) + 1;
  });

  const lienzo = crear("div", null);
  caja.append(lienzo);

  const dibujar = () => barras(lienzo, {
    datos,
    series: SESION_ESTADOS.map(e => ({ clave: e.valor, nombre: e.label, color: e.color })),
    formato: v => formatearNumero(Math.round(v))
  });
  dibujar();
  // El SVG se mide en píxeles, así que hay que rehacerlo si cambia el ancho
  alCambiarAncho(lienzo, dibujar);

  return caja;
}
