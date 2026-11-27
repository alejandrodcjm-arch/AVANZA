-- Versión 2: convivencia (incidencias detalladas y reconocimientos), corte semanal de pendientes,
-- carga del Excel del maestro y reportes de dirección.
-- Evidencia: avisos SEMANALES de tareas no entregadas (Bergman y Chan) y registro de incidencias con
-- fecha, hora, lugar, tipo y acción (formato SWIS/PBIS, "Big 5"). Ver docs/07-investigacion-v2.md.

-- Catálogos -----------------------------------------------------------------------------
create type public.incident_location as enum
  ('salon', 'patio', 'banos', 'pasillos', 'entrada_salida', 'comedor', 'deportes', 'transporte', 'en_linea', 'otro');
create type public.incident_category as enum
  ('interrupcion', 'incumplimiento', 'falta_respeto', 'agresion_verbal', 'agresion_fisica', 'acoso',
   'dano_material', 'celular', 'deshonestidad', 'otra');
create type public.incident_action as enum
  ('platica', 'llamada_atencion', 'aviso_familia', 'citatorio', 'reparacion', 'suspension', 'canalizacion', 'ninguna');
create type public.involvement as enum ('involucrado', 'afectado');
create type public.recognition_category as enum ('respeto', 'responsabilidad', 'esfuerzo', 'colaboracion', 'mejora', 'liderazgo');

-- Incidencias ----------------------------------------------------------------------------
-- La incidencia guarda lo interno (puede mencionar a varios alumnos). Cada alumno tiene su propio
-- registro en behavior_reports con un texto para SU familia que nunca nombra a otros niños.
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  occurred_on date not null,
  occurred_time time,
  location public.incident_location not null default 'salon',
  category public.incident_category not null,
  severity public.behavior_severity not null default 'minor',
  description text not null check (length(description) between 3 and 3000),
  action_taken public.incident_action not null default 'platica',
  reported_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index incidents_school_date_idx on public.incidents (school_id, occurred_on);

alter table public.behavior_reports
  add column incident_id uuid references public.incidents (id) on delete cascade,
  add column involvement public.involvement not null default 'involucrado',
  add column family_notified_at timestamptz;
create index behavior_reports_incident_idx on public.behavior_reports (incident_id);
create index behavior_reports_student_date_idx on public.behavior_reports (student_id, occurred_on);

alter table public.cases add column incident_id uuid references public.incidents (id) on delete set null;

-- Reconocimientos (sin puntos ni tablas de posiciones: solo se cuentan para el propio alumno) -----
create table public.recognitions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  category public.recognition_category not null,
  note text check (note is null or length(note) <= 300),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index recognitions_student_idx on public.recognitions (student_id, created_at desc);
create index recognitions_school_idx on public.recognitions (school_id, created_at);

-- Corte semanal: cuántos trabajos debe cada alumno por materia esa semana (0 = al corriente) -----
create table public.weekly_pending (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  pending_count smallint not null check (pending_count between 0 and 30),
  note text check (note is null or length(note) <= 300),
  recorded_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id, week_start)
);
create index weekly_pending_school_week_idx on public.weekly_pending (school_id, week_start);

-- Excel del maestro: queda registro de qué se subió (no el archivo) ---------------------------
alter table public.assignments add column source text not null default 'manual' check (source in ('manual', 'excel'));
create table public.gradebook_uploads (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  file_name text not null,
  summary jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- RLS -------------------------------------------------------------------------------------
alter table public.incidents enable row level security;
alter table public.recognitions enable row level security;
alter table public.weekly_pending enable row level security;
alter table public.gradebook_uploads enable row level security;

-- Incidencias: dirección ve todas; el maestro las que reportó o donde hay alumnos suyos. Familias: nunca.
create policy incidents_select on public.incidents for select to authenticated
  using (private.is_director(school_id) or reported_by = (select auth.uid())
         or exists (select 1 from public.behavior_reports b where b.incident_id = incidents.id
                    and private.teaches_student(b.student_id)));
create policy incidents_update on public.incidents for update to authenticated
  using (private.is_director(school_id) or reported_by = (select auth.uid()))
  with check (private.is_staff(school_id));

create policy recognitions_select on public.recognitions for select to authenticated
  using (private.can_view_student(student_id));
create policy recognitions_insert on public.recognitions for insert to authenticated
  with check (private.is_staff_for_student(student_id) and school_id = private.student_school(student_id)
              and created_by = (select auth.uid()));
create policy recognitions_delete on public.recognitions for delete to authenticated
  using (created_by = (select auth.uid()) or private.is_director(school_id));

create policy weekly_pending_select on public.weekly_pending for select to authenticated
  using (private.can_view_student(student_id));
create policy weekly_pending_write on public.weekly_pending for all to authenticated
  using (private.is_director(school_id) or private.teaches_student_subject(student_id, subject_id))
  with check ((private.is_director(school_id) or private.teaches_student_subject(student_id, subject_id))
              and school_id = private.student_school(student_id));

create policy gradebook_uploads_select on public.gradebook_uploads for select to authenticated
  using (private.is_director(school_id) or created_by = (select auth.uid()));
create policy gradebook_uploads_insert on public.gradebook_uploads for insert to authenticated
  with check ((private.is_director(school_id) or private.teaches_group_subject(group_id, subject_id))
              and created_by = (select auth.uid()) and school_id = private.group_school(group_id));

revoke all on public.incidents, public.recognitions, public.weekly_pending, public.gradebook_uploads from anon;
grant select, insert, update, delete on public.incidents, public.recognitions, public.weekly_pending, public.gradebook_uploads to authenticated;
grant all on public.incidents, public.recognitions, public.weekly_pending, public.gradebook_uploads to service_role;

create trigger audit_weekly_pending after insert or update or delete on public.weekly_pending
  for each row execute function private.audit_change();

-- Etiquetas en español (para avisos y reportes) --------------------------------------------
create or replace function private.category_label(c public.incident_category)
returns text language sql immutable set search_path = '' as $$
  select case c
    when 'interrupcion' then 'Interrupción de la clase' when 'incumplimiento' then 'Incumplimiento de material o uniforme'
    when 'falta_respeto' then 'Falta de respeto' when 'agresion_verbal' then 'Agresión verbal'
    when 'agresion_fisica' then 'Agresión física' when 'acoso' then 'Posible acoso escolar'
    when 'dano_material' then 'Daño a material o instalaciones' when 'celular' then 'Uso indebido del celular'
    when 'deshonestidad' then 'Deshonestidad académica' else 'Otra' end
$$;

create or replace function private.recognition_label(c public.recognition_category)
returns text language sql immutable set search_path = '' as $$
  select case c
    when 'respeto' then 'Respeto' when 'responsabilidad' then 'Responsabilidad' when 'esfuerzo' then 'Esfuerzo'
    when 'colaboracion' then 'Colaboración' when 'mejora' then 'Mejora' else 'Liderazgo' end
$$;

-- Registrar una incidencia ------------------------------------------------------------------
-- Una sola captura para varios alumnos. Moderada o grave → aviso a la familia (grave = urgente).
-- Posible acoso → se abre caso a cargo de dirección (protocolo SEP: detección, notificación, intervención, seguimiento).
create or replace function public.report_incident(
  p_involved uuid[], p_affected uuid[], p_occurred_on date, p_time time,
  p_location public.incident_location, p_category public.incident_category, p_severity public.behavior_severity,
  p_description text, p_action public.incident_action, p_family_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid; v_incident uuid; s uuid; v_all uuid[]; v_name text; v_dir uuid; v_case_student uuid;
  v_note text := nullif(trim(coalesce(p_family_note, '')), '');
begin
  v_all := coalesce(p_involved, '{}') || coalesce(p_affected, '{}');
  if cardinality(v_all) = 0 then raise exception 'elija al menos un alumno' using errcode = '22023'; end if;
  if cardinality(v_all) > 15 then raise exception 'máximo 15 alumnos por incidencia' using errcode = '22023'; end if;
  if p_occurred_on > current_date + 1 then raise exception 'la fecha no puede ser futura' using errcode = '22023'; end if;
  if p_description is null or length(trim(p_description)) < 3 then raise exception 'describa qué pasó' using errcode = '22023'; end if;
  foreach s in array v_all loop
    if not private.is_staff_for_student(s) then raise exception 'sin permiso' using errcode = '42501'; end if;
    if v_school is null then v_school := private.student_school(s);
    elsif v_school <> private.student_school(s) then raise exception 'alumnos de otra escuela' using errcode = '42501'; end if;
  end loop;

  insert into public.incidents (school_id, occurred_on, occurred_time, location, category, severity, description, action_taken, reported_by)
  values (v_school, p_occurred_on, p_time, p_location, p_category, p_severity, trim(p_description), p_action, auth.uid())
  returning id into v_incident;

  -- Lo que ve cada familia: solo sobre su hijo, nunca nombres de otros alumnos.
  insert into public.behavior_reports (school_id, student_id, occurred_on, severity, description, created_by, incident_id, involvement)
  select v_school, x.sid, p_occurred_on, p_severity,
         coalesce(v_note, case when x.inv = 'afectado' then 'Su hijo o hija se vio afectado en una situación en la escuela. Ya se está atendiendo.'
                               else private.category_label(p_category) || '.' end),
         auth.uid(), v_incident, x.inv::public.involvement
  from (select unnest(coalesce(p_involved, '{}')) as sid, 'involucrado' as inv
        union all select unnest(coalesce(p_affected, '{}')), 'afectado') x;

  -- Aviso a familias con aviso de privacidad aceptado (lo leve llega en el resumen semanal).
  if p_severity <> 'minor' then
    for s, v_name in select st.id, st.first_name from public.students st where st.id = any(v_all) loop
      perform private.notify(v_school, sg.guardian_id, s, 'case_update',
        case when s = any(coalesce(p_affected, '{}')) then 'Aviso de la escuela sobre ' || v_name
             else 'Reporte de conducta de ' || v_name end,
        case when p_severity = 'serious' then 'La escuela necesita platicar con usted. Abra el aviso para ver los detalles.'
             else 'Hubo una situación hoy que conviene platicar en casa. Abra el aviso para ver los detalles.' end,
        '/hijos/' || s || '#conducta', p_severity = 'serious')
      from public.student_guardians sg
      where sg.student_id = s and private.has_consent_of(sg.guardian_id, v_school);
      update public.behavior_reports set family_notified_at = now() where incident_id = v_incident and student_id = s;
    end loop;
  end if;

  -- Posible acoso: caso con dirección.
  if p_category = 'acoso' or p_severity = 'serious' then
    select m.user_id into v_dir from public.memberships m where m.school_id = v_school and m.role = 'director' limit 1;
    v_case_student := coalesce((coalesce(p_affected, '{}'))[1], (coalesce(p_involved, '{}'))[1]);
    insert into public.cases (school_id, student_id, owner_id, summary, opened_by, incident_id, status)
    values (v_school, v_case_student, coalesce(v_dir, auth.uid()),
            case when p_category = 'acoso' then 'Protocolo de acoso escolar: ' else 'Incidencia grave: ' end || left(trim(p_description), 200),
            auth.uid(), v_incident, 'escalated');
  end if;

  return v_incident;
end $$;

-- Consentimiento de un tutor concreto (para avisos generados por otra persona).
create or replace function private.has_consent_of(p_user uuid, p_school uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.consents c join public.schools s on s.id = c.school_id
                 where c.user_id = p_user and c.school_id = p_school and c.notice_version = s.privacy_notice_version)
$$;

-- Reconocimientos ---------------------------------------------------------------------------
create or replace function public.give_recognition(p_students uuid[], p_category public.recognition_category, p_note text default null)
returns integer language plpgsql set search_path = '' as $$
declare v_n int;
begin
  if cardinality(coalesce(p_students, '{}')) = 0 then raise exception 'elija al menos un alumno' using errcode = '22023'; end if;
  insert into public.recognitions (school_id, student_id, category, note, created_by)
  select private.student_school(s), s, p_category, nullif(trim(coalesce(p_note, '')), ''), auth.uid()
  from unnest(p_students) s;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Corte semanal ------------------------------------------------------------------------------
-- p_counts: {student_id: número de trabajos pendientes}. Se guarda todo el grupo (0 = al corriente).
create or replace function public.save_weekly_pending(p_group uuid, p_subject uuid, p_week date, p_counts jsonb)
returns integer language plpgsql set search_path = '' as $$
declare v_school uuid; v_week date := date_trunc('week', p_week)::date; v_n int;
begin
  select school_id into v_school from public.groups where id = p_group;
  if v_school is null then raise exception 'grupo no disponible' using errcode = 'P0002'; end if;
  if not (private.teaches_group_subject(p_group, p_subject) or private.is_director(v_school)) then
    raise exception 'no da esta materia en este grupo' using errcode = '42501';
  end if;
  if v_week > current_date then raise exception 'no se puede capturar una semana futura' using errcode = '22023'; end if;
  insert into public.weekly_pending (school_id, student_id, subject_id, week_start, pending_count, recorded_by)
  select v_school, e.student_id, p_subject, v_week,
         least(30, greatest(0, coalesce((p_counts ->> e.student_id::text)::int, 0))), auth.uid()
  from public.enrollments e join public.school_years y on y.id = e.school_year_id and y.is_current
  where e.group_id = p_group
  on conflict (student_id, subject_id, week_start) do update
    set pending_count = excluded.pending_count, recorded_by = excluded.recorded_by, updated_at = now()
    where public.weekly_pending.pending_count is distinct from excluded.pending_count;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Excel del maestro: crea las actividades y marca quién no entregó; opcionalmente guarda la calificación.
-- p_activities: [{title, due_on?, missing: [student_id...]}]
create or replace function public.import_gradebook(p_group uuid, p_subject uuid, p_file_name text, p_activities jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare v_school uuid; a jsonb; v_assignment uuid; v_acts int := 0; v_miss int := 0; v_k int;
begin
  select school_id into v_school from public.groups where id = p_group;
  if v_school is null then raise exception 'grupo no disponible' using errcode = 'P0002'; end if;
  if not (private.teaches_group_subject(p_group, p_subject) or private.is_director(v_school)) then
    raise exception 'no da esta materia en este grupo' using errcode = '42501';
  end if;
  if jsonb_array_length(coalesce(p_activities, '[]')) > 200 then raise exception 'máximo 200 actividades' using errcode = '22023'; end if;

  for a in select * from jsonb_array_elements(coalesce(p_activities, '[]')) loop
    -- Misma actividad (mismo título en el mismo grupo y materia) = se actualiza, no se duplica.
    select id into v_assignment from public.assignments
    where group_id = p_group and subject_id = p_subject and title = left(trim(a->>'title'), 200);
    if v_assignment is null then
      insert into public.assignments (school_id, group_id, subject_id, title, due_on, created_by, source)
      values (v_school, p_group, p_subject, left(trim(a->>'title'), 200),
              coalesce((a->>'due_on')::date, current_date), auth.uid(), 'excel')
      returning id into v_assignment;
    end if;
    perform public.set_assignment_misses(v_assignment,
      array(select jsonb_array_elements_text(coalesce(a->'missing', '[]'))::uuid));
    select count(*) into v_k from public.assignment_misses where assignment_id = v_assignment;
    v_miss := v_miss + v_k;
    v_acts := v_acts + 1;
    v_assignment := null;
  end loop;

  insert into public.gradebook_uploads (school_id, group_id, subject_id, file_name, summary, created_by)
  values (v_school, p_group, p_subject, left(coalesce(p_file_name, 'registro.xlsx'), 200),
          jsonb_build_object('activities', v_acts, 'missing', v_miss), auth.uid());
  return jsonb_build_object('activities', v_acts, 'missing', v_miss);
end $$;

grant execute on function public.report_incident(uuid[], uuid[], date, time, public.incident_location, public.incident_category,
  public.behavior_severity, text, public.incident_action, text), public.give_recognition(uuid[], public.recognition_category, text),
  public.save_weekly_pending(uuid, uuid, date, jsonb), public.import_gradebook(uuid, uuid, text, jsonb) to authenticated;
revoke execute on function public.report_incident(uuid[], uuid[], date, time, public.incident_location, public.incident_category,
  public.behavior_severity, text, public.incident_action, text), public.give_recognition(uuid[], public.recognition_category, text),
  public.save_weekly_pending(uuid, uuid, date, jsonb), public.import_gradebook(uuid, uuid, text, jsonb) from anon, public;
revoke execute on function private.has_consent_of(uuid, uuid) from anon, authenticated, public;

-- Pendientes de un alumno en un rango: corte semanal + actividades no entregadas (sin contar doble) ----
create or replace function private.pending_between(p_student uuid, p_from date, p_to date)
returns integer language sql stable security definer set search_path = '' as $$
  select case when auth.uid() is not null and not private.can_view_student(p_student) then null else
  coalesce((select sum(w.pending_count) from public.weekly_pending w
                   where w.student_id = p_student and w.week_start between date_trunc('week', p_from)::date and p_to), 0)::int
       + coalesce((select count(*) from public.assignment_misses m join public.assignments a on a.id = m.assignment_id
                   where m.student_id = p_student and a.due_on between p_from and p_to
                     -- si esa materia ya tiene corte semanal esa semana, el corte manda
                     and not exists (select 1 from public.weekly_pending w where w.student_id = p_student
                                     and w.subject_id = a.subject_id and w.week_start = date_trunc('week', a.due_on)::date)), 0)::int
  end
$$;

-- Motor de alertas: tareas incluyen el corte semanal; conducta cuenta solo a quien participó ------
create or replace function private.evaluate_alerts(p_school uuid default null, p_today date default current_date)
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; v_new int := 0; v_count int; v_started timestamptz := now();
begin
  for r in
    select s.id as school_id, ar.indicator, ar.threshold, ar.window_days
    from public.schools s join public.alert_rules ar on ar.school_id = s.id and ar.enabled
    where p_school is null or s.id = p_school
  loop
    v_count := 0;
    if r.indicator = 'attendance' then
      insert into public.alerts (school_id, student_id, indicator, detail)
      select r.school_id, x.student_id, 'attendance',
             jsonb_build_object('absences', x.absences, 'days', x.days, 'pct', round(100.0 * x.absences / x.days, 1), 'window_days', r.window_days)
      from (select a.student_id, count(*) filter (where a.status = 'absent') as absences, count(*) as days
            from public.attendance a
            where a.school_id = r.school_id and a.date > p_today - r.window_days and a.date <= p_today
            group by a.student_id) x
      where x.days >= 5 and 100.0 * x.absences / x.days >= r.threshold
      on conflict (student_id, indicator) where status = 'open' do nothing;
      get diagnostics v_count = row_count;
    elsif r.indicator = 'behavior' then
      insert into public.alerts (school_id, student_id, indicator, detail)
      select r.school_id, b.student_id, 'behavior', jsonb_build_object('reports', count(*), 'window_days', r.window_days)
      from public.behavior_reports b
      where b.school_id = r.school_id and b.involvement = 'involucrado'
        and b.occurred_on > p_today - r.window_days and b.occurred_on <= p_today
      group by b.student_id having count(*) >= r.threshold
      on conflict (student_id, indicator) where status = 'open' do nothing;
      get diagnostics v_count = row_count;
    elsif r.indicator = 'grades' then
      insert into public.alerts (school_id, student_id, indicator, detail)
      select r.school_id, t.student_id, 'grades',
             jsonb_build_object('subjects', jsonb_agg(jsonb_build_object('subject', t.subject_name, 'score', t.score, 'previous', t.previous_score)))
      from (select g.student_id, s.name as subject_name, g.score,
                   (select g2.score from public.grades g2 where g2.student_id = g.student_id and g2.subject_id = g.subject_id
                      and g2.period_id = private.previous_period(g.period_id)) as previous_score
            from public.grades g join public.subjects s on s.id = g.subject_id
            where g.school_id = r.school_id and g.period_id = private.current_period(r.school_id, p_today)) t
      where t.score < r.threshold or (t.previous_score is not null and t.previous_score - t.score >= 1)
      group by t.student_id
      on conflict (student_id, indicator) where status = 'open' do nothing;
      get diagnostics v_count = row_count;
    elsif r.indicator = 'assignments' then
      insert into public.alerts (school_id, student_id, indicator, detail)
      select r.school_id, x.student_id, 'assignments', jsonb_build_object('missed', x.n, 'window_days', r.window_days)
      from (select e.student_id, private.pending_between(e.student_id, p_today - r.window_days + 1, p_today) as n
            from public.enrollments e join public.school_years y on y.id = e.school_year_id and y.is_current
            where e.school_id = r.school_id) x
      where x.n >= r.threshold
      on conflict (student_id, indicator) where status = 'open' do nothing;
      get diagnostics v_count = row_count;
    end if;
    v_new := v_new + coalesce(v_count, 0);
  end loop;

  insert into public.notifications (school_id, user_id, kind, title, body, url)
  select x.school_id, x.user_id, 'alert', 'Alumnos que requieren apoyo',
         x.n || case when x.n = 1 then ' alerta nueva hoy.' else ' alertas nuevas hoy.' end, '/alertas'
  from (
    select al.school_id, ta.teacher_id as user_id, count(distinct al.id) as n
    from public.alerts al
    join public.enrollments e on e.student_id = al.student_id
    join public.teaching_assignments ta on ta.group_id = e.group_id and ta.is_homeroom
    where al.status = 'open' and al.created_at >= v_started and (p_school is null or al.school_id = p_school)
    group by al.school_id, ta.teacher_id
    union all
    select al.school_id, m.user_id, count(*)
    from public.alerts al join public.memberships m on m.school_id = al.school_id and m.role = 'director'
    where al.status = 'open' and al.created_at >= v_started and (p_school is null or al.school_id = p_school)
    group by al.school_id, m.user_id
  ) x
  where v_new > 0
    and not exists (select 1 from public.notifications n where n.user_id = x.user_id and n.kind = 'alert'
                    and n.created_at > now() - interval '20 hours' and n.student_id is null);
  return v_new;
end $$;

-- Resumen semanal para papás: asistencia, pendientes por materia, reconocimientos y conducta leve ----
create or replace function private.build_weekly_digests(p_today date default current_date, p_school uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; v_n int := 0; v_week date := date_trunc('week', p_today)::date; v_parts text[]; v_pending text; v_rec text;
begin
  for r in
    select sg.school_id, sg.guardian_id, st.id as student_id, st.first_name,
           (select count(*) from public.attendance a where a.student_id = st.id and a.status = 'absent' and a.date between v_week and p_today) as week_absences,
           (select count(*) from public.attendance a where a.student_id = st.id and a.status = 'late' and a.date between v_week and p_today) as week_lates,
           (select count(*) from public.attendance a join public.periods p on p.id = private.current_period(st.school_id, p_today)
              where a.student_id = st.id and a.status = 'absent' and a.date between p.starts_on and p_today) as period_absences,
           (select count(*) from public.grades g where g.student_id = st.id and g.updated_at::date between v_week and p_today) as new_grades,
           (select count(*) from public.behavior_reports b where b.student_id = st.id and b.involvement = 'involucrado'
              and b.occurred_on between v_week and p_today) as week_reports
    from public.student_guardians sg
    join public.students st on st.id = sg.student_id
    where (p_school is null or sg.school_id = p_school)
      and private.has_consent_of(sg.guardian_id, sg.school_id)
      and not exists (select 1 from public.notifications n where n.user_id = sg.guardian_id and n.student_id = st.id
                      and n.kind = 'weekly_digest' and n.created_at > now() - interval '6 days')
  loop
    v_parts := array[]::text[];
    v_parts := v_parts || case when r.week_absences = 0 then 'Asistió todos los días de esta semana.'
                               when r.week_absences = 1 then 'Faltó 1 día esta semana.'
                               else 'Faltó ' || r.week_absences || ' días esta semana.' end;
    if r.week_lates > 0 then v_parts := v_parts || ('Llegó tarde ' || r.week_lates || case when r.week_lates = 1 then ' vez.' else ' veces.' end); end if;
    v_parts := v_parts || case when r.period_absences = 0 then 'No ha faltado en el trimestre.'
                               when r.period_absences = 1 then 'Lleva 1 falta en el trimestre.'
                               else 'Lleva ' || r.period_absences || ' faltas en el trimestre.' end;

    select string_agg(x.n || ' de ' || x.subject, ', ' order by x.subject) into v_pending
    from (select s.name as subject, sum(w.pending_count) as n from public.weekly_pending w join public.subjects s on s.id = w.subject_id
          where w.student_id = r.student_id and w.week_start = v_week and w.pending_count > 0 group by s.name) x;
    if v_pending is not null then v_parts := v_parts || ('Trabajos pendientes: ' || v_pending || '.');
    elsif exists (select 1 from public.weekly_pending w where w.student_id = r.student_id and w.week_start = v_week) then
      v_parts := v_parts || 'Entregó todos sus trabajos de la semana.'::text;
    end if;

    select string_agg(distinct lower(private.recognition_label(rc.category)), ', ') into v_rec
    from public.recognitions rc where rc.student_id = r.student_id and rc.created_at::date between v_week and p_today;
    if v_rec is not null then v_parts := v_parts || ('Recibió reconocimiento por ' || v_rec || '.'); end if;
    if r.week_reports > 0 then
      v_parts := v_parts || (r.week_reports || case when r.week_reports = 1 then ' reporte de conducta' else ' reportes de conducta' end || ' esta semana; los detalles están en la app.');
    end if;
    if r.new_grades > 0 then v_parts := v_parts || 'Hay calificaciones nuevas.'::text; end if;

    insert into public.notifications (school_id, user_id, student_id, kind, title, body, url)
    values (r.school_id, r.guardian_id, r.student_id, 'weekly_digest', 'La semana de ' || r.first_name,
            array_to_string(v_parts, ' '), '/hijos/' || r.student_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- Foto de datos para la IA: suma reconocimientos y pendientes del corte semanal -------------------
create or replace function public.build_summary_snapshot(p_student uuid, p_month date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_school uuid := private.student_school(p_student);
  v_from date := date_trunc('month', p_month)::date;
  v_to date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
  v_period uuid := private.current_period(private.student_school(p_student), (date_trunc('month', p_month) + interval '14 days')::date);
  v_grade_period uuid;
  v jsonb;
begin
  if auth.uid() is not null and not private.is_staff_for_student(p_student) then
    raise exception 'sin permiso' using errcode = '42501';
  end if;
  select g.period_id into v_grade_period from public.grades g join public.periods p on p.id = g.period_id
  where g.student_id = p_student and p.starts_on <= v_to order by p.starts_on desc limit 1;

  select jsonb_build_object(
    'student_first_name', st.first_name,
    'grades_period', (select p.name from public.periods p where p.id = v_grade_period),
    'month', to_char(v_from, 'YYYY-MM'),
    'teacher_name', (select pr.full_name from public.enrollments e
                       join public.teaching_assignments ta on ta.group_id = e.group_id and ta.is_homeroom
                       join public.profiles pr on pr.id = ta.teacher_id where e.student_id = st.id limit 1),
    'attendance', jsonb_build_object(
      'month_absences', (select count(*) from public.attendance a where a.student_id = st.id and a.status = 'absent' and a.date between v_from and v_to),
      'month_lates', (select count(*) from public.attendance a where a.student_id = st.id and a.status = 'late' and a.date between v_from and v_to),
      'month_days_recorded', (select count(*) from public.attendance a where a.student_id = st.id and a.date between v_from and v_to),
      'period_absences', (select count(*) from public.attendance a join public.periods p on p.id = v_period
                            where a.student_id = st.id and a.status = 'absent' and a.date between p.starts_on and v_to)),
    'grades', coalesce((
      select jsonb_agg(jsonb_build_object('subject', s.name, 'score', g.score, 'previous', prev.score,
               'trend', case when prev.score is null then 'sin_anterior' when g.score > prev.score then 'sube'
                             when g.score < prev.score then 'baja' else 'igual' end) order by s.name)
      from public.grades g join public.subjects s on s.id = g.subject_id
      left join public.grades prev on prev.student_id = g.student_id and prev.subject_id = g.subject_id
                                   and prev.period_id = private.previous_period(v_grade_period)
      where g.student_id = st.id and g.period_id = v_grade_period), '[]'::jsonb),
    'missed_assignments', coalesce((
      select jsonb_agg(jsonb_build_object('subject', x.subject, 'count', x.n) order by x.n desc)
      from (select s.name as subject, sum(x2.n)::int as n from (
              select w.subject_id, w.pending_count as n from public.weekly_pending w
              where w.student_id = st.id and w.week_start between date_trunc('week', v_from)::date and v_to
              union all
              select a.subject_id, 1 from public.assignment_misses m join public.assignments a on a.id = m.assignment_id
              where m.student_id = st.id and a.due_on between v_from and v_to
                and not exists (select 1 from public.weekly_pending w where w.student_id = st.id and w.subject_id = a.subject_id
                                and w.week_start = date_trunc('week', a.due_on)::date)) x2
            join public.subjects s on s.id = x2.subject_id group by s.name having sum(x2.n) > 0) x), '[]'::jsonb),
    'behavior_reports', (select count(*) from public.behavior_reports b where b.student_id = st.id and b.involvement = 'involucrado'
                           and b.occurred_on between v_from and v_to),
    'recognitions', coalesce((select jsonb_agg(jsonb_build_object('category', private.recognition_label(x.category), 'count', x.n) order by x.n desc)
                              from (select rc.category, count(*) as n from public.recognitions rc
                                    where rc.student_id = st.id and rc.created_at::date between v_from and v_to group by rc.category) x), '[]'::jsonb),
    'teacher_observations', coalesce((select jsonb_agg(o.body order by o.created_at) from public.observations o
                                      where o.student_id = st.id and o.created_at::date between v_from and v_to), '[]'::jsonb),
    'monthly_goal', (select jsonb_build_object('goal', mg.goal, 'achieved', mg.achieved)
                     from public.monthly_goals mg where mg.student_id = st.id and mg.month = v_from)
  ) into v
  from public.students st where st.id = p_student;
  return v;
end $$;

-- Ficha del alumno v2: su semana, historial de calificaciones, conducta y reconocimientos -------------
create or replace function public.student_overview(p_student uuid, p_today date default current_date)
returns jsonb language plpgsql stable set search_path = '' as $$
declare v_school uuid; v_period uuid; v_week date := date_trunc('week', p_today)::date; v jsonb;
begin
  select school_id into v_school from public.students where id = p_student;
  if v_school is null then raise exception 'alumno no disponible' using errcode = 'P0002'; end if;
  v_period := private.current_period(v_school, p_today);

  select jsonb_build_object(
    'student', jsonb_build_object('id', s.id, 'first_name', s.first_name, 'last_name', s.last_name, 'second_last_name', s.second_last_name),
    'group', (select jsonb_build_object('id', g.id, 'label', g.grade || '°' || g.name)
              from public.enrollments e join public.groups g on g.id = e.group_id
              join public.school_years y on y.id = e.school_year_id and y.is_current where e.student_id = s.id limit 1),
    'period', (select jsonb_build_object('id', p.id, 'name', p.name, 'starts_on', p.starts_on, 'ends_on', p.ends_on)
               from public.periods p where p.id = v_period),
    'attendance', (select jsonb_build_object(
                      'absences', count(*) filter (where a.status = 'absent'), 'lates', count(*) filter (where a.status = 'late'),
                      'excused', count(*) filter (where a.status = 'excused'), 'days', count(*),
                      'last_absence', max(a.date) filter (where a.status = 'absent'))
                   from public.attendance a join public.periods p on p.id = v_period
                   where a.student_id = s.id and a.date between p.starts_on and least(p.ends_on, p_today)),
    'week', jsonb_build_object(
      'start', v_week,
      'days', (select jsonb_agg(jsonb_build_object('date', d::date, 'status', a.status) order by d)
               from generate_series(v_week, v_week + 4, interval '1 day') d
               left join public.attendance a on a.student_id = s.id and a.date = d::date),
      'pending', coalesce((select jsonb_agg(jsonb_build_object('subject', su.name, 'count', w.pending_count, 'note', w.note) order by su.name)
                           from public.weekly_pending w join public.subjects su on su.id = w.subject_id
                           where w.student_id = s.id and w.week_start = v_week), '[]'::jsonb)),
    'grades', coalesce((
      select jsonb_agg(jsonb_build_object('subject', t.subject_name, 'period', t.period_name, 'score', t.score,
                                          'previous', t.previous_score, 'delta', t.delta) order by t.subject_name)
      from public.v_student_grade_trend t
      where t.student_id = s.id and t.sort = (select max(t2.sort) from public.v_student_grade_trend t2 where t2.student_id = s.id)), '[]'::jsonb),
    'grade_history', coalesce((
      select jsonb_agg(jsonb_build_object('subject', x.subject_name, 'points', x.pts) order by x.subject_name)
      from (select t.subject_name, jsonb_agg(jsonb_build_object('period', t.period_name, 'score', t.score) order by t.sort) as pts
            from public.v_student_grade_trend t where t.student_id = s.id group by t.subject_name) x), '[]'::jsonb),
    'pending_work', coalesce((
      select jsonb_agg(jsonb_build_object('subject', w.subject_name, 'title', w.title, 'due_on', w.due_on) order by w.due_on desc)
      from public.v_student_pending_work w where w.student_id = s.id and w.due_on > p_today - 30), '[]'::jsonb),
    'pending_30d', private.pending_between(s.id, p_today - 29, p_today),
    'goal', (select jsonb_build_object('id', mg.id, 'goal', mg.goal, 'achieved', mg.achieved, 'month', mg.month)
             from public.monthly_goals mg where mg.student_id = s.id order by mg.month desc limit 1),
    'summaries', coalesce((select jsonb_agg(jsonb_build_object('id', ms.id, 'month', ms.month) order by ms.month desc)
                           from public.monthly_summaries ms where ms.student_id = s.id and ms.status = 'approved'), '[]'::jsonb),
    'behavior', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'date', b.occurred_on, 'severity', b.severity,
                                   'involvement', b.involvement, 'text', b.description) order by b.occurred_on desc)
                          from (select * from public.behavior_reports b2 where b2.student_id = s.id and b2.occurred_on > p_today - 60
                                order by b2.occurred_on desc limit 10) b), '[]'::jsonb),
    'behavior_month', (select count(*) from public.behavior_reports b where b.student_id = s.id and b.involvement = 'involucrado'
                         and b.occurred_on > p_today - 30),
    'recognitions', coalesce((select jsonb_agg(jsonb_build_object('category', r.category, 'label', private.recognition_label(r.category),
                                     'note', r.note, 'date', r.created_at::date) order by r.created_at desc)
                              from (select * from public.recognitions r2 where r2.student_id = s.id and r2.created_at > p_today - 60
                                    order by r2.created_at desc limit 12) r), '[]'::jsonb)
  ) into v
  from public.students s where s.id = p_student;

  if v is null then raise exception 'alumno no disponible' using errcode = 'P0002'; end if;
  return v;
end $$;

-- Reportes de dirección ------------------------------------------------------------------

-- Asistencia: por grupo, serie diaria, ausentismo crónico y lista de faltas del día.
create or replace function public.report_attendance(p_school uuid, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_director(p_school) then raise exception 'sin permiso' using errcode = '42501'; end if;
  return jsonb_build_object(
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object('group_id', g.id, 'group', g.grade || '°' || g.name, 'students', x.students,
                        'records', x.records, 'absences', x.absences, 'lates', x.lates,
                        'rate', case when x.records > 0 then round(100.0 * (x.records - x.absences) / x.records, 1) end,
                        'chronic', x.chronic) order by g.grade, g.name)
      from public.groups g join public.school_years y on y.id = g.school_year_id and y.is_current
      cross join lateral (
        select (select count(*) from public.enrollments e where e.group_id = g.id) as students,
               count(a.*) as records, count(*) filter (where a.status = 'absent') as absences,
               count(*) filter (where a.status = 'late') as lates,
               (select count(*) from (select a2.student_id from public.attendance a2 where a2.group_id = g.id and a2.date between p_from and p_to
                                      group by a2.student_id having count(*) >= 5 and count(*) filter (where a2.status = 'absent') * 10 >= count(*)) c) as chronic
        from public.attendance a where a.group_id = g.id and a.date between p_from and p_to) x
      where g.school_id = p_school), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('date', d.date, 'rate', d.rate, 'absences', d.absences) order by d.date)
      from (select a.date, round(100.0 * count(*) filter (where a.status <> 'absent') / count(*), 1) as rate,
                   count(*) filter (where a.status = 'absent') as absences
            from public.attendance a where a.school_id = p_school and a.date between p_from and p_to group by a.date) d), '[]'::jsonb),
    'today', coalesce((
      select jsonb_agg(jsonb_build_object('student_id', st.id, 'name', st.first_name || ' ' || st.last_name,
                        'group', g.grade || '°' || g.name, 'status', a.status) order by g.grade, g.name, st.last_name)
      from public.attendance a join public.students st on st.id = a.student_id join public.groups g on g.id = a.group_id
      where a.school_id = p_school and a.date = p_to and a.status in ('absent', 'late', 'excused')), '[]'::jsonb),
    'chronic_students', coalesce((
      select jsonb_agg(jsonb_build_object('student_id', x.student_id, 'name', st.first_name || ' ' || st.last_name,
                        'group', g.grade || '°' || g.name, 'absences', x.absences, 'days', x.days,
                        'pct', round(100.0 * x.absences / x.days, 1)) order by x.absences * 1.0 / x.days desc)
      from (select a.student_id, a.group_id, count(*) as days, count(*) filter (where a.status = 'absent') as absences
            from public.attendance a where a.school_id = p_school and a.date between p_from and p_to
            group by a.student_id, a.group_id having count(*) >= 5 and count(*) filter (where a.status = 'absent') * 10 >= count(*)) x
      join public.students st on st.id = x.student_id join public.groups g on g.id = x.group_id), '[]'::jsonb));
end $$;

-- Calificaciones de un periodo: promedio y reprobados por grupo y materia, avance de captura por maestro.
create or replace function public.report_grades(p_school uuid, p_period uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_director(p_school) then raise exception 'sin permiso' using errcode = '42501'; end if;
  return jsonb_build_object(
    'by_group_subject', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.grade, x.grp, x.subject)
      from (select g.grade, g.grade || '°' || g.name as "group", g.name as grp, g.id as group_id, su.name as subject,
                   round(avg(gr.score), 2) as average, count(gr.*) filter (where gr.score < 6) as failing,
                   count(gr.*) as captured, count(e.*) as students
            from public.teaching_assignments ta
            join public.groups g on g.id = ta.group_id join public.school_years y on y.id = g.school_year_id and y.is_current
            join public.subjects su on su.id = ta.subject_id
            left join public.enrollments e on e.group_id = g.id
            left join public.grades gr on gr.student_id = e.student_id and gr.subject_id = su.id and gr.period_id = p_period
            where ta.school_id = p_school group by g.id, g.grade, g.name, su.id, su.name) x), '[]'::jsonb),
    'by_subject', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.subject)
      from (select su.name as subject, round(avg(gr.score), 2) as average, count(*) filter (where gr.score < 6) as failing, count(*) as captured
            from public.grades gr join public.subjects su on su.id = gr.subject_id
            where gr.school_id = p_school and gr.period_id = p_period group by su.name) x), '[]'::jsonb),
    'distribution', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', b.bucket, 'count', b.n) order by b.bucket)
      from (select case when score < 6 then '5' when score < 7 then '6' when score < 8 then '7' when score < 9 then '8' else '9-10' end as bucket,
                   count(*) as n from public.grades where school_id = p_school and period_id = p_period group by 1) b), '[]'::jsonb),
    'students_failing', coalesce((
      select jsonb_agg(jsonb_build_object('student_id', x.student_id, 'name', st.first_name || ' ' || st.last_name, 'group', x.grp,
                        'subjects', x.subjects, 'count', x.n) order by x.n desc, st.last_name)
      from (select gr.student_id, min(g.grade || '°' || g.name) as grp, count(*) as n, jsonb_agg(su.name || ' (' || gr.score || ')') as subjects
            from public.grades gr join public.subjects su on su.id = gr.subject_id
            join public.enrollments e on e.student_id = gr.student_id join public.groups g on g.id = e.group_id
            join public.school_years y on y.id = e.school_year_id and y.is_current
            where gr.school_id = p_school and gr.period_id = p_period and gr.score < 6 group by gr.student_id) x
      join public.students st on st.id = x.student_id), '[]'::jsonb),
    'capture_by_teacher', coalesce((
      select jsonb_agg(jsonb_build_object('teacher', pr.full_name, 'expected', x.expected, 'captured', x.captured,
                        'pct', case when x.expected > 0 then round(100.0 * x.captured / x.expected) end) order by x.ratio)
      from (select ta.teacher_id, count(e.*) as expected, count(gr.*) as captured, count(gr.*) * 1.0 / nullif(count(e.*), 0) as ratio
            from public.teaching_assignments ta
            join public.groups g on g.id = ta.group_id join public.school_years y on y.id = g.school_year_id and y.is_current
            join public.enrollments e on e.group_id = g.id
            left join public.grades gr on gr.student_id = e.student_id and gr.subject_id = ta.subject_id and gr.period_id = p_period
            where ta.school_id = p_school group by ta.teacher_id) x
      join public.profiles pr on pr.id = x.teacher_id), '[]'::jsonb));
end $$;

-- Convivencia ("Big 5"): cuántas por día, de qué tipo, dónde, a qué hora, quiénes; más grupo y reconocimientos.
create or replace function public.report_behavior(p_school uuid, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_days int;
begin
  if not private.is_director(p_school) then raise exception 'sin permiso' using errcode = '42501'; end if;
  select greatest(1, count(distinct a.date)) into v_days from public.attendance a where a.school_id = p_school and a.date between p_from and p_to;
  return jsonb_build_object(
    'total', (select count(*) from public.incidents i where i.school_id = p_school and i.occurred_on between p_from and p_to),
    'school_days', v_days,
    'per_day', round((select count(*) from public.incidents i where i.school_id = p_school and i.occurred_on between p_from and p_to)::numeric / v_days, 2),
    'by_month', coalesce((select jsonb_agg(jsonb_build_object('month', m.month, 'count', m.n, 'per_day', m.per_day) order by m.month)
              from (select im.month, im.n,
                           round(im.n::numeric / greatest(1, (select count(distinct a.date) from public.attendance a where a.school_id = p_school
                                  and to_char(a.date, 'YYYY-MM') = im.month)), 2) as per_day
                    from (select to_char(i.occurred_on, 'YYYY-MM') as month, count(*) as n
                          from public.incidents i where i.school_id = p_school and i.occurred_on between p_from and p_to group by 1) im) m), '[]'::jsonb),
    'by_category', coalesce((select jsonb_agg(jsonb_build_object('key', x.category, 'label', private.category_label(x.category), 'count', x.n) order by x.n desc)
              from (select category, count(*) as n from public.incidents where school_id = p_school and occurred_on between p_from and p_to group by category) x), '[]'::jsonb),
    'by_location', coalesce((select jsonb_agg(jsonb_build_object('key', x.location, 'count', x.n) order by x.n desc)
              from (select location, count(*) as n from public.incidents where school_id = p_school and occurred_on between p_from and p_to group by location) x), '[]'::jsonb),
    'by_hour', coalesce((select jsonb_agg(jsonb_build_object('hour', x.h, 'count', x.n) order by x.h)
              from (select extract(hour from occurred_time)::int as h, count(*) as n from public.incidents
                    where school_id = p_school and occurred_on between p_from and p_to and occurred_time is not null group by 1) x), '[]'::jsonb),
    'by_severity', coalesce((select jsonb_agg(jsonb_build_object('key', x.severity, 'count', x.n))
              from (select severity, count(*) as n from public.incidents where school_id = p_school and occurred_on between p_from and p_to group by severity) x), '[]'::jsonb),
    'by_group', coalesce((select jsonb_agg(jsonb_build_object('group', x.grp, 'count', x.n) order by x.n desc)
              from (select g.grade || '°' || g.name as grp, count(distinct b.incident_id) as n
                    from public.behavior_reports b join public.enrollments e on e.student_id = b.student_id
                    join public.groups g on g.id = e.group_id join public.school_years y on y.id = e.school_year_id and y.is_current
                    where b.school_id = p_school and b.involvement = 'involucrado' and b.occurred_on between p_from and p_to group by 1) x), '[]'::jsonb),
    'by_student', coalesce((select jsonb_agg(jsonb_build_object('student_id', x.student_id, 'name', st.first_name || ' ' || st.last_name,
                              'count', x.n, 'serious', x.serious) order by x.n desc)
              from (select b.student_id, count(*) as n, count(*) filter (where b.severity = 'serious') as serious
                    from public.behavior_reports b where b.school_id = p_school and b.involvement = 'involucrado'
                      and b.occurred_on between p_from and p_to group by b.student_id having count(*) >= 2 order by count(*) desc limit 15) x
              join public.students st on st.id = x.student_id), '[]'::jsonb),
    'bullying_open', (select count(*) from public.cases c join public.incidents i on i.id = c.incident_id
                      where c.school_id = p_school and i.category = 'acoso' and c.status <> 'closed'),
    'recognitions', (select count(*) from public.recognitions r where r.school_id = p_school and r.created_at::date between p_from and p_to),
    'recognitions_by_category', coalesce((select jsonb_agg(jsonb_build_object('label', private.recognition_label(x.category), 'count', x.n) order by x.n desc)
              from (select category, count(*) as n from public.recognitions where school_id = p_school and created_at::date between p_from and p_to group by category) x), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'date', i.occurred_on, 'time', i.occurred_time, 'category', private.category_label(i.category),
                              'severity', i.severity, 'location', i.location, 'action', i.action_taken,
                              'students', (select jsonb_agg(st.first_name || ' ' || st.last_name || case when b.involvement = 'afectado' then ' (afectado)' else '' end)
                                           from public.behavior_reports b join public.students st on st.id = b.student_id where b.incident_id = i.id),
                              'reported_by', (select pr.full_name from public.profiles pr where pr.id = i.reported_by)) order by i.occurred_on desc, i.created_at desc)
              from (select * from public.incidents where school_id = p_school and occurred_on between p_from and p_to order by occurred_on desc, created_at desc limit 30) i), '[]'::jsonb));
end $$;

-- Cumplimiento docente: lo que la dirección revisa de cada maestro.
create or replace function public.report_staff(p_school uuid, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_director(p_school) then raise exception 'sin permiso' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'teacher', pr.full_name, 'teacher_id', m.user_id,
      'groups', (select string_agg(distinct g.grade || '°' || g.name, ', ') from public.teaching_assignments ta join public.groups g on g.id = ta.group_id
                 join public.school_years y on y.id = g.school_year_id and y.is_current where ta.teacher_id = m.user_id),
      'attendance_days', (select count(distinct (a.group_id, a.date)) from public.attendance a
                          where a.recorded_by = m.user_id and a.date between p_from and p_to),
      'expected_days', (select count(*) from public.teaching_assignments ta join public.groups g on g.id = ta.group_id
                        join public.school_years y on y.id = g.school_year_id and y.is_current
                        where ta.teacher_id = m.user_id and ta.is_homeroom)
                       * (select count(*) from generate_series(p_from, p_to, interval '1 day') d where extract(isodow from d) < 6),
      'weekly_cuts', (select count(distinct (w.subject_id, w.week_start)) from public.weekly_pending w
                      where w.recorded_by = m.user_id and w.week_start between date_trunc('week', p_from)::date and p_to),
      'incidents', (select count(*) from public.incidents i where i.reported_by = m.user_id and i.occurred_on between p_from and p_to),
      'recognitions', (select count(*) from public.recognitions r where r.created_by = m.user_id and r.created_at::date between p_from and p_to),
      'summaries_approved', (select count(*) from public.monthly_summaries s where s.approved_by = m.user_id and s.approved_at::date between p_from and p_to),
      'observations', (select count(*) from public.observations o where o.created_by = m.user_id and o.created_at::date between p_from and p_to),
      'last_activity', greatest((select max(a.date) from public.attendance a where a.recorded_by = m.user_id),
                                (select max(w.updated_at::date) from public.weekly_pending w where w.recorded_by = m.user_id))
    ) order by pr.full_name)
    from public.memberships m join public.profiles pr on pr.id = m.user_id
    where m.school_id = p_school and m.role = 'teacher'), '[]'::jsonb);
end $$;

grant execute on function public.report_attendance(uuid, date, date), public.report_grades(uuid, uuid),
  public.report_behavior(uuid, date, date), public.report_staff(uuid, date, date) to authenticated;
revoke execute on function public.report_attendance(uuid, date, date), public.report_grades(uuid, uuid),
  public.report_behavior(uuid, date, date), public.report_staff(uuid, date, date) from anon, public;
-- private no se expone por la API; las funciones de la app la usan con la sesión del usuario.
revoke execute on function private.pending_between(uuid, date, date) from anon, public;
grant execute on function private.pending_between(uuid, date, date) to authenticated, service_role;
