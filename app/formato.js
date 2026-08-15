// Utilidades compartidas: construcción de nodos, fechas y formato.
//
// Todas las fechas se guardan en Postgres como timestamptz (UTC) y se muestran
// en la hora local de quien mira. Las claves de día se arman con los getters
// locales a propósito: usar toISOString() correría las sesiones de la noche al
// día siguiente.

export const crear = (etiqueta, clase, texto) => {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined && texto !== null) el.textContent = texto;
  return el;
};

export const vaciar = nodo => nodo.replaceChildren();

const dd = n => String(n).padStart(2, "0");

// ---------- Fechas ----------

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Clave YYYY-MM-DD en hora local. Sirve para agrupar por día. */
export const claveDia = f => `${f.getFullYear()}-${dd(f.getMonth() + 1)}-${dd(f.getDate())}`;

/** Clave YYYY-MM en hora local. Sirve para agrupar por mes. */
export const claveMes = f => `${f.getFullYear()}-${dd(f.getMonth() + 1)}`;

export const hoy = () => { const f = new Date(); f.setHours(0, 0, 0, 0); return f; };

export const esMismoDia = (a, b) => claveDia(a) === claveDia(b);

export const inicioDeMes = f => new Date(f.getFullYear(), f.getMonth(), 1);
export const finDeMes = f => new Date(f.getFullYear(), f.getMonth() + 1, 0, 23, 59, 59, 999);
export const sumarMeses = (f, n) => new Date(f.getFullYear(), f.getMonth() + n, 1);
export const sumarDias = (f, n) => {
  const r = new Date(f);
  r.setDate(r.getDate() + n);
  return r;
};

/** El lunes de la semana que contiene a f. La semana argentina arranca lunes. */
export const inicioDeSemana = f => {
  const r = new Date(f.getFullYear(), f.getMonth(), f.getDate());
  const desplazamiento = (r.getDay() + 6) % 7;   // domingo=0 → 6
  r.setDate(r.getDate() - desplazamiento);
  return r;
};

/** Las 42 celdas (6 semanas) de la grilla mensual que contiene a f. */
export const celdasDelMes = f => {
  const primera = inicioDeSemana(inicioDeMes(f));
  return Array.from({ length: 42 }, (_, i) => sumarDias(primera, i));
};

/** Los últimos n meses terminando en el actual, como [{clave, etiqueta, fecha}]. */
export const ultimosMeses = n => {
  const base = inicioDeMes(new Date());
  return Array.from({ length: n }, (_, i) => {
    const f = sumarMeses(base, i - n + 1);
    return { clave: claveMes(f), etiqueta: MESES[f.getMonth()].slice(0, 3), fecha: f };
  });
};

/** Los meses entre dos fechas, inclusive. */
export const mesesEntre = (desde, hasta) => {
  const meses = [];
  let f = inicioDeMes(desde);
  const tope = inicioDeMes(hasta);
  while (f <= tope) {
    meses.push({ clave: claveMes(f), etiqueta: MESES[f.getMonth()].slice(0, 3), fecha: f });
    f = sumarMeses(f, 1);
    if (meses.length > 120) break;   // red de seguridad
  }
  return meses;
};

// ---------- Presentación ----------

export const formatearFechaCorta = valor => {
  if (!valor) return "";
  const [a, m, d] = String(valor).slice(0, 10).split("-");
  return d && m && a ? `${d}/${m}/${a}` : valor;
};

export const formatearMomento = iso => {
  if (!iso) return "";
  const f = new Date(iso);
  return `${dd(f.getDate())}/${dd(f.getMonth() + 1)}/${f.getFullYear()} · ${dd(f.getHours())}:${dd(f.getMinutes())}`;
};

export const formatearHora = iso => {
  const f = iso instanceof Date ? iso : new Date(iso);
  return `${dd(f.getHours())}:${dd(f.getMinutes())}`;
};

export const formatearDiaLargo = f => {
  const d = f instanceof Date ? f : new Date(f);
  return `${DIAS_CORTOS[(d.getDay() + 6) % 7]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
};

/** Para los <input type="datetime-local">, que quieren hora local sin zona. */
export const paraInputLocal = iso => {
  const f = iso ? new Date(iso) : new Date();
  return `${f.getFullYear()}-${dd(f.getMonth() + 1)}-${dd(f.getDate())}T${dd(f.getHours())}:${dd(f.getMinutes())}`;
};

const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", maximumFractionDigits: 0
});
export const formatearPesos = n => pesos.format(Number(n) || 0);

const enteros = new Intl.NumberFormat("es-AR");
export const formatearNumero = n => enteros.format(Number(n) || 0);

/** "hace 3 días", "en 2 horas" — para listas donde importa la cercanía. */
export const cercania = iso => {
  const ms = new Date(iso) - new Date();
  const min = Math.round(ms / 60000);
  const abs = Math.abs(min);
  const decir = (valor, unidad) =>
    min >= 0 ? `en ${valor} ${unidad}` : `hace ${valor} ${unidad}`;

  if (abs < 1) return "ahora";
  if (abs < 60) return decir(abs, abs === 1 ? "minuto" : "minutos");
  const horas = Math.round(abs / 60);
  if (horas < 24) return decir(horas, horas === 1 ? "hora" : "horas");
  const dias = Math.round(horas / 24);
  if (dias < 31) return decir(dias, dias === 1 ? "día" : "días");
  const meses = Math.round(dias / 30);
  return decir(meses, meses === 1 ? "mes" : "meses");
};
