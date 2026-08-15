// Cliente de Supabase compartido por el formulario y el panel.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const configurado =
  !SUPABASE_URL.includes("TU-PROYECTO") && !SUPABASE_ANON_KEY.includes("TU-ANON-KEY");

export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "saama-sesion"
  }
});
