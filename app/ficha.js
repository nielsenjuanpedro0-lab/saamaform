// Definición de la ficha SAAMA: única fuente de verdad.
//
// El formulario público se construye a partir de esto, el panel /admin muestra
// cada ficha con estas mismas etiquetas y el CSV exporta estas mismas columnas.
// Agregar una pregunta = agregar un campo acá + una columna en supabase/schema.sql.
//
//   col        nombre de la columna en Postgres
//   label      cómo se ve la pregunta (formulario y panel)
//   tipo       text | tel | email | date | textarea
//   req        true = obligatorio para poder enviar
//   hint       aclaración bajo la etiqueta
//   medio      true = ocupa media fila en pantallas anchas

export const SECCIONES = [
  {
    num: "01",
    titulo: "Datos personales",
    nota: "La foto es opcional: si querés incluirla, envíala por WhatsApp aparte una vez que mandes la ficha.",
    campos: [
      { col: "nombre", label: "Nombre y apellidos", tipo: "text", req: true, autocomplete: "name" },
      { col: "lugar_nacimiento", label: "Lugar de nacimiento", tipo: "text", medio: true, placeholder: "Ciudad, provincia, país" },
      { col: "fecha_nacimiento", label: "Fecha de nacimiento", tipo: "date", medio: true },
      { col: "profesion", label: "Profesión", tipo: "text", medio: true },
      { col: "trabajo", label: "Trabajo actual", tipo: "text", medio: true },
      { col: "telefono", label: "Teléfono / WhatsApp", tipo: "tel", req: true, medio: true, autocomplete: "tel" },
      { col: "email", label: "Correo electrónico", tipo: "email", medio: true, opcional: true, autocomplete: "email" }
    ]
  },
  {
    num: "02",
    titulo: "Información del paciente",
    campos: [
      { col: "motivo", label: "Motivo principal de consulta", tipo: "textarea", req: true, hint: "Qué te trae a la terapia y desde cuándo lo presentás." },
      { col: "sintomas", label: "Síntomas relacionados", tipo: "textarea", hint: "Físicos, mentales y emocionales." },
      { col: "patologias_asociadas", label: "Patologías asociadas al problema actual", tipo: "textarea" },
      { col: "patologias_otras", label: "Otras patologías o intervenciones quirúrgicas", tipo: "textarea" },
      { col: "tratamientos", label: "Tratamientos actuales", tipo: "textarea", hint: "Medicación, terapias convencionales o alternativas que estés haciendo." },
      { col: "alergias", label: "Alergias", tipo: "text" },
      { col: "toxicos", label: "Consumo de tóxicos", tipo: "text", opcional: true, hint: "Tabaco, alcohol u otros." }
    ]
  },
  {
    num: "03",
    titulo: "Datos familiares",
    campos: [
      { col: "familia_relacionados", label: "Antecedentes familiares relacionados al motivo de consulta", tipo: "textarea" },
      { col: "familia_otros", label: "Otros antecedentes familiares de salud importantes", tipo: "textarea" }
    ]
  },
  {
    num: "04",
    titulo: "Tu objetivo",
    campos: [
      { col: "objetivo", label: "Qué te gustaría cambiar con la terapia SAAMA", tipo: "textarea", req: true, hint: "Aspectos físicos y/o emocionales." }
    ]
  }
];

export const CAMPOS = SECCIONES.flatMap(s => s.campos);
export const OBLIGATORIOS = CAMPOS.filter(c => c.req).map(c => c.col);

export const ESTADOS = [
  { valor: "nueva", label: "Nueva", plural: "Nuevas" },
  { valor: "contactada", label: "Contactada", plural: "Contactadas" },
  { valor: "en_terapia", label: "En terapia", plural: "En terapia" },
  { valor: "cerrada", label: "Cerrada", plural: "Cerradas" }
];

export const etiquetaEstado = valor =>
  (ESTADOS.find(e => e.valor === valor) || { label: valor }).label;

// Estados de una sesión agendada. `color` apunta a la variable CSS que usan
// los gráficos; `cuenta` marca las que suman como sesión efectivamente dada.
// Las sesiones son a distancia y se hacen sin el paciente presente, así que
// no existe "no asistió": o está pendiente, o se hizo, o se dio de baja.
export const SESION_ESTADOS = [
  { valor: "programada", label: "Pendiente",  plural: "Pendientes", color: "--dato-1", cuenta: false },
  { valor: "realizada",  label: "Realizada",  plural: "Realizadas", color: "--dato-3", cuenta: true },
  { valor: "cancelada",  label: "Cancelada",  plural: "Canceladas", color: "--dato-neutro", cuenta: false }
];

export const etiquetaSesion = valor =>
  (SESION_ESTADOS.find(e => e.valor === valor) || { label: valor }).label;


export const formatearFecha = valor => {
  if (!valor) return "";
  const [a, m, d] = String(valor).slice(0, 10).split("-");
  return d && m && a ? `${d}/${m}/${a}` : valor;
};

export const formatearMomento = iso => {
  if (!iso) return "";
  const f = new Date(iso);
  const dosDigitos = n => String(n).padStart(2, "0");
  return `${dosDigitos(f.getDate())}/${dosDigitos(f.getMonth() + 1)}/${f.getFullYear()} · ${dosDigitos(f.getHours())}:${dosDigitos(f.getMinutes())}`;
};

// Cómo se muestra el valor de un campo, ya listo para leer.
export const mostrarValor = (campo, valor) =>
  campo.tipo === "date" ? formatearFecha(valor) : (valor || "");
