// Datos del proyecto Supabase.
//
// Los dos valores salen de: Supabase → tu proyecto → Project Settings → API.
// La "anon key" es pública por diseño: va en el navegador y no da acceso a nada
// que las políticas RLS de supabase/schema.sql no permitan explícitamente.
//
// NUNCA pongas acá la "service_role key" — esa saltea todas las políticas.

export const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
export const SUPABASE_ANON_KEY = "TU-ANON-KEY";
