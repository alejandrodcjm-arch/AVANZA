-- Utilidades de prueba: crear usuarios de Auth y simular su sesión.
-- Este archivo NO hace rollback: deja el esquema tests disponible para los demás archivos.
create extension if not exists pgtap with schema extensions;
create schema if not exists tests;
set search_path = public, extensions, tests;

create or replace function tests.create_user(p_name text)
returns uuid language plpgsql security definer as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values (v_id, p_name || '@test.mx', jsonb_build_object('full_name', p_name), 'authenticated', 'authenticated');
  return v_id;
end $$;

create or replace function tests.uid(p_name text)
returns uuid language sql stable security definer as $$
  select id from auth.users where email = p_name || '@test.mx'
$$;

-- Simula que p_name inició sesión: rol authenticated + claims del JWT (hasta fin de transacción).
create or replace function tests.login(p_name text)
returns void language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where email = p_name || '@test.mx';
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_id, 'email', p_name || '@test.mx', 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create or replace function tests.login_anon()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
end $$;

-- Ejecuta un UPDATE/DELETE como el usuario actual y regresa cuántas filas tocó (RLS filtra en silencio).
create or replace function tests.rows_affected(p_sql text)
returns integer language plpgsql as $$
declare n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $$;

grant usage on schema tests to anon, authenticated, service_role;
grant execute on all functions in schema tests to anon, authenticated, service_role;

select extensions.plan(1);
select extensions.ok(true, 'utilidades de prueba instaladas');
select * from extensions.finish();
