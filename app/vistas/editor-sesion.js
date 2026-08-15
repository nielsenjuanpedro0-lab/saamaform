// Editor de sesión: se abre desde la agenda y desde la ficha del paciente.
//
// Es un panel propio sobre un velo, no un diálogo del navegador: los
// confirm()/alert() nativos bloquean la página y quedan feos.

import { crear, paraInputLocal } from "../formato.js";
import { estado, guardarSesion, borrarSesion } from "../datos.js";
import { SESION_ESTADOS, DURACIONES } from "../ficha.js";

let velo, formulario, campos, alGuardar;
let sesionActual = null;

function construir() {
  velo = crear("div", "velo");
  formulario = document.createElement("form");
  formulario.className = "editor";
  formulario.noValidate = true;
  velo.append(formulario);

  const titulo = crear("h3", null, "Sesión");

  // Paciente
  const cPaciente = crear("div", "field");
  const lPaciente = crear("label", null, "Paciente");
  lPaciente.htmlFor = "s-paciente";
  const envPaciente = crear("div", "select");
  const paciente = document.createElement("select");
  paciente.id = "s-paciente";
  envPaciente.append(paciente);
  cPaciente.append(lPaciente, envPaciente);

  // Cuándo y cuánto dura
  const pareja1 = crear("div", "pareja");
  const cCuando = crear("div", "field");
  const lCuando = crear("label", null, "Fecha y hora");
  lCuando.htmlFor = "s-cuando";
  const cuando = document.createElement("input");
  cuando.type = "datetime-local";
  cuando.id = "s-cuando";
  cCuando.append(lCuando, cuando);

  const cDuracion = crear("div", "field");
  const lDuracion = crear("label", null, "Duración");
  lDuracion.htmlFor = "s-duracion";
  const envDuracion = crear("div", "select");
  const duracion = document.createElement("select");
  duracion.id = "s-duracion";
  DURACIONES.forEach(m => {
    const op = document.createElement("option");
    op.value = m;
    op.textContent = m + " min";
    duracion.append(op);
  });
  envDuracion.append(duracion);
  cDuracion.append(lDuracion, envDuracion);
  pareja1.append(cCuando, cDuracion);

  // Estado y arancel
  const pareja2 = crear("div", "pareja");
  const cEstado = crear("div", "field");
  const lEstado = crear("label", null, "Estado");
  lEstado.htmlFor = "s-estado";
  const envEstado = crear("div", "select");
  const estadoSel = document.createElement("select");
  estadoSel.id = "s-estado";
  SESION_ESTADOS.forEach(e => {
    const op = document.createElement("option");
    op.value = e.valor;
    op.textContent = e.label;
    estadoSel.append(op);
  });
  envEstado.append(estadoSel);
  cEstado.append(lEstado, envEstado);

  const cArancel = crear("div", "field");
  const lArancel = crear("label", null, "Arancel");
  lArancel.htmlFor = "s-arancel";
  const arancel = document.createElement("input");
  arancel.type = "number";
  arancel.id = "s-arancel";
  arancel.min = "0";
  arancel.step = "100";
  arancel.placeholder = "Opcional";
  cArancel.append(lArancel, arancel);
  pareja2.append(cEstado, cArancel);

  // Pago
  const pago = crear("label", "marca-pago");
  const pagada = document.createElement("input");
  pagada.type = "checkbox";
  pagada.id = "s-pagada";
  pago.htmlFor = "s-pagada";
  pago.append(pagada, document.createTextNode("Ya está paga"));

  // Notas
  const cNotas = crear("div", "field");
  const lNotas = crear("label", null, "Notas de la sesión");
  lNotas.htmlFor = "s-notas";
  const notas = document.createElement("textarea");
  notas.id = "s-notas";
  notas.placeholder = "Qué se trabajó, qué observaste, qué queda pendiente.";
  cNotas.append(lNotas, notas);

  const error = crear("p", "err");

  // Pie
  const pie = crear("div", "pie-editor");
  const borrar = crear("button", "mini", "Borrar");
  borrar.type = "button";
  const derecha = crear("div", "derecha");
  const cancelar = crear("button", "ghost compacto", "Cancelar");
  cancelar.type = "button";
  const guardar = crear("button", "primary compacto", "Guardar");
  guardar.type = "submit";
  derecha.append(cancelar, guardar);
  pie.append(borrar, derecha);

  formulario.append(titulo, cPaciente, pareja1, pareja2, pago, cNotas, error, pie);
  document.body.append(velo);

  campos = { titulo, paciente, cuando, duracion, estadoSel, arancel, pagada, notas, error, borrar, guardar };

  cancelar.addEventListener("click", cerrar);
  velo.addEventListener("mousedown", e => { if (e.target === velo) cerrar(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && velo.classList.contains("ver")) cerrar();
  });

  formulario.addEventListener("submit", async e => {
    e.preventDefault();
    campos.error.classList.remove("show");

    if (!campos.paciente.value) return fallar("Elegí de qué paciente es la sesión.");
    if (!campos.cuando.value) return fallar("Falta la fecha y la hora.");

    const payload = {
      ficha_id: campos.paciente.value,
      inicia_en: new Date(campos.cuando.value).toISOString(),
      duracion_min: Number(campos.duracion.value),
      estado: campos.estadoSel.value,
      arancel: campos.arancel.value === "" ? null : Number(campos.arancel.value),
      pagada: campos.pagada.checked,
      notas: campos.notas.value.trim() || null
    };

    campos.guardar.disabled = true;
    campos.guardar.textContent = "Guardando…";
    const { error: err } = await guardarSesion(sesionActual ? sesionActual.id : null, payload);
    campos.guardar.disabled = false;
    campos.guardar.textContent = "Guardar";

    if (err) return fallar("No se pudo guardar: " + err.message);
    cerrar();
    if (alGuardar) alGuardar();
  });

  campos.borrar.addEventListener("click", async () => {
    if (!sesionActual) return cerrar();
    if (campos.borrar.dataset.confirmando !== "si") {
      campos.borrar.dataset.confirmando = "si";
      campos.borrar.textContent = "Confirmar borrado";
      return;
    }
    campos.borrar.disabled = true;
    const { error: err } = await borrarSesion(sesionActual.id);
    campos.borrar.disabled = false;
    if (err) return fallar("No se pudo borrar: " + err.message);
    cerrar();
    if (alGuardar) alGuardar();
  });
}

const fallar = mensaje => {
  campos.error.textContent = mensaje;
  campos.error.classList.add("show");
};

export function cerrar() {
  if (velo) velo.classList.remove("ver");
  sesionActual = null;
}

/**
 * abrir({ sesion, fecha, fichaId, alTerminar })
 *   sesion   → editar esa sesión
 *   fecha    → Date sugerida para una sesión nueva
 *   fichaId  → paciente preseleccionado
 */
export function abrirEditorSesion({ sesion = null, fecha = null, fichaId = null, alTerminar = null } = {}) {
  if (!velo) construir();
  alGuardar = alTerminar;
  sesionActual = sesion;

  // La lista de pacientes se rearma en cada apertura por si entró una ficha nueva
  campos.paciente.replaceChildren();
  const vacia = document.createElement("option");
  vacia.value = "";
  vacia.textContent = "Elegí un paciente…";
  campos.paciente.append(vacia);
  [...estado.fichas]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    .forEach(f => {
      const op = document.createElement("option");
      op.value = f.id;
      op.textContent = f.nombre;
      campos.paciente.append(op);
    });

  campos.titulo.textContent = sesion ? "Editar sesión" : "Nueva sesión";
  campos.borrar.style.display = sesion ? "" : "none";
  campos.borrar.dataset.confirmando = "no";
  campos.borrar.textContent = "Borrar";
  campos.error.classList.remove("show");

  if (sesion) {
    campos.paciente.value = sesion.ficha_id;
    campos.cuando.value = paraInputLocal(sesion.inicia_en);
    campos.duracion.value = String(sesion.duracion_min);
    campos.estadoSel.value = sesion.estado;
    campos.arancel.value = sesion.arancel ?? "";
    campos.pagada.checked = Boolean(sesion.pagada);
    campos.notas.value = sesion.notas || "";
  } else {
    const base = fecha ? new Date(fecha) : new Date();
    if (fecha) base.setHours(10, 0, 0, 0);
    campos.paciente.value = fichaId || "";
    campos.cuando.value = paraInputLocal(base.toISOString());
    campos.duracion.value = "60";
    campos.estadoSel.value = "programada";
    campos.arancel.value = "";
    campos.pagada.checked = false;
    campos.notas.value = "";
  }

  velo.classList.add("ver");
  setTimeout(() => (sesion ? campos.cuando : campos.paciente).focus(), 30);
}
