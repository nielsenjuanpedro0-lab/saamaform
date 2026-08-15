// Fichas: listado a la izquierda, ficha completa a la derecha.

import { crear, formatearMomento, formatearPesos } from "../formato.js";
import { estado, fichaPorId, guardarFicha, borrarFicha, sesionesDeFicha } from "../datos.js";
import { SECCIONES, ESTADOS, etiquetaEstado, etiquetaSesion, mostrarValor } from "../ficha.js";
import { abrirEditorSesion } from "./editor-sesion.js";

let lista, detalle, buscador;
let seleccionada = null;
let filtroEstado = null;
let verVacios = false;

export function montarFichas(contenedor) {
  contenedor.replaceChildren();

  const columna = crear("div", "listado");
  const caja = crear("div", "buscador");
  buscador = document.createElement("input");
  buscador.type = "search";
  buscador.placeholder = "Buscar nombre, motivo o teléfono";
  buscador.addEventListener("input", pintarLista);
  caja.append(buscador);
  lista = crear("div", "lista");
  columna.append(caja, lista);

  detalle = crear("div", "detalle");
  detalle.append(crear("div", "sin-seleccion", "Elegí una ficha de la lista para verla completa."));

  contenedor.append(columna, detalle);
  pintarLista();
}

export function filtrarPorEstado(valor) {
  filtroEstado = valor;
  pintarLista();
}

export function refrescarFichas() {
  if (!lista) return;
  if (seleccionada) {
    const viva = fichaPorId(seleccionada.id);
    seleccionada = viva || null;
  }
  pintarLista();
  if (seleccionada) pintarDetalle();
}

/** Abre una ficha puntual — la usa el tablero al hacer clic en un nombre. */
export function abrirFicha(id) {
  const ficha = fichaPorId(id);
  if (!ficha) return;
  seleccionada = ficha;
  filtroEstado = null;
  if (buscador) buscador.value = "";
  pintarLista();
  pintarDetalle();
}

const visibles = () => {
  const q = (buscador?.value || "").trim().toLowerCase();
  return estado.fichas.filter(f => {
    if (filtroEstado && f.estado !== filtroEstado) return false;
    if (!q) return true;
    return [f.nombre, f.motivo, f.telefono, f.email].some(v => v && v.toLowerCase().includes(q));
  });
};

export const contarPorEstado = valor => estado.fichas.filter(f => f.estado === valor).length;

// ---------- Listado ----------

function pintarLista() {
  if (!lista) return;
  const filas = visibles();
  lista.replaceChildren();

  if (!filas.length) {
    lista.append(crear("div", "vacio", estado.fichas.length
      ? "Ninguna ficha coincide con la búsqueda."
      : "Todavía no llegó ninguna ficha."));
    return;
  }

  filas.forEach(f => {
    const item = crear("button", "item");
    item.type = "button";
    if (seleccionada && seleccionada.id === f.id) item.setAttribute("aria-current", "true");

    const meta = crear("div", "meta");
    meta.append(
      crear("span", "pill " + f.estado, etiquetaEstado(f.estado)),
      crear("span", null, formatearMomento(f.creado_en))
    );
    item.append(crear("span", "nom", f.nombre), meta);
    if (f.motivo) item.append(crear("span", "resumen-motivo", f.motivo));

    item.addEventListener("click", () => {
      seleccionada = f;
      pintarLista();
      pintarDetalle();
    });
    lista.append(item);
  });
}

// ---------- Detalle ----------

function pintarDetalle() {
  const f = seleccionada;
  if (!f) return;
  const caja = crear("div", "detalle-interior");

  // Cabecera
  const cabecera = crear("div", "detalle-cabecera");
  const titulo = crear("div", "titulo-fila");
  titulo.append(crear("h2", null, f.nombre), crear("span", "pill " + f.estado, etiquetaEstado(f.estado)));

  const contacto = crear("p", "contacto");
  const recibida = document.createElement("time");
  recibida.dateTime = f.creado_en;
  recibida.textContent = "Recibida el " + formatearMomento(f.creado_en);
  contacto.append(recibida);
  const enlace = (texto, href) => {
    contacto.append(crear("span", "sep", "·"));
    const a = document.createElement("a");
    a.href = href;
    a.textContent = texto;
    contacto.append(a);
  };
  if (f.telefono) enlace(f.telefono, "tel:" + f.telefono.replace(/[^\d+]/g, ""));
  if (f.email) enlace(f.email, "mailto:" + f.email);
  cabecera.append(titulo, contacto);
  caja.append(cabecera);

  // Seguimiento
  const seg = crear("div", "seguimiento");
  const campoEstado = crear("div", "field estado-campo");
  const lEstado = crear("label", null, "Estado");
  lEstado.htmlFor = "estado";
  const envoltorio = crear("div", "select");
  const select = document.createElement("select");
  select.id = "estado";
  ESTADOS.forEach(e => {
    const op = document.createElement("option");
    op.value = e.valor;
    op.textContent = e.label;
    if (e.valor === f.estado) op.selected = true;
    select.append(op);
  });
  envoltorio.append(select);
  campoEstado.append(lEstado, envoltorio);

  const acciones = crear("div", "acciones");
  const aviso = crear("span", null, "");
  aviso.id = "guardado";
  aviso.setAttribute("role", "status");
  const botonGuardar = crear("button", "primary compacto", "Guardar");
  botonGuardar.type = "button";
  const botonImprimir = crear("button", "ghost compacto", "Imprimir");
  botonImprimir.type = "button";
  botonImprimir.addEventListener("click", () => window.print());
  acciones.append(aviso, botonGuardar, botonImprimir);

  const campoNotas = crear("div", "field notas-campo");
  const lNotas = crear("label", null, "Notas de la terapeuta");
  lNotas.htmlFor = "notas";
  const notas = document.createElement("textarea");
  notas.id = "notas";
  notas.value = f.notas || "";
  notas.placeholder = "Privado: lo que quieras registrar. El paciente nunca accede a esto.";
  campoNotas.append(lNotas, notas);

  seg.append(campoEstado, acciones, campoNotas);
  caja.append(seg);

  botonGuardar.addEventListener("click", async () => {
    botonGuardar.disabled = true;
    botonGuardar.textContent = "Guardando…";
    const { error } = await guardarFicha(f.id, {
      estado: select.value,
      notas: notas.value.trim() || null
    });
    botonGuardar.disabled = false;
    botonGuardar.textContent = "Guardar";

    if (error) {
      aviso.style.color = "var(--danger)";
      aviso.textContent = "No se pudo guardar: " + error.message;
      return;
    }
    aviso.style.color = "var(--sage-deep)";
    aviso.textContent = "Guardado";
    const pill = titulo.querySelector(".pill");
    pill.className = "pill " + f.estado;
    pill.textContent = etiquetaEstado(f.estado);
  });

  caja.append(bloqueSesiones(f));

  // Interruptor de campos vacíos
  const controles = crear("div", "controles-vista");
  const interruptor = crear("label", "interruptor");
  const marca = document.createElement("input");
  marca.type = "checkbox";
  marca.checked = verVacios;
  marca.addEventListener("change", () => {
    verVacios = marca.checked;
    caja.querySelectorAll(".vacio-campo, .todo-vacio").forEach(el => el.classList.toggle("ver", verVacios));
  });
  interruptor.append(marca, document.createTextNode("Mostrar campos sin respuesta"));
  controles.append(interruptor);
  caja.append(controles);

  // Ficha completa
  SECCIONES.forEach(seccion => {
    const grupo = crear("div", "grupo");
    grupo.append(crear("h3", null, seccion.num + " · " + seccion.titulo));
    const dl = document.createElement("dl");
    let conRespuesta = 0;

    seccion.campos.forEach(campo => {
      const valor = mostrarValor(campo, f[campo.col]);
      const bloque = crear("div", "dato" + (campo.tipo === "textarea" ? " largo" : ""));
      if (valor) conRespuesta++;
      else {
        bloque.classList.add("vacio-campo");
        if (verVacios) bloque.classList.add("ver");
      }
      bloque.append(crear("dt", null, campo.label));
      bloque.append(crear("dd", null, valor || "Sin respuesta"));
      dl.append(bloque);
    });

    if (!conRespuesta) {
      grupo.classList.add("todo-vacio");
      if (verVacios) grupo.classList.add("ver");
    }
    grupo.append(dl);
    caja.append(grupo);
  });

  // Borrado en dos pasos
  const peligro = crear("div", "peligro");
  const pedir = crear("button", "mini", "Borrar esta ficha");
  pedir.type = "button";
  peligro.append(pedir);

  pedir.addEventListener("click", () => {
    peligro.replaceChildren();
    const texto = crear("span", "hint", "Se borran también sus sesiones. No hay vuelta atrás.");
    const si = crear("button", "confirmar compacto", "Sí, borrar");
    si.type = "button";
    const no = crear("button", "ghost compacto", "Cancelar");
    no.type = "button";
    no.addEventListener("click", pintarDetalle);
    si.addEventListener("click", async () => {
      si.disabled = true;
      const { error } = await borrarFicha(f.id);
      if (error) {
        si.disabled = false;
        texto.textContent = "No se pudo borrar: " + error.message;
        return;
      }
      seleccionada = null;
      detalle.replaceChildren(crear("div", "sin-seleccion", "Ficha borrada."));
      pintarLista();
    });
    peligro.append(texto, si, no);
  });
  caja.append(peligro);

  detalle.replaceChildren(caja);
  detalle.scrollTop = 0;
}

// ---------- Sesiones del paciente ----------

function bloqueSesiones(f) {
  const bloque = crear("div", "bloque sesiones-ficha");
  const encabezado = crear("div", "agenda-barra");
  encabezado.style.marginBottom = "12px";
  encabezado.append(crear("h3", null, "Sesiones"));

  const derecha = crear("div", "derecha");
  const agendar = crear("button", "ghost compacto", "Agendar sesión");
  agendar.type = "button";
  agendar.disabled = Boolean(estado.faltaAgenda);
  agendar.addEventListener("click", () =>
    abrirEditorSesion({ fichaId: f.id, alTerminar: pintarDetalle }));
  derecha.append(agendar);
  encabezado.append(derecha);
  bloque.append(encabezado);

  if (estado.faltaAgenda) {
    bloque.append(crear("p", "hint", "La agenda se habilita corriendo supabase/002_sesiones.sql."));
    return bloque;
  }

  const sesiones = sesionesDeFicha(f.id);
  if (!sesiones.length) {
    bloque.append(crear("p", "grafico-vacio", "Todavía no hay sesiones con este paciente."));
    return bloque;
  }

  const realizadas = sesiones.filter(s => s.estado === "realizada").length;
  bloque.append(crear("p", "hint",
    `${sesiones.length} en total · ${realizadas} realizada${realizadas === 1 ? "" : "s"}`));

  sesiones.forEach(s => {
    const fila = crear("div", "sesion-fila");
    fila.append(crear("span", "cuando", formatearMomento(s.inicia_en)));
    fila.append(crear("span", "pill " + pillDe(s.estado), etiquetaSesion(s.estado)));
    fila.append(crear("span", "hint", s.duracion_min + " min"));
    if (s.arancel != null) {
      fila.append(crear("span", "hint", formatearPesos(s.arancel) + (s.pagada ? " · paga" : " · a cobrar")));
    }
    if (s.notas) fila.append(crear("span", "notas-corta", s.notas));

    const abrir = crear("button", "ghost compacto", "Abrir");
    abrir.type = "button";
    abrir.style.marginLeft = "auto";
    abrir.addEventListener("click", () => abrirEditorSesion({ sesion: s, alTerminar: pintarDetalle }));
    fila.append(abrir);
    bloque.append(fila);
  });

  return bloque;
}

const pillDe = valor => ({
  programada: "nueva",
  realizada: "en_terapia",
  ausente: "contactada",
  cancelada: "cerrada"
}[valor] || "cerrada");
