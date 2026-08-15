// Datos del proyecto Supabase.
//
// Los dos valores salen de: Supabase → tu proyecto → Project Settings → API.
// La "anon key" es pública por diseño: va en el navegador y no da acceso a nada
// que las políticas RLS de supabase/schema.sql no permitan explícitamente.
//
// NUNCA pongas acá la "service_role key" — esa saltea todas las políticas.

export const SUPABASE_URL = "https://czvflamhjyrmksativiq.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dmZsYW1oanlybWtzYXRpdmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MDIwMjgsImV4cCI6MjEwMjM3ODAyOH0.uEuURP9QwRhpz6ytKaVos91MFbxfNi843bsGGolBliQ";
