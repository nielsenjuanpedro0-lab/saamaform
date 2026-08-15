-- =====================================================================
-- SAAMA — agenda de sesiones
--
-- Correr DESPUÉS de schema.sql: Supabase → SQL Editor → pegar → Run.
-- Idempotente: se puede volver a correr sin romper nada.
--
-- Seguridad: a diferencia de `fichas`, acá el público NO tiene ningún
-- permiso. Las sesiones y sus notas son exclusivamente de la terapeuta.
-- =====================================================================

create table if not exists public.sesiones (
  id              uuid primary key default gen_random_uuid(),
  ficha_id        uuid not null references public.fichas(id) on delete cascade,

  inicia_en       timestamptz not null,
  duracion_min    integer not null default 60 check (duracion_min between 5 and 600),

  estado          text not null default 'programada'
                    check (estado in ('programada','realizada','cancelada','ausente')),

  -- Lo que la terapeuta registra de la sesión
  notas           text,

  -- Administración. Ambos opcionales: si no se usan, los reportes de
  -- dinero simplemente no aparecen.
  arancel         numeric(10,2) check (arancel is null or arancel >= 0),
  pagada          boolean not null default false,

  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

comment on table public.sesiones is
  'Sesiones agendadas por paciente. Datos de salud: acceso solo autenticado.';

create index if not exists sesiones_inicia_en_idx on public.sesiones (inicia_en desc);
create index if not exists sesiones_ficha_idx     on public.sesiones (ficha_id);
create index if not exists sesiones_estado_idx    on public.sesiones (estado);

drop trigger if exists sesiones_actualizado_en on public.sesiones;
create trigger sesiones_actualizado_en
  before update on public.sesiones
  for each row execute function public.tocar_actualizado_en();


-- ---------------------------------------------------------------------
-- Permisos: el público queda completamente afuera.
-- ---------------------------------------------------------------------

revoke all on public.sesiones from anon;
grant select, insert, update, delete on public.sesiones to authenticated;

alter table public.sesiones enable row level security;

drop policy if exists "terapeuta gestiona sesiones" on public.sesiones;

create policy "terapeuta gestiona sesiones"
  on public.sesiones for all
  to authenticated
  using (true)
  with check (true);

-- El nombre del paciente se trae con el join embebido de PostgREST
-- (`select=*,fichas(nombre,telefono)`), que respeta las políticas de ambas
-- tablas. No se crea una vista: una vista corre con los permisos de quien la
-- creó y puede saltear RLS sin que se note.
