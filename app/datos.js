// Estado en memoria y acceso a datos del panel.
//
// El consultorio es de una sola persona con un volumen chico, así que las
// fichas y las sesiones se traen enteras una vez y todo el filtrado ocurre en
// el navegador: es instantáneo y evita una consulta por cada clic. Si algún
// día esto pasa de unos miles de registros, el cambio es paginar acá adentro
// sin tocar las vistas.

import { dbPanel as db } from "./db.js";
import { claveDia } from "./formato.js";

export const estado = {
  fichas: [],
  sesiones: [],
  cargado: false
};

/** Quien quiera enterarse de que los datos cambiaron se suscribe acá. */
const oyentes = new Set();
export const alCambiar = fn => { oyentes.add(fn); return () => oyentes.delete(fn); };
const avisar = () => oyentes.forEach(fn => fn());

export async function cargarTodo() {
  const [fichas, sesiones] = await Promise.all([
    db.from("fichas").select("*").order("creado_en", { ascending: false }),
    db.from("sesiones").select("*, fichas(nombre, telefono)").order("inicia_en", { ascending: true })
  ]);

  if (fichas.error) return { error: fichas.error };

  estado.fichas = fichas.data || [];

  // La agenda es opcional: si todavía no corrieron 002_sesiones.sql, el panel
  // sigue funcionando con las fichas y avisa dónde hace falta.
  estado.faltaAgenda = Boolean(sesiones.error);
  estado.errorAgenda = sesiones.error ? sesiones.error.message : null;
  estado.sesiones = sesiones.error ? [] : (sesiones.data || []);

  estado.cargado = true;
  avisar();
  return {};
}

// ---------- Fichas ----------

export const fichaPorId = id => estado.fichas.find(f => f.id === id);

export async function guardarFicha(id, cambios) {
  const { error } = await db.from("fichas").update(cambios).eq("id", id);
  if (error) return { error };
  Object.assign(fichaPorId(id) || {}, cambios);
  avisar();
  return {};
}

export async function borrarFicha(id) {
  const { error } = await db.from("fichas").delete().eq("id", id);
  if (error) return { error };
  estado.fichas = estado.fichas.filter(f => f.id !== id);
  // La base borra las sesiones en cascada; el espejo en memoria hace lo mismo.
  estado.sesiones = estado.sesiones.filter(s => s.ficha_id !== id);
  avisar();
  return {};
}

// ---------- Sesiones ----------

export const sesionesDeFicha = id =>
  estado.sesiones
    .filter(s => s.ficha_id === id)
    .sort((a, b) => new Date(b.inicia_en) - new Date(a.inicia_en));

/** Sesiones agrupadas por día local: { "2026-08-15": [sesión, …] } */
export function sesionesPorDia() {
  const mapa = new Map();
  estado.sesiones.forEach(s => {
    const clave = claveDia(new Date(s.inicia_en));
    if (!mapa.has(clave)) mapa.set(clave, []);
    mapa.get(clave).push(s);
  });
  mapa.forEach(lista => lista.sort((a, b) => new Date(a.inicia_en) - new Date(b.inicia_en)));
  return mapa;
}

/** Las próximas n sesiones que todavía no pasaron y no están canceladas. */
export const proximasSesiones = (n = 5) => {
  const ahora = new Date();
  return estado.sesiones
    .filter(s => new Date(s.inicia_en) >= ahora && s.estado === "programada")
    .sort((a, b) => new Date(a.inicia_en) - new Date(b.inicia_en))
    .slice(0, n);
};

const conNombre = sesion => {
  const ficha = fichaPorId(sesion.ficha_id);
  return { ...sesion, fichas: ficha ? { nombre: ficha.nombre, telefono: ficha.telefono } : null };
};

export async function guardarSesion(id, campos) {
  if (id) {
    const { error } = await db.from("sesiones").update(campos).eq("id", id);
    if (error) return { error };
    const actual = estado.sesiones.find(s => s.id === id);
    if (actual) Object.assign(actual, campos, { fichas: conNombre({ ...actual, ...campos }).fichas });
  } else {
    const { data, error } = await db.from("sesiones").insert(campos).select().single();
    if (error) return { error };
    estado.sesiones.push(conNombre(data));
  }
  estado.sesiones.sort((a, b) => new Date(a.inicia_en) - new Date(b.inicia_en));
  avisar();
  return {};
}

export async function borrarSesion(id) {
  const { error } = await db.from("sesiones").delete().eq("id", id);
  if (error) return { error };
  estado.sesiones = estado.sesiones.filter(s => s.id !== id);
  avisar();
  return {};
}
