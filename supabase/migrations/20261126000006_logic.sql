-- Lógica de negocio en la base: vistas de la ficha, motor de alertas, resumen semanal,
-- preparación del resumen mensual, aprobación y casos. Los números se calculan aquí, nunca en la IA.

-- Utilidades ---------------------------------------------------------------

create or replace function private.current_period(p_school uuid, p_day date)
returns uuid language sql stable security definer set search_path = '' as $$
  select p.id from public.periods p
  join public.school_years y on y.id = p.school_year_id
  where p.school_id = p_school and p.starts_on <= p_day
  order by p.starts_on desc limit 1
$$;

create or replace function private.previous_period(p_period uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select prev.id from public.periods cur
  join public.periods prev on prev.school_year_id = cur.school_year_id and prev.sort = cur.sort - 1
  where cur.id = p_period
$$;

-- Vistas para la ficha (security_invoker: respetan RLS de quien consulta) ----

create or replace view public.v_student_period_attendance with (security_invoker = true) as
select a.school_id, a.student_id, p.id as period_id, p.name as period_name, p.sort,
       count(*) filter (where a.status = 'absent') as absences,
       count(*) filter (where a.status = 'late') as lates,
       count(*) filter (where a.status = 'excused') as excused,
       count(*) as days_recorded
from public.attendance a
join public.periods p on p.school_id = a.school_id and a.date between p.starts_on and p.ends_on
group by a.school_id, a.student_id, p.id, p.name, p.sort;

create or replace view public.v_student_grade_trend with (security_invoker = true) as
select g.school_id, g.student_id, g.subject_id, s.name as subject_name, p.id as period_id, p.name as period_name, p.sort,
       g.score,
       lag(g.score) over (partition by g.student_id, g.subject_id order by p.sort) as previous_score,
       g.score - lag(g.score) over (partition by g.student_id, g.subject_id order by p.sort) as delta
from public.grades g
join public.periods p on p.id = g.period_id
join public.subjects s on s.id = g.subject_id;

create or replace view public.v_student_pending_work with (security_invoker = true) as
select m.school_id, m.student_id, a.subject_id, s.name as subject_name, a.id as assignment_id, a.title, a.due_on
from public.assignment_misses m
join public.assignments a on a.id = m.assignment_id
join public.subjects s on s.id = a.subject_id;

grant select on public.v_student_period_attendance, public.v_student_grade_trend, public.v_student_pending_work to authenticated;

-- Notificaciones con límite (docs/04: máximo 3 no urgentes por semana por hijo) --

create or replace function private.notify(
  p_school uuid, p_user uuid, p_student uuid, p_kind public.notification_kind,
  p_title text, p_body text, p_url text default null, p_urgent boolean default false)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_recent int;
begin
  if not p_urgent and p_kind not in ('weekly_digest', 'monthly_summary') and p_student is not null then
    select count(*) into v_recent from public.notifications n
    where n.user_id = p_user and n.student_id = p_student and not n.urgent
      and n.kind not in ('weekly_digest', 'monthly_summary')
      and n.created_at > now() - interval '7 days';
    if v_recent >= 3 then
      return false; -- se queda para el resumen semanal
    end if;
  end if;
  insert into public.notifications (school_id, user_id, student_id, kind, title, body, url, urgent)
  values (p_school, p_user, p_student, p_kind, p_title, p_body, p_url, p_urgent);
  return true;
end $$;

-- Motor de alertas ---------------------------------------------------------
-- Corre cada mañana (pg_cron). Crea alertas nuevas sin duplicar abiertas y avisa al personal.

create or replace function private.evaluate_alerts(p_school uuid default null, p_today date default current_date)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_new int := 0;
  v_count int;
  v_started timestamptz := now();
begin
  for r in
    select s.id as school_id, ar.indicator, ar.threshold, ar.window_days
    from public.schools s
    join public.alert_rules ar on ar.school_id = s.id and ar.enabled
    where p_school is null or s.id = p_school
  loop
    if r.indicator = 'attendance' then
      insert into public.alerts (school_id, student_id, indicator, detail)
      select r.school_id, x.student_id, 'attendance',
             jsonb_build_object('absences', x.absences, 'days', x.days, 'pct', round(100.0 * x.absences / x.days, 1),
                                'window_days', r.window_days)
      from (
        select a.student_id, count(*) filter (where a.status = 'absent') as absences, count(*) as days
        from public.attendance a
        where a.school_id = r.school_id and a.date > p_today - r.window_days and a.date <= p_today
        group by a.student_id
      ) x
      where x.days >= 5 and 100.0 * x.absences / x.days >= r.threshold
      on conflict (student_id, indicator) where status = 'open' do nothing;
      get diagnostics v_count = row_count;

    elsif r.indicator = 'behavior' then
      insert into public.alerts (school_id, student_id, indicator, detail)
      select r.school_id, b.student_id, 'behavior',
             jsonb_build_object('reports', count(*), 'window_days', r.window_days)
      from public.behavior_reports b
      where b.school_id = r.school_id and b.occurred_on > p_today - r.window_days and b.occurred_on <= p_today
      group by b.student_id
      having count(*) >= r.threshold
      on conflict (student_id, indicator) where status = 'open' do nothing;
      get diagnostics v_count = row_count;

    elsif r.indicator = 'grades' then
      -- Reprobada (menor al umbral) en el periodo actual, o caída de 1 punto o más contra el periodo anterior.
      insert into public.alerts (school_id, student_id, indicator, detail)
      select r.school_id, t.student_id, 'grades',
             jsonb_build_object('subjects', jsonb_agg(jsonb_build_object(
               'subject', t.subject_name, 'score', t.score, 'previous', t.previous_score)))
      from (
        select g.student_id, s.name as subject_name, g.score,
               (select g2.score from public.grades g2
                where g2.student_id = g.student_id and g2.subject_id = g.subject_id
                  and g2.period_id = private.previous_period(g.period_id)) as previous_score
        from public.grades g
        join public.subjects s on s.id = g.subject_id
        where g.school_id = r.school_id and g.period_id = private.current_period(r.school_id, p_today)
      ) t
      where t.score < r.threshold or (t.previous_score is not null and t.previous_score - t.score >= 1)
      group by t.student_id
      on conflict (student_id, indicator) where status = 'open' do nothing;
      get diagnostics v_count = row_count;

    elsif r.indicator = 'assignments' then
      insert into public.alerts (school_id, student_id, indicator, detail)
      select r.school_id, m.student_id, 'assignments',
             jsonb_build_object('missed', count(*), 'window_days', r.window_days)
      from public.assignment_misses m
      join public.assignments a on a.id = m.assignment_id
      where m.school_id = r.school_id and a.due_on > p_today - r.window_days and a.due_on <= p_today
      group by m.student_id
      having count(*) >= r.threshold
      on conflict (student_id, indicator) where status = 'open' do nothing;
      get diagnostics v_count = row_count;
    end if;

    v_new := v_new + coalesce(v_count, 0);
  end loop;

  -- Aviso al personal: un solo aviso por maestro y por director con el total de alertas nuevas de hoy.
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
    from public.alerts al
    join public.memberships m on m.school_id = al.school_id and m.role = 'director'
    where al.status = 'open' and al.created_at >= v_started and (p_school is null or al.school_id = p_school)
    group by al.school_id, m.user_id
  ) x
  where v_new > 0
    and not exists (
      select 1 from public.notifications n
      where n.user_id = x.user_id and n.kind = 'alert' and n.created_at > now() - interval '20 hours' and n.student_id is null);

  return v_new;
end $$;

-- Resumen semanal para papás (sin IA) -------------------------------------
-- Una notificación por hijo y por tutor con consentimiento vigente. Números exactos, sin comparaciones.

create or replace function private.build_weekly_digests(p_today date default current_date, p_school uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_n int := 0;
  v_week_start date := p_today - 6;
  v_parts text[];
begin
  for r in
    select sg.school_id, sg.guardian_id, st.id as student_id, st.first_name,
           (select count(*) from public.attendance a where a.student_id = st.id and a.status = 'absent'
              and a.date between v_week_start and p_today) as week_absences,
           (select count(*) from public.attendance a
              join public.periods p on p.id = private.current_period(st.school_id, p_today)
              where a.student_id = st.id and a.status = 'absent' and a.date between p.starts_on and p_today) as period_absences,
           (select count(*) from public.assignment_misses m join public.assignments asg on asg.id = m.assignment_id
              where m.student_id = st.id and asg.due_on between v_week_start and p_today) as week_missed,
           (select count(*) from public.grades g where g.student_id = st.id
              and g.updated_at::date between v_week_start and p_today) as new_grades
    from public.student_guardians sg
    join public.students st on st.id = sg.student_id
    join public.schools sc on sc.id = sg.school_id
    where (p_school is null or sg.school_id = p_school)
      and exists (select 1 from public.consents c where c.school_id = sg.school_id and c.user_id = sg.guardian_id
                  and c.notice_version = sc.privacy_notice_version)
      and not exists (select 1 from public.notifications n where n.user_id = sg.guardian_id and n.student_id = st.id
                      and n.kind = 'weekly_digest' and n.created_at > now() - interval '6 days')
  loop
    v_parts := array[]::text[];
    v_parts := v_parts || case
      when r.week_absences = 0 then 'Asistió todos los días de esta semana.'
      when r.week_absences = 1 then 'Faltó 1 día esta semana.'
      else 'Faltó ' || r.week_absences || ' días esta semana.' end;
    v_parts := v_parts || case
      when r.period_absences = 0 then 'No ha faltado en el trimestre.'
      when r.period_absences = 1 then 'Lleva 1 falta en el trimestre.'
      else 'Lleva ' || r.period_absences || ' faltas en el trimestre.' end;
    if r.week_missed > 0 then
      v_parts := v_parts || ('Tiene ' || r.week_missed || case when r.week_missed = 1 then ' tarea' else ' tareas' end
                             || ' sin entregar de esta semana.');
    end if;
    if r.new_grades > 0 then
      v_parts := v_parts || 'Hay calificaciones nuevas en su ficha.'::text;
    end if;

    insert into public.notifications (school_id, user_id, student_id, kind, title, body, url)
    values (r.school_id, r.guardian_id, r.student_id, 'weekly_digest',
            'La semana de ' || r.first_name, array_to_string(v_parts, ' '), '/hijos/' || r.student_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- Resumen mensual: datos ("foto") que recibe la IA ---------------------------
-- Solo nombre de pila, solo números calculados aquí, nunca notas sensibles.

create or replace function public.build_summary_snapshot(p_student uuid, p_month date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_school uuid := private.student_school(p_student);
  v_from date := date_trunc('month', p_month)::date;
  v_to date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
  -- Periodo del mes = el que contiene el día 15 (un trimestre que empieza el 30 no se adueña del mes).
  v_period uuid := private.current_period(private.student_school(p_student), (date_trunc('month', p_month) + interval '14 days')::date);
  -- Calificaciones = el periodo más reciente con calificaciones capturadas hasta fin de mes.
  v_grade_period uuid;
  v jsonb;
begin
  if auth.uid() is not null and not private.is_staff_for_student(p_student) then
    raise exception 'sin permiso' using errcode = '42501';
  end if;

  select g.period_id into v_grade_period
  from public.grades g join public.periods p on p.id = g.period_id
  where g.student_id = p_student and p.starts_on <= v_to
  order by p.starts_on desc limit 1;

  select jsonb_build_object(
    'student_first_name', st.first_name,
    'grades_period', (select p.name from public.periods p where p.id = v_grade_period),
    'month', to_char(v_from, 'YYYY-MM'),
    'teacher_name', (select pr.full_name from public.enrollments e
                       join public.teaching_assignments ta on ta.group_id = e.group_id and ta.is_homeroom
                       join public.profiles pr on pr.id = ta.teacher_id
                       where e.student_id = st.id limit 1),
    'attendance', jsonb_build_object(
      'month_absences', (select count(*) from public.attendance a where a.student_id = st.id and a.status = 'absent' and a.date between v_from and v_to),
      'month_lates', (select count(*) from public.attendance a where a.student_id = st.id and a.status = 'late' and a.date between v_from and v_to),
      'month_days_recorded', (select count(*) from public.attendance a where a.student_id = st.id and a.date between v_from and v_to),
      'period_absences', (select count(*) from public.attendance a join public.periods p on p.id = v_period
                            where a.student_id = st.id and a.status = 'absent' and a.date between p.starts_on and v_to)),
    'grades', coalesce((
      select jsonb_agg(jsonb_build_object(
               'subject', s.name,
               'score', g.score,
               'previous', (select g2.score from public.grades g2 where g2.student_id = g.student_id
                              and g2.subject_id = g.subject_id and g2.period_id = private.previous_period(v_grade_period)),
               'trend', case
                 when (select g2.score from public.grades g2 where g2.student_id = g.student_id
                         and g2.subject_id = g.subject_id and g2.period_id = private.previous_period(v_grade_period)) is null then 'sin_anterior'
                 when g.score > (select g2.score from public.grades g2 where g2.student_id = g.student_id
                         and g2.subject_id = g.subject_id and g2.period_id = private.previous_period(v_grade_period)) then 'sube'
                 when g.score < (select g2.score from public.grades g2 where g2.student_id = g.student_id
                         and g2.subject_id = g.subject_id and g2.period_id = private.previous_period(v_grade_period)) then 'baja'
                 else 'igual' end) order by s.name)
      from public.grades g join public.subjects s on s.id = g.subject_id
      where g.student_id = st.id and g.period_id = v_grade_period), '[]'::jsonb),
    'missed_assignments', coalesce((
      select jsonb_agg(jsonb_build_object('subject', x.subject, 'count', x.n) order by x.n desc)
      from (select s.name as subject, count(*) as n
            from public.assignment_misses m join public.assignments a on a.id = m.assignment_id
            join public.subjects s on s.id = a.subject_id
            where m.student_id = st.id and a.due_on between v_from and v_to group by s.name) x), '[]'::jsonb),
    'behavior_reports', (select count(*) from public.behavior_reports b where b.student_id = st.id and b.occurred_on between v_from and v_to),
    'teacher_observations', coalesce((
      select jsonb_agg(o.body order by o.created_at) from public.observations o
      where o.student_id = st.id and o.created_at::date between v_from and v_to), '[]'::jsonb),
    'monthly_goal', (select jsonb_build_object('goal', mg.goal, 'achieved', mg.achieved)
                     from public.monthly_goals mg where mg.student_id = st.id and mg.month = v_from)
  ) into v
  from public.students st where st.id = p_student;

  return v;
end $$;
grant execute on function public.build_summary_snapshot(uuid, date) to authenticated, service_role;
revoke execute on function public.build_summary_snapshot(uuid, date) from anon, public;

-- Crea los registros del mes (borrador vacío + foto de datos) para todos los alumnos inscritos.
create or replace function private.prepare_monthly_summaries(p_month date, p_school uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; v_id uuid; v_n int := 0; v_month date := date_trunc('month', p_month)::date;
begin
  for r in
    select distinct e.school_id, e.student_id
    from public.enrollments e
    join public.school_years y on y.id = e.school_year_id and y.is_current
    where (p_school is null or e.school_id = p_school)
      and not exists (select 1 from public.monthly_summaries ms where ms.student_id = e.student_id and ms.month = v_month)
  loop
    insert into public.monthly_summaries (school_id, student_id, month, status)
    values (r.school_id, r.student_id, v_month, 'draft') returning id into v_id;
    insert into public.summary_drafts (summary_id, school_id, student_id, data_snapshot)
    values (v_id, r.school_id, r.student_id, public.build_summary_snapshot(r.student_id, v_month));
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- La Edge Function guarda aquí el borrador de la IA y el resultado del validador.
create or replace function public.save_summary_draft(p_summary uuid, p_text text, p_errors jsonb, p_prompt_version text, p_model text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    raise exception 'solo el sistema guarda borradores' using errcode = '42501';
  end if;
  update public.summary_drafts
  set draft_text = p_text, validation_errors = coalesce(p_errors, '[]'::jsonb),
      prompt_version = p_prompt_version, model = p_model, generated_at = now()
  where summary_id = p_summary;
  update public.monthly_summaries
  set status = case when jsonb_array_length(coalesce(p_errors, '[]'::jsonb)) = 0 then 'draft'::public.summary_status
                    else 'needs_manual'::public.summary_status end
  where id = p_summary and status <> 'approved';
end $$;
revoke execute on function public.save_summary_draft(uuid, text, jsonb, text, text) from anon, authenticated, public;
grant execute on function public.save_summary_draft(uuid, text, jsonb, text, text) to service_role;

-- El maestro aprueba (con o sin cambios) y se avisa a los tutores con consentimiento.
create or replace function public.approve_summary(p_summary uuid, p_text text)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.monthly_summaries; v_name text;
begin
  select * into s from public.monthly_summaries where id = p_summary for update;
  if s.id is null then raise exception 'resumen no encontrado' using errcode = 'P0002'; end if;
  if not private.is_staff_for_student(s.student_id) then raise exception 'sin permiso' using errcode = '42501'; end if;
  if s.status = 'approved' then raise exception 'el resumen ya fue aprobado' using errcode = 'P0001'; end if;
  if p_text is null or length(trim(p_text)) < 40 or length(p_text) > 2000 then
    raise exception 'el texto debe tener entre 40 y 2000 caracteres' using errcode = '22023';
  end if;

  update public.monthly_summaries
  set status = 'approved', final_text = trim(p_text), approved_by = auth.uid(), approved_at = now()
  where id = p_summary;

  select first_name into v_name from public.students where id = s.student_id;
  perform private.notify(s.school_id, sg.guardian_id, s.student_id, 'monthly_summary',
                         'Resumen del mes de ' || v_name, 'Ya está listo el resumen de este mes.',
                         '/hijos/' || s.student_id || '/resumenes/' || s.id)
  from public.student_guardians sg
  join public.schools sc on sc.id = sg.school_id
  where sg.student_id = s.student_id
    and exists (select 1 from public.consents c where c.school_id = sg.school_id and c.user_id = sg.guardian_id
                and c.notice_version = sc.privacy_notice_version);
end $$;
grant execute on function public.approve_summary(uuid, text) to authenticated;
revoke execute on function public.approve_summary(uuid, text) from anon, public;

-- Alertas y casos (security invoker: aplican las mismas reglas RLS) --------

create or replace function public.dismiss_alert(p_alert uuid, p_note text)
returns void language plpgsql set search_path = '' as $$
begin
  if p_note is null or length(trim(p_note)) < 3 then
    raise exception 'escriba el motivo para descartar' using errcode = '22023';
  end if;
  update public.alerts set status = 'dismissed', resolved_at = now(), resolved_by = auth.uid(), resolution_note = trim(p_note)
  where id = p_alert and status = 'open';
  if not found then raise exception 'alerta no disponible' using errcode = 'P0002'; end if;
end $$;

create or replace function public.convert_alert_to_case(p_alert uuid, p_summary text, p_owner uuid default null)
returns uuid language plpgsql set search_path = '' as $$
declare a public.alerts; v_case uuid;
begin
  select * into a from public.alerts where id = p_alert and status = 'open';
  if a.id is null then raise exception 'alerta no disponible' using errcode = 'P0002'; end if;
  insert into public.cases (school_id, student_id, alert_id, owner_id, summary, opened_by)
  values (a.school_id, a.student_id, a.id, coalesce(p_owner, auth.uid()), coalesce(p_summary, ''), auth.uid())
  returning id into v_case;
  update public.alerts set status = 'converted', resolved_at = now(), resolved_by = auth.uid() where id = a.id;
  return v_case;
end $$;

create or replace function public.close_case(p_case uuid, p_outcome text)
returns void language plpgsql set search_path = '' as $$
begin
  if p_outcome is null or length(trim(p_outcome)) < 3 then
    raise exception 'escriba el resultado del caso' using errcode = '22023';
  end if;
  update public.cases set status = 'closed', outcome = trim(p_outcome), closed_at = now()
  where id = p_case and status <> 'closed';
  if not found then raise exception 'caso no disponible' using errcode = 'P0002'; end if;
end $$;

-- Definer: la maestra no puede leer las membresías del director, pero sí puede escalarle su caso.
create or replace function public.escalate_case(p_case uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_dir uuid; c public.cases;
begin
  select * into c from public.cases where id = p_case and status = 'open';
  if c.id is null or not private.is_staff_for_student(c.student_id) then
    raise exception 'caso no disponible' using errcode = 'P0002';
  end if;
  select m.user_id into v_dir from public.memberships m where m.school_id = c.school_id and m.role = 'director' limit 1;
  update public.cases set status = 'escalated', owner_id = coalesce(v_dir, owner_id) where id = p_case;
end $$;

grant execute on function public.dismiss_alert(uuid, text), public.convert_alert_to_case(uuid, text, uuid),
  public.close_case(uuid, text), public.escalate_case(uuid) to authenticated;
revoke execute on function public.dismiss_alert(uuid, text), public.convert_alert_to_case(uuid, text, uuid),
  public.close_case(uuid, text), public.escalate_case(uuid) from anon, public;

-- Tablero del director ------------------------------------------------------

create or replace function public.director_dashboard(p_school uuid, p_today date default current_date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_director(p_school) then raise exception 'sin permiso' using errcode = '42501'; end if;
  return jsonb_build_object(
    'open_alerts', (select count(*) from public.alerts where school_id = p_school and status = 'open'),
    'students_needing_support', (select count(distinct student_id) from public.alerts where school_id = p_school and status = 'open'),
    'open_cases', (select count(*) from public.cases where school_id = p_school and status <> 'closed'),
    'overdue_actions', (select count(*) from public.case_actions where school_id = p_school and status = 'pending' and due_on < p_today),
    'guardians_pending', (select count(*) from public.guardian_invitations where school_id = p_school and accepted_at is null),
    'guardians_active', (select count(distinct sg.guardian_id) from public.student_guardians sg where sg.school_id = p_school),
    'summaries_pending', (select count(*) from public.monthly_summaries where school_id = p_school and status <> 'approved'),
    'teachers_behind', coalesce((
      select jsonb_agg(jsonb_build_object('teacher', pr.full_name, 'group', g.grade || g.name, 'last_capture', x.last_capture))
      from (
        select ta.teacher_id, ta.group_id, max(a.date) as last_capture
        from public.teaching_assignments ta
        left join public.attendance a on a.group_id = ta.group_id
        where ta.school_id = p_school and ta.is_homeroom
        group by ta.teacher_id, ta.group_id
      ) x
      join public.profiles pr on pr.id = x.teacher_id
      join public.groups g on g.id = x.group_id
      where x.last_capture is null or x.last_capture < p_today - 2), '[]'::jsonb)
  );
end $$;
grant execute on function public.director_dashboard(uuid, date) to authenticated;
revoke execute on function public.director_dashboard(uuid, date) from anon, public;

-- Funciones del sistema: nunca desde el navegador.
revoke execute on function private.evaluate_alerts(uuid, date), private.build_weekly_digests(date, uuid),
  private.prepare_monthly_summaries(date, uuid), private.notify(uuid, uuid, uuid, public.notification_kind, text, text, text, boolean)
  from authenticated, anon, public;
grant execute on function private.evaluate_alerts(uuid, date), private.build_weekly_digests(date, uuid),
  private.prepare_monthly_summaries(date, uuid) to service_role;
