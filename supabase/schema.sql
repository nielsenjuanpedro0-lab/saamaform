-- =====================================================================
-- SAAMA — esquema de la base de fichas de admisión
--
-- Cómo aplicarlo: Supabase → tu proyecto → SQL Editor → pegar todo → Run.
-- Es idempotente: podés volver a correrlo sin romper nada.
--
-- Modelo de seguridad, en una línea: cualquiera puede ENVIAR una ficha,
-- nadie puede LEERLAS salvo un usuario logueado (la terapeuta).
-- =====================================================================

create extension if not exists "pgcrypto";

create table if not exists public.fichas (
  id                    uuid primary key default gen_random_uuid(),
  creado_en             timestamptz not null default now(),

  -- 01 · Datos personales
  nombre                text not null,
  lugar_nacimiento      text,
  fecha_nacimiento      date,
  profesion             text,
  trabajo               text,
  telefono              text not null,
  email                 text,

  -- 02 · Información del paciente
  motivo                text not null,
  sintomas              text,
  patologias_asociadas  text,
  patologias_otras      text,
  tratamientos          text,
  alergias              text,
  toxicos               text,

  -- 03 · Datos familiares
  familia_relacionados  text,
  familia_otros         text,

  -- 04 · Objetivo
  objetivo              text not null,

  -- Consentimiento del paciente para tratar sus datos de salud
  consentimiento        boolean not null default false,

  -- Seguimiento (solo lo edita la terapeuta desde /admin)
  estado                text not null default 'nueva'
                          check (estado in ('nueva','contactada','en_terapia','cerrada')),
  notas                 text,
  actualizado_en        timestamptz not null default now()
);

comment on table public.fichas is
  'Fichas de admisión de pacientes SAAMA. Contiene datos de salud: acceso restringido.';

create index if not exists fichas_creado_en_idx on public.fichas (creado_en desc);
create index if not exists fichas_estado_idx    on public.fichas (estado);

-- Marca de tiempo de la última edición hecha en el panel.
create or replace function public.tocar_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists fichas_actualizado_en on public.fichas;
create trigger fichas_actualizado_en
  before update on public.fichas
  for each row execute function public.tocar_actualizado_en();


-- ---------------------------------------------------------------------
-- Permisos a nivel de columna
--
-- El público (rol `anon`, la clave que viaja en el navegador) puede escribir
-- SOLO las columnas de la ficha. No puede tocar `estado`, `notas` ni `id`,
-- y no tiene ningún permiso de lectura: aunque alguien tome la anon key del
-- código fuente, no puede listar las fichas de nadie.
-- ---------------------------------------------------------------------

revoke all on public.fichas from anon;

grant insert (
  nombre, lugar_nacimiento, fecha_nacimiento, profesion, trabajo, telefono, email,
  motivo, sintomas, patologias_asociadas, patologias_otras, tratamientos, alergias, toxicos,
  familia_relacionados, familia_otros,
  objetivo, consentimiento
) on public.fichas to anon;

grant select, insert, update, delete on public.fichas to authenticated;


-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.fichas enable row level security;

drop policy if exists "publico envia ficha"    on public.fichas;
drop policy if exists "terapeuta lee"          on public.fichas;
drop policy if exists "terapeuta actualiza"    on public.fichas;
drop policy if exists "terapeuta borra"        on public.fichas;

-- Enviar: cualquiera, pero solo con el consentimiento tildado.
create policy "publico envia ficha"
  on public.fichas for insert
  to anon
  with check (consentimiento = true);

-- Leer, editar y borrar: únicamente usuarios logueados.
create policy "terapeuta lee"
  on public.fichas for select
  to authenticated
  using (true);

create policy "terapeuta actualiza"
  on public.fichas for update
  to authenticated
  using (true)
  with check (true);

create policy "terapeuta borra"
  on public.fichas for delete
  to authenticated
  using (true);


-- =====================================================================
-- Después de correr esto, creá la cuenta de la terapeuta:
--   Supabase → Authentication → Users → Add user
--   → email + contraseña, y tildá "Auto Confirm User".
--
-- Y cerrá el registro público para que nadie más pueda crearse una cuenta:
--   Supabase → Authentication → Sign In / Providers → Email
--   → desactivá "Allow new users to sign up".
-- =====================================================================
