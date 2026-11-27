-- v3: calendario del ciclo (con suscripción para Google/Apple/Outlook), horarios por grupo
-- y estado de cuenta de colegiaturas. Ver docs/08-calendario-horarios-pagos.md.

create type public.event_kind as enum ('sin_clases', 'vacaciones', 'cte', 'examen', 'boletas', 'junta', 'evento', 'pago', 'otro');

-- Calendario ----------------------------------------------------------------------------------
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,          -- null = toda la escuela
  subject_id uuid references public.subjects (id) on delete set null,
  kind public.event_kind not null,
  title text not null check (length(trim(title)) between 2 and 120),
  description text check (length(description) <= 1000),
  starts_on date not null,
  ends_on date not null,
  start_time time,
  end_time time,
  staff_only boolean not null default false,                              -- p. ej. registro de calificaciones
  announced_at timestamptz,                                               -- ya se avisó a las familias
  source text not null default 'escuela' check (source in ('escuela', 'sep')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on and ends_on - starts_on <= 62),
  check (end_time is null or (start_time is not null and end_time > start_time))
);
create index calendar_events_school_idx on public.calendar_events (school_id, starts_on);
create index calendar_events_group_idx on public.calendar_events (group_id) where group_id is not null;
create unique index calendar_events_sep_once on public.calendar_events (school_id, starts_on, title) where source = 'sep';

-- Horarios ------------------------------------------------------------------------------------
create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 6),              -- 1 = lunes (ISO)
  starts_at time not null,
  ends_at time not null,
  subject_id uuid references public.subjects (id) on delete cascade,
  label text check (length(trim(label)) between 1 and 60),                -- Recreo, Honores, Inglés…
  room text check (length(room) <= 40),
  check (ends_at > starts_at),
  check (subject_id is not null or label is not null),
  unique (group_id, weekday, starts_at)
);
create index schedule_blocks_group_idx on public.schedule_blocks (group_id);

-- Colegiaturas --------------------------------------------------------------------------------
-- Solo la familia del alumno y dirección. Los maestros no ven pagos (Profeco: nunca exhibir adeudos).
alter table public.schools add column payment_info text check (length(payment_info) <= 1000);

create table public.tuition_charges (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  concept text not null check (length(trim(concept)) between 2 and 80),
  amount numeric(10, 2) not null check (amount > 0 and amount < 1000000),
  paid numeric(10, 2) not null default 0 check (paid >= 0),
  due_on date not null,
  paid_on date,
  reminded_at timestamptz,
  overdue_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, concept)
);
create index tuition_charges_school_idx on public.tuition_charges (school_id, due_on);

-- Suscripción privada al calendario (un enlace secreto por persona) ---------------------------
create table public.calendar_feeds (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

-- Ayudas de permisos --------------------------------------------------------------------------
create or replace function private.guardian_in_group(p_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrollments e join public.student_guardians sg on sg.student_id = e.student_id
                 where e.group_id = p_group and sg.guardian_id = (select auth.uid()) and private.has_consent(sg.school_id));
$$;

create or replace function private.guardian_in_school(p_school uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.student_guardians sg
                 where sg.school_id = p_school and sg.guardian_id = (select auth.uid()))
         and private.has_consent(p_school);
$$;

-- RLS -----------------------------------------------------------------------------------------
alter table public.calendar_events enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.tuition_charges enable row level security;
alter table public.calendar_feeds enable row level security;

create policy calendar_events_select on public.calendar_events for select to authenticated
  using (
    (group_id is null and (private.is_staff(school_id) or (not staff_only and private.guardian_in_school(school_id))))
    or (group_id is not null and (private.is_director(school_id) or private.teaches_group(group_id)
                                  or (not staff_only and private.guardian_in_group(group_id))))
  );
-- Dirección: todo. Maestro: exámenes, juntas y eventos de sus grupos.
create policy calendar_events_insert on public.calendar_events for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (group_id is null or private.group_school(group_id) = school_id)
    and (private.is_director(school_id)
         or (source = 'escuela' and group_id is not null and private.teaches_group(group_id)
             and kind in ('examen', 'junta', 'evento', 'otro')))
  );
create policy calendar_events_update on public.calendar_events for update to authenticated
  using (private.is_director(school_id) or (created_by = (select auth.uid()) and group_id is not null and private.teaches_group(group_id)))
  with check ((group_id is null or private.group_school(group_id) = school_id)
              and (private.is_director(school_id)
                   or (group_id is not null and private.teaches_group(group_id) and kind in ('examen', 'junta', 'evento', 'otro'))));
create policy calendar_events_delete on public.calendar_events for delete to authenticated
  using (private.is_director(school_id) or (created_by = (select auth.uid()) and group_id is not null and private.teaches_group(group_id)));

create policy schedule_blocks_select on public.schedule_blocks for select to authenticated
  using (private.is_director(school_id) or private.teaches_group(group_id) or private.guardian_in_group(group_id));
create policy schedule_blocks_write on public.schedule_blocks for all to authenticated
  using (private.is_director(school_id))
  with check (private.is_director(school_id) and private.group_school(group_id) = school_id);

create policy tuition_select on public.tuition_charges for select to authenticated
  using (private.is_director(school_id) or private.is_guardian_of(student_id));
create policy tuition_write on public.tuition_charges for all to authenticated
  using (private.is_director(school_id))
  with check (private.is_director(school_id) and private.student_school(student_id) = school_id);

create policy calendar_feeds_own on public.calendar_feeds for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.calendar_events, public.schedule_blocks, public.tuition_charges, public.calendar_feeds from anon;
grant select, insert, update, delete on public.calendar_events, public.schedule_blocks, public.tuition_charges, public.calendar_feeds to authenticated;
grant all on public.calendar_events, public.schedule_blocks, public.tuition_charges, public.calendar_feeds to service_role;

create trigger audit_tuition after insert or update or delete on public.tuition_charges
  for each row execute function private.audit_change();
create trigger set_updated_at_events before update on public.calendar_events
  for each row execute function private.set_updated_at();
create trigger set_updated_at_tuition before update on public.tuition_charges
  for each row execute function private.set_updated_at();

-- Calendario oficial SEP 2026-2027 (educación básica) -----------------------------------------
-- Fuente: calendario publicado por la SEP el 15 de julio de 2026. La escuela puede borrar o ajustar.
create or replace function private.insert_sep_calendar(p_school uuid, p_user uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare v int;
begin
  insert into public.calendar_events (school_id, kind, title, description, starts_on, ends_on, staff_only, source, created_by)
  select p_school, x.kind::public.event_kind, x.title, x.descr, x.s::date, x.e::date, x.staff, 'sep', p_user
  from (values
    ('evento', 'Inicio de clases', null, '2026-08-31', '2026-08-31', false),
    ('sin_clases', 'Sin clases: Día de la Independencia', null, '2026-09-16', '2026-09-16', false),
    ('cte', 'Sin clases: Consejo Técnico Escolar', 'Los maestros tienen sesión de Consejo Técnico.', '2026-09-25', '2026-09-25', false),
    ('cte', 'Sin clases: Consejo Técnico Escolar', 'Los maestros tienen sesión de Consejo Técnico.', '2026-10-30', '2026-10-30', false),
    ('sin_clases', 'Sin clases: Día de Muertos', null, '2026-11-02', '2026-11-02', false),
    ('boletas', 'Registro de calificaciones (SEP)', 'Fecha límite para registrar calificaciones del periodo.', '2026-11-13', '2026-11-13', true),
    ('sin_clases', 'Sin clases: Revolución Mexicana', null, '2026-11-16', '2026-11-16', false),
    ('boletas', 'Comunicación de resultados a familias', 'Semana para compartir resultados del primer periodo.', '2026-11-23', '2026-11-27', false),
    ('cte', 'Sin clases: Consejo Técnico Escolar', 'Los maestros tienen sesión de Consejo Técnico.', '2026-11-27', '2026-11-27', false),
    ('vacaciones', 'Vacaciones de invierno', 'Regreso a clases el jueves 7 de enero.', '2026-12-21', '2027-01-06', false),
    ('cte', 'Sin clases: Consejo Técnico Escolar', 'Los maestros tienen sesión de Consejo Técnico.', '2027-01-29', '2027-01-29', false),
    ('sin_clases', 'Sin clases: Día de la Constitución', null, '2027-02-01', '2027-02-01', false),
    ('evento', 'Preinscripciones ciclo 2027-2028', null, '2027-02-08', '2027-02-12', false),
    ('cte', 'Sin clases: Consejo Técnico Escolar', 'Los maestros tienen sesión de Consejo Técnico.', '2027-02-26', '2027-02-26', false),
    ('boletas', 'Registro de calificaciones (SEP)', 'Fecha límite para registrar calificaciones del periodo.', '2027-03-05', '2027-03-05', true),
    ('sin_clases', 'Sin clases: Natalicio de Benito Juárez', null, '2027-03-15', '2027-03-15', false),
    ('vacaciones', 'Vacaciones de primavera', 'Regreso a clases el lunes 5 de abril.', '2027-03-22', '2027-04-02', false),
    ('cte', 'Sin clases: Consejo Técnico Escolar', 'Los maestros tienen sesión de Consejo Técnico.', '2027-04-30', '2027-04-30', false),
    ('sin_clases', 'Sin clases: Batalla de Puebla', null, '2027-05-05', '2027-05-05', false),
    ('cte', 'Sin clases: Consejo Técnico Escolar', 'Los maestros tienen sesión de Consejo Técnico.', '2027-05-28', '2027-05-28', false),
    ('cte', 'Sin clases: Consejo Técnico Escolar', 'Los maestros tienen sesión de Consejo Técnico.', '2027-06-25', '2027-06-25', false),
    ('boletas', 'Registro de calificaciones (SEP)', 'Fecha límite para registrar calificaciones del periodo.', '2027-07-02', '2027-07-02', true),
    ('evento', 'Fin de cursos', null, '2027-07-09', '2027-07-09', false)
  ) as x(kind, title, descr, s, e, staff)
  on conflict (school_id, starts_on, title) where source = 'sep' do nothing;
  get diagnostics v = row_count;
  return v;
end $$;
revoke execute on function private.insert_sep_calendar(uuid, uuid) from public, anon, authenticated;

create or replace function public.load_sep_calendar(p_school uuid)
returns integer language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_director(p_school) then raise exception 'sin permiso' using errcode = '42501'; end if;
  return private.insert_sep_calendar(p_school, auth.uid());
end $$;
revoke execute on function public.load_sep_calendar(uuid) from public, anon;
grant execute on function public.load_sep_calendar(uuid) to authenticated;

-- Avisar a las familias de un evento (una vez). El calendario suscrito de Google tarda hasta un día;
-- lo que cambia la rutina (sin clases, juntas) debe llegar como aviso de la app.
create or replace function public.announce_event(p_event uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare e public.calendar_events; g uuid; v int := 0;
begin
  select * into e from public.calendar_events where id = p_event;
  if e.id is null then raise exception 'no existe' using errcode = 'P0002'; end if;
  if not (private.is_director(e.school_id)
          or (e.group_id is not null and e.created_by = auth.uid() and private.teaches_group(e.group_id))) then
    raise exception 'sin permiso' using errcode = '42501';
  end if;
  if e.staff_only then raise exception 'es un evento interno' using errcode = '22023'; end if;
  if e.announced_at is not null then raise exception 'ya se avisó' using errcode = '22023'; end if;
  for g in
    select distinct sg.guardian_id from public.student_guardians sg
    join public.enrollments en on en.student_id = sg.student_id
    join public.school_years y on y.id = en.school_year_id and y.is_current
    where sg.school_id = e.school_id and (e.group_id is null or en.group_id = e.group_id)
      and private.has_consent_of(sg.guardian_id, e.school_id)
  loop
    -- Sin alumno: una sola notificación por familia aunque tenga varios hijos.
    perform private.notify(e.school_id, g, null, 'system', e.title,
      'Fecha: ' || to_char(e.starts_on, 'DD/MM')
        || case when e.ends_on > e.starts_on then ' al ' || to_char(e.ends_on, 'DD/MM') else '' end
        || case when e.start_time is not null then ', ' || to_char(e.start_time, 'HH24:MI') || ' h' else '' end
        || coalesce('. ' || e.description, '.'),
      '/calendario', false);
    v := v + 1;
  end loop;
  update public.calendar_events set announced_at = now() where id = e.id;
  return v;
end $$;
revoke execute on function public.announce_event(uuid) from public, anon;
grant execute on function public.announce_event(uuid) to authenticated;

-- Horario de un grupo: se reemplaza completo (así se carga desde el Excel de la escuela) -----
create or replace function public.replace_schedule(p_group uuid, p_blocks jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_school uuid := private.group_school(p_group); v int;
begin
  if v_school is null or not private.is_director(v_school) then raise exception 'sin permiso' using errcode = '42501'; end if;
  if jsonb_typeof(p_blocks) <> 'array' or jsonb_array_length(p_blocks) > 80 then
    raise exception 'horario no válido' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_blocks) b(subject_id uuid)
             where b.subject_id is not null and b.subject_id not in (select id from public.subjects where school_id = v_school)) then
    raise exception 'materia de otra escuela' using errcode = '42501';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_blocks) x(weekday smallint, starts_at time, ends_at time)
             join jsonb_to_recordset(p_blocks) y(weekday smallint, starts_at time, ends_at time)
               on x.weekday = y.weekday and x.starts_at <= y.starts_at and y.starts_at < x.ends_at
                  and (x.starts_at, x.ends_at) is distinct from (y.starts_at, y.ends_at)) then
    raise exception 'hay clases que se enciman' using errcode = '22023';
  end if;
  delete from public.schedule_blocks where group_id = p_group;
  insert into public.schedule_blocks (school_id, group_id, weekday, starts_at, ends_at, subject_id, label, room)
  select v_school, p_group, b.weekday, b.starts_at, b.ends_at, b.subject_id, nullif(trim(b.label), ''), nullif(trim(b.room), '')
  from jsonb_to_recordset(p_blocks) b(weekday smallint, starts_at time, ends_at time, subject_id uuid, label text, room text);
  get diagnostics v = row_count;
  return v;
end $$;
revoke execute on function public.replace_schedule(uuid, jsonb) from public, anon;
grant execute on function public.replace_schedule(uuid, jsonb) to authenticated;

-- Importar el estado de cuenta (Excel de caja / administración) ------------------------------
-- Cada renglón: alumno, concepto, monto, vencimiento, pagado. Se actualiza por (alumno, concepto).
create or replace function public.import_tuition(p_school uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_new int; v_total int;
begin
  if not private.is_director(p_school) then raise exception 'sin permiso' using errcode = '42501'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 5000 then
    raise exception 'archivo no válido' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_rows) r(student_id uuid)
             where r.student_id is null or r.student_id not in (select id from public.students where school_id = p_school)) then
    raise exception 'alumno de otra escuela' using errcode = '42501';
  end if;
  select count(*) into v_new from (select distinct r.student_id, trim(r.concept) as concept
                                   from jsonb_to_recordset(p_rows) r(student_id uuid, concept text)) t
  where not exists (select 1 from public.tuition_charges c where c.student_id = t.student_id and c.concept = t.concept);
  insert into public.tuition_charges (school_id, student_id, concept, amount, paid, due_on, paid_on)
  select distinct on (t.student_id, t.concept) p_school, t.student_id, t.concept, t.amount, t.paid, t.due_on,
         case when t.paid >= t.amount then coalesce(t.paid_on, current_date) else t.paid_on end
  from (select r.student_id, trim(r.concept) as concept, r.amount::numeric(10,2) as amount,
               least(coalesce(r.paid, 0), r.amount)::numeric(10,2) as paid, r.due_on, r.paid_on
        from jsonb_to_recordset(p_rows) r(student_id uuid, concept text, amount numeric, paid numeric, due_on date, paid_on date)) t
  on conflict (student_id, concept) do update
    set amount = excluded.amount, paid = excluded.paid, due_on = excluded.due_on, paid_on = excluded.paid_on,
        -- si cambió la fecha, se vuelve a recordar
        reminded_at = case when public.tuition_charges.due_on <> excluded.due_on then null else public.tuition_charges.reminded_at end,
        overdue_notified_at = case when excluded.paid >= excluded.amount then public.tuition_charges.overdue_notified_at
                                   when public.tuition_charges.due_on <> excluded.due_on then null
                                   else public.tuition_charges.overdue_notified_at end;
  get diagnostics v_total = row_count;
  return jsonb_build_object('created', v_new, 'updated', v_total - v_new);
end $$;
revoke execute on function public.import_tuition(uuid, jsonb) from public, anon;
grant execute on function public.import_tuition(uuid, jsonb) to authenticated;

-- Resumen de cobranza para dirección (la lista de pendientes es privada: no se publica ni se comparte con maestros).
create or replace function public.tuition_report(p_school uuid, p_today date default current_date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not private.is_director(p_school) then raise exception 'sin permiso' using errcode = '42501'; end if;
  with c as (
    select t.*, (t.amount - t.paid) as owed from public.tuition_charges t where t.school_id = p_school
  ),
  grp as (
    select e.student_id, g.grade || '°' || g.name as label from public.enrollments e
    join public.groups g on g.id = e.group_id join public.school_years y on y.id = e.school_year_id and y.is_current
    where e.school_id = p_school
  )
  select jsonb_build_object(
    'expected', coalesce((select sum(amount) from c where due_on <= p_today), 0),
    'collected', coalesce((select sum(paid) from c where due_on <= p_today), 0),
    'overdue_amount', coalesce((select sum(owed) from c where due_on < p_today and owed > 0), 0),
    'overdue_students', (select count(distinct student_id) from c where due_on < p_today and owed > 0),
    'students', (select count(distinct student_id) from c),
    'upcoming_amount', coalesce((select sum(owed) from c where due_on between p_today and p_today + 15 and owed > 0), 0),
    'upcoming_count', (select count(*) from c where due_on between p_today and p_today + 15 and owed > 0),
    'last_update', (select max(updated_at) from c),
    'by_month', coalesce((select jsonb_agg(x order by x.month) from (
        select to_char(date_trunc('month', due_on), 'YYYY-MM') as month, sum(amount) as expected, sum(paid) as collected
        from c where due_on <= p_today group by 1) x), '[]'::jsonb),
    'overdue', coalesce((select jsonb_agg(x order by x.oldest_due, x.name) from (
        select c.student_id, st.last_name || coalesce(' ' || st.second_last_name, '') || ' ' || st.first_name as name, grp.label as "group",
               sum(c.owed) as owed, min(c.due_on) as oldest_due,
               jsonb_agg(jsonb_build_object('id', c.id, 'concept', c.concept, 'due_on', c.due_on, 'owed', c.owed) order by c.due_on) as items
        from c join public.students st on st.id = c.student_id left join grp on grp.student_id = c.student_id
        where c.due_on < p_today and c.owed > 0
        group by c.student_id, st.last_name, st.second_last_name, st.first_name, grp.label) x), '[]'::jsonb)
  ) into v;
  return v;
end $$;
revoke execute on function public.tuition_report(uuid, date) from public, anon;
grant execute on function public.tuition_report(uuid, date) to authenticated;

-- Recordatorios de pago: discretos, sin montos en la notificación (se ven en pantalla bloqueada).
-- 3 días antes del vencimiento y una sola vez 5 días después si sigue pendiente.
create or replace function private.tuition_reminders(p_today date default current_date)
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; v int := 0;
begin
  for r in
    select c.id, c.school_id, c.student_id, c.concept, c.due_on, st.first_name,
           case when c.due_on >= p_today then 'upcoming' else 'overdue' end as what
    from public.tuition_charges c join public.students st on st.id = c.student_id
    where c.paid < c.amount
      and ((c.reminded_at is null and c.due_on between p_today and p_today + 3)
           or (c.overdue_notified_at is null and c.due_on between p_today - 30 and p_today - 5))
  loop
    perform private.notify(r.school_id, sg.guardian_id, r.student_id, 'system',
      case when r.what = 'upcoming' then 'Próximo pago: ' || r.concept else 'Pago pendiente: ' || r.concept end,
      case when r.what = 'upcoming'
           then 'Vence el ' || to_char(r.due_on, 'DD/MM') || ' (' || r.first_name || '). Si ya pagó, no haga caso de este aviso.'
           else 'En el registro de la escuela este pago de ' || r.first_name || ' aparece pendiente. Si ya lo hizo, administración lo actualiza en unos días.' end,
      '/pagos', false)
    from public.student_guardians sg
    where sg.student_id = r.student_id and private.has_consent_of(sg.guardian_id, r.school_id);
    if r.what = 'upcoming' then update public.tuition_charges set reminded_at = now() where id = r.id;
    else update public.tuition_charges set overdue_notified_at = now() where id = r.id; end if;
    v := v + 1;
  end loop;
  return v;
end $$;
revoke execute on function private.tuition_reminders(date) from public, anon, authenticated;

-- Contenido del calendario suscrito (lo lee la ruta /api/calendario/<token> con la llave de servicio)
create or replace function public.calendar_feed(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid; v jsonb;
begin
  if p_token is null or length(p_token) < 40 then return null; end if;
  select user_id into v_user from public.calendar_feeds where token = p_token;
  if v_user is null then return null; end if;

  with m as (
    select m.school_id, m.role from public.memberships m
    where m.user_id = v_user and (m.role <> 'guardian' or private.has_consent_of(v_user, m.school_id))
  ),
  my_groups as (
    select ta.group_id from public.teaching_assignments ta where ta.teacher_id = v_user
    union
    select e.group_id from public.enrollments e join public.student_guardians sg on sg.student_id = e.student_id
    where sg.guardian_id = v_user and private.has_consent_of(v_user, sg.school_id)
  ),
  staff as (select distinct school_id from m where role <> 'guardian'),
  ev as (
    select ce.id, ce.kind, ce.title, ce.description, ce.starts_on, ce.ends_on, ce.start_time, ce.end_time, ce.updated_at,
           case when g.id is not null then g.grade || '°' || g.name end as group_label
    from public.calendar_events ce left join public.groups g on g.id = ce.group_id
    where ce.ends_on >= current_date - 60 and ce.starts_on <= current_date + 400
      and ce.school_id in (select school_id from m)
      and (not ce.staff_only or ce.school_id in (select school_id from staff))
      and (ce.group_id is null or ce.group_id in (select group_id from my_groups)
           or ce.school_id in (select school_id from m where role = 'director'))
  )
  select jsonb_build_object(
    'school', (select s.name from public.schools s where s.id = (select school_id from m limit 1)),
    'events', coalesce((select jsonb_agg(to_jsonb(ev) order by ev.starts_on) from ev), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'concept', c.concept, 'due_on', c.due_on, 'student', st.first_name) order by c.due_on)
      from public.tuition_charges c
      join public.students st on st.id = c.student_id
      join public.student_guardians sg on sg.student_id = c.student_id and sg.guardian_id = v_user
      where private.has_consent_of(v_user, c.school_id) and c.due_on >= current_date - 60), '[]'::jsonb),
    'classes', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'weekday', b.weekday, 'starts_at', b.starts_at, 'ends_at', b.ends_at,
                                          'subject', su.name, 'group', g.grade || '°' || g.name, 'room', b.room))
      from public.schedule_blocks b
      join public.teaching_assignments ta on ta.group_id = b.group_id and ta.subject_id = b.subject_id and ta.teacher_id = v_user
      join public.subjects su on su.id = b.subject_id
      join public.groups g on g.id = b.group_id
      join public.school_years y on y.id = g.school_year_id and y.is_current), '[]'::jsonb),
    'no_class', coalesce((
      select jsonb_agg(jsonb_build_object('from', ce.starts_on, 'to', ce.ends_on))
      from public.calendar_events ce
      where ce.group_id is null and ce.kind in ('sin_clases', 'vacaciones', 'cte') and ce.school_id in (select school_id from staff)), '[]'::jsonb),
    'year_end', (select max(y.ends_on) from public.school_years y where y.is_current and y.school_id in (select school_id from m))
  ) into v;
  return v;
end $$;
revoke execute on function public.calendar_feed(text) from public, anon, authenticated;
grant execute on function public.calendar_feed(text) to service_role;

-- Nuevo token (el anterior deja de funcionar)
create or replace function public.rotate_calendar_feed()
returns text language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  if auth.uid() is null then raise exception 'sin sesión' using errcode = '42501'; end if;
  delete from public.calendar_feeds where user_id = auth.uid();
  insert into public.calendar_feeds (user_id) values (auth.uid()) returning token into v;
  return v;
end $$;
revoke execute on function public.rotate_calendar_feed() from public, anon;
grant execute on function public.rotate_calendar_feed() to authenticated;

-- 09:00 Durango, diario: recordatorios de pago (si existe pg_cron) -------------------------------
do $outer$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron no disponible: se omite el recordatorio de pagos';
    return;
  end if;
  perform cron.schedule('recordatorio-pagos', '0 15 * * *', $$ select private.tuition_reminders() $$);
end $outer$;
