// Agenda: calendario mensual con las sesiones, y el detalle del día elegido.

import {
  crear, claveDia, celdasDelMes, inicioDeMes, sumarMeses, esMismoDia, hoy,
  MESES, DIAS_CORTOS, formatearHora, formatearDiaLargo, formatearPesos
} from "../formato.js";
import { estado, sesionesPorDia } from "../datos.js";
import { etiquetaSesion } from "../ficha.js";
import { abrirEditorSesion } from "./editor-sesion.js";

const MAX_CHIPS = 3;

let raiz;
let mesVisible = inicioDeMes(new Date());
let diaElegido = hoy();

export function montarAgenda(contenedor) {
  raiz = contenedor;
  pintar();
}

export function refrescarAgenda() {
  if (raiz) pintar();
}

function pintar() {
  const caja = crear("div", "contenido");

  if (estado.faltaAgenda) {
    caja.append(avisoFaltaTabla());
    raiz.replaceChildren(caja);
    return;
  }

  caja.append(barraSuperior(), grillaDelMes(), detalleDelDia());
  raiz.replaceChildren(caja);
}

function avisoFaltaTabla() {
  const aviso = crear("div", "aviso-linea");
  aviso.append(crear("strong", null, "Falta crear la tabla de sesiones. "));
  aviso.append(document.createTextNode(
    "Corré supabase/002_sesiones.sql en el SQL Editor de Supabase y recargá esta página. " +
    "Mientras tanto las fichas funcionan normalmente."
  ));
  if (estado.errorAgenda) {
    aviso.append(crear("p", "hint", "Detalle técnico: " + estado.errorAgenda));
  }
  return aviso;
}

function barraSuperior() {
  const barra = crear("div", "agenda-barra");

  const titulo = crear("h2", null, `${MESES[mesVisible.getMonth()]} de ${mesVisible.getFullYear()}`);
  titulo.style.textTransform = "capitalize";

  const flechas = crear("div", "flechas");
  const anterior = crear("button", null, "‹");
  anterior.type = "button";
  anterior.setAttribute("aria-label", "Mes anterior");
  const siguiente = crear("button", null, "›");
  siguiente.type = "button";
  siguiente.setAttribute("aria-label", "Mes siguiente");
  anterior.addEventListener("click", () => { mesVisible = sumarMeses(mesVisible, -1); pintar(); });
  siguiente.addEventListener("click", () => { mesVisible = sumarMeses(mesVisible, 1); pintar(); });
  flechas.append(anterior, siguiente);

  const irHoy = crear("button", "ghost compacto", "Hoy");
  irHoy.type = "button";
  irHoy.addEventListener("click", () => {
    mesVisible = inicioDeMes(new Date());
    diaElegido = hoy();
    pintar();
  });

  const derecha = crear("div", "derecha");
  const agendar = crear("button", "primary compacto", "Agendar sesión");
  agendar.type = "button";
  agendar.addEventListener("click", () =>
    abrirEditorSesion({ fecha: diaElegido, alTerminar: pintar }));
  derecha.append(agendar);

  barra.append(flechas, titulo, irHoy, derecha);
  return barra;
}

function grillaDelMes() {
  const grilla = crear("div", "calendario");
  DIAS_CORTOS.forEach(d => grilla.append(crear("div", "cabecera-dia", d)));

  const porDia = sesionesPorDia();
  const ahora = new Date();

  celdasDelMes(mesVisible).forEach(fecha => {
    const celda = crear("button", "celda");
    celda.type = "button";
    if (fecha.getMonth() !== mesVisible.getMonth()) celda.classList.add("otro-mes");
    if (esMismoDia(fecha, ahora)) celda.classList.add("hoy");
    if (esMismoDia(fecha, diaElegido)) celda.setAttribute("aria-current", "true");

    celda.append(crear("span", "numero", fecha.getDate()));

    const delDia = porDia.get(claveDia(fecha)) || [];
    delDia.slice(0, MAX_CHIPS).forEach(s => celda.append(chip(s)));
    if (delDia.length > MAX_CHIPS) {
      celda.append(crear("span", "mas-sesiones", `+${delDia.length - MAX_CHIPS} más`));
    }

    celda.addEventListener("click", () => { diaElegido = fecha; pintar(); });
    grilla.append(celda);
  });

  return grilla;
}

function chip(sesion) {
  // Es un div y no un button: ya está dentro del botón de la celda, y anidar
  // botones es HTML inválido. Lleva rol y teclado propios.
  const c = crear("div", "chip-sesion " + sesion.estado);
  c.setAttribute("role", "button");
  c.tabIndex = 0;
  c.append(
    crear("span", "hora", formatearHora(sesion.inicia_en)),
    crear("span", "quien-chip", sesion.fichas ? sesion.fichas.nombre : "—")
  );
  const abrir = e => {
    e.stopPropagation();
    abrirEditorSesion({ sesion, alTerminar: pintar });
  };
  c.addEventListener("click", abrir);
  c.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(e); }
  });
  return c;
}

function detalleDelDia() {
  const bloque = crear("div", "bloque dia-detalle");
  const encabezado = crear("div", "agenda-barra");
  encabezado.style.marginBottom = "10px";
  encabezado.append(crear("h3", null, formatearDiaLargo(diaElegido)));

  const sumar = crear("button", "ghost compacto", "Agregar en este día");
  sumar.type = "button";
  sumar.addEventListener("click", () =>
    abrirEditorSesion({ fecha: diaElegido, alTerminar: pintar }));
  const derecha = crear("div", "derecha");
  derecha.append(sumar);
  encabezado.append(derecha);
  bloque.append(encabezado);

  const delDia = (sesionesPorDia().get(claveDia(diaElegido)) || []);
  if (!delDia.length) {
    bloque.append(crear("p", "grafico-vacio", "No hay sesiones agendadas este día."));
    return bloque;
  }

  delDia.forEach(s => {
    const fila = crear("div", "sesion-fila");
    fila.append(crear("span", "cuando", formatearHora(s.inicia_en)));
    fila.append(crear("span", "pill " + pillDe(s.estado), etiquetaSesion(s.estado)));
    fila.append(crear("strong", null, s.fichas ? s.fichas.nombre : "—"));
    if (s.arancel != null) {
      fila.append(crear("span", "hint", formatearPesos(s.arancel) + (s.pagada ? " · paga" : " · a cobrar")));
    }
    if (s.notas) fila.append(crear("span", "notas-corta", s.notas));

    const editar = crear("button", "ghost compacto", "Abrir");
    editar.type = "button";
    editar.style.marginLeft = "auto";
    editar.addEventListener("click", () => abrirEditorSesion({ sesion: s, alTerminar: pintar }));
    fila.append(editar);

    bloque.append(fila);
  });

  return bloque;
}

/** Los estados de sesión reusan las píldoras del CRM que más se les parecen. */
const pillDe = valor => ({
  programada: "nueva",
  realizada: "en_terapia",
  cancelada: "cerrada"
}[valor] || "cerrada");

