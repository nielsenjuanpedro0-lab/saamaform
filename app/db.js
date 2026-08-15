// Clientes de Supabase compartidos por el formulario y el panel.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const configurado =
  !SUPABASE_URL.includes("TU-PROYECTO") && !SUPABASE_ANON_KEY.includes("TU-ANON-KEY");

// Por defecto supabase-js coordina el refresco del token entre pestañas con la
// Web Locks API. Acá no aporta nada — una sola terapeuta, una sola pestaña — y
// se lo vio quedar esperando el candado para siempre: como toda consulta pide
// el token antes de salir, la página se cuelga en silencio (el formulario queda
// en "Enviando…" y el panel nunca pinta el login). Pasamos derecho.
const sinCandado = (_nombre, _espera, fn) => fn();

// El formulario público nunca tiene sesión: sin persistencia ni refresco.
export const dbPublico = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    lock: sinCandado
  }
});

// El panel sí mantiene la sesión de la terapeuta entre visitas.
export const dbPanel = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "saama-sesion",
    lock: sinCandado
  }
});
