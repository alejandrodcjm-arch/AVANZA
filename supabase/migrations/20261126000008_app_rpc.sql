-- Funciones que usa la app. Las de captura son security invoker: RLS decide qué se puede escribir.
-- Las que necesitan ver más que el usuario (invitaciones, importación) son definer con revisión explícita.

-- Invitación: vista previa sin sesión (para la pantalla de bienvenida del papá) ---------
create or replace function public.invitation_preview(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare i public.guardian_invitations; v_school text; v_student text;
begin
  select * into i from public.guardian_invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if i.id is null then return jsonb_build_object('valid', false, 'reason', 'not_found'); end if;
  select name into v_school from public.schools where id = i.school_id;
  select first_name into v_student from public.students where id = i.student_id;
  return jsonb_build_object(
    'valid', i.accepted_at is null and i.expires_at > now(),
    'reason', case when i.accepted_at is not null then 'used' when i.expires_at <= now() then 'expired' else null end,
    'school_name', v_school,
    'student_first_name', v_student,
    'email', i.email,
    'full_name', i.full_name);
end $$;
grant execute on function public.invitation_preview(text) to anon, authenticated;

-- Token nuevo (32 caracteres hex) y su hash
create or replace function private.new_token(out token text, out token_hash text)
language plpgsql volatile security definer set search_path = '' as $$
begin
  token := encode(extensions.gen_random_bytes(16), 'hex');
  token_hash := encode(extensions.digest(token, 'sha256'), 'hex');
end $$;

-- Importación de alumnos y tutores desde Excel -----------------------------------
-- Idempotente: volver a subir el mismo archivo no duplica nada. Todo o nada (una sola transacción).
-- p_rows: [{grado, grupo, nombre, apellido_paterno, apellido_materno, tutores: [{nombre, correo, parentesco}]}]
create or replace function public.import_roster(p_school uuid, p_rows jsonb, p_file_name text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_year uuid; r jsonb; t jsonb; v_group uuid; v_student uuid; v_tok record;
  v_groups int := 0; v_new int := 0; v_moved int := 0; v_same int := 0;
  v_invites jsonb := '[]'::jsonb; v_email text; v_inv uuid;
begin
  if not private.is_director(p_school) then raise exception 'sin permiso' using errcode = '42501'; end if;
  select id into v_year from public.school_years where school_id = p_school and is_current;
  if v_year is null then raise exception 'primero configure el ciclo escolar actual' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'el archivo no tiene alumnos' using errcode = '22023';
  end if;
  if jsonb_array_length(p_rows) > 3000 then raise exception 'máximo 3000 alumnos por archivo' using errcode = '22023'; end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    -- Grupo (se crea si no existe)
    select id into v_group from public.groups
    where school_year_id = v_year and grade = (r->>'grado')::int and upper(name) = upper(trim(r->>'grupo'));
    if v_group is null then
      insert into public.groups (school_id, school_year_id, grade, name)
      values (p_school, v_year, (r->>'grado')::int, upper(trim(r->>'grupo'))) returning id into v_group;
      v_groups := v_groups + 1;
    end if;

    -- Alumno: mismo nombre completo en la escuela = mismo alumno
    select s.id into v_student from public.students s
    where s.school_id = p_school
      and lower(s.first_name) = lower(trim(r->>'nombre'))
      and lower(s.last_name) = lower(trim(r->>'apellido_paterno'))
      and lower(coalesce(s.second_last_name, '')) = lower(coalesce(trim(r->>'apellido_materno'), ''))
    limit 1;
    if v_student is null then
      insert into public.students (school_id, first_name, last_name, second_last_name)
      values (p_school, trim(r->>'nombre'), trim(r->>'apellido_paterno'), nullif(trim(r->>'apellido_materno'), ''))
      returning id into v_student;
      insert into public.enrollments (school_id, student_id, group_id, school_year_id) values (p_school, v_student, v_group, v_year);
      v_new := v_new + 1;
    elsif exists (select 1 from public.enrollments where student_id = v_student and school_year_id = v_year and group_id = v_group) then
      v_same := v_same + 1;
    else
      insert into public.enrollments (school_id, student_id, group_id, school_year_id) values (p_school, v_student, v_group, v_year)
      on conflict (student_id, school_year_id) do update set group_id = excluded.group_id;
      v_moved := v_moved + 1;
    end if;

    -- Tutores: invitación nueva solo si todavía no están vinculados
    for t in select * from jsonb_array_elements(coalesce(r->'tutores', '[]'::jsonb)) loop
      v_email := lower(trim(t->>'correo'));
      continue when v_email is null or v_email = '';
      continue when exists (select 1 from public.student_guardians sg join auth.users u on u.id = sg.guardian_id
                            where sg.student_id = v_student and lower(u.email) = v_email);
      select * into v_tok from private.new_token();
      insert into public.guardian_invitations (school_id, student_id, email, full_name, relationship, token_hash, created_by)
      values (p_school, v_student, v_email, coalesce(trim(t->>'nombre'), ''), coalesce(t->>'parentesco', 'tutor'),
              v_tok.token_hash, auth.uid())
      on conflict (student_id, email) do update
        set token_hash = excluded.token_hash, expires_at = now() + interval '14 days', full_name = excluded.full_name
        where public.guardian_invitations.accepted_at is null
      returning id into v_inv;
      if v_inv is not null then
        v_invites := v_invites || jsonb_build_object('id', v_inv, 'email', v_email, 'token', v_tok.token,
                                                     'guardian_name', coalesce(trim(t->>'nombre'), ''),
                                                     'student_first_name', trim(r->>'nombre'));
      end if;
      v_inv := null;
    end loop;
  end loop;

  insert into public.imports (school_id, file_name, status, summary, created_by)
  values (p_school, coalesce(p_file_name, 'importación'), 'committed',
          jsonb_build_object('groups_created', v_groups, 'students_created', v_new, 'students_moved', v_moved,
                             'students_unchanged', v_same, 'invitations', jsonb_array_length(v_invites)),
          auth.uid());

  return jsonb_build_object('groups_created', v_groups, 'students_created', v_new, 'students_moved', v_moved,
                            'students_unchanged', v_same, 'invitations', v_invites);
end $$;
grant execute on function public.import_roster(uuid, jsonb, text) to authenticated;
revoke execute on function public.import_roster(uuid, jsonb, text) from anon, public;

-- Reenviar invitación (token nuevo, 14 días más)
create or replace function public.renew_invitation(p_invitation uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare i public.guardian_invitations; v_tok record; v_student text;
begin
  select * into i from public.guardian_invitations where id = p_invitation;
  if i.id is null or not private.is_director(i.school_id) then raise exception 'sin permiso' using errcode = '42501'; end if;
  if i.accepted_at is not null then raise exception 'esta invitación ya fue aceptada' using errcode = 'P0001'; end if;
  select * into v_tok from private.new_token();
  update public.guardian_invitations set token_hash = v_tok.token_hash, expires_at = now() + interval '14 days', sent_at = null
  where id = i.id;
  select first_name into v_student from public.students where id = i.student_id;
  return jsonb_build_object('id', i.id, 'email', i.email, 'token', v_tok.token, 'guardian_name', i.full_name,
                            'student_first_name', v_student);
end $$;
grant execute on function public.renew_invitation(uuid) to authenticated;
revoke execute on function public.renew_invitation(uuid) from anon, public;

create or replace function public.mark_invitations_sent(p_ids uuid[])
returns void language sql security definer set search_path = '' as $$
  update public.guardian_invitations set sent_at = now()
  where id = any(p_ids) and private.is_director(school_id)
$$;
grant execute on function public.mark_invitations_sent(uuid[]) to authenticated;
revoke execute on function public.mark_invitations_sent(uuid[]) from anon, public;

-- Captura del maestro (invoker: RLS valida grupo, materia y escuela) ----------------

-- Pasar lista: todos presentes salvo las excepciones enviadas. p_exceptions: {student_id: status}
create or replace function public.save_attendance(p_group uuid, p_date date, p_exceptions jsonb)
returns integer language plpgsql set search_path = '' as $$
declare v_school uuid; v_n int;
begin
  if p_date > current_date + 1 then raise exception 'no se puede pasar lista de días futuros' using errcode = '22023'; end if;
  select school_id into v_school from public.groups where id = p_group;
  if v_school is null then raise exception 'grupo no disponible' using errcode = 'P0002'; end if;
  if not (private.teaches_group(p_group) or private.is_director(v_school)) then
    raise exception 'no da clase a este grupo' using errcode = '42501';
  end if;
  insert into public.attendance (school_id, student_id, group_id, date, status, recorded_by)
  select v_school, e.student_id, p_group, p_date,
         coalesce((p_exceptions ->> e.student_id::text)::public.attendance_status, 'present'), auth.uid()
  from public.enrollments e
  join public.school_years y on y.id = e.school_year_id and y.is_current
  where e.group_id = p_group
  on conflict (student_id, date) do update
    set status = excluded.status, recorded_by = excluded.recorded_by, group_id = excluded.group_id
    where public.attendance.status is distinct from excluded.status;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Calificaciones de una materia en un periodo. p_scores: {student_id: score|null}; null borra.
create or replace function public.save_grades(p_subject uuid, p_period uuid, p_scores jsonb)
returns integer language plpgsql set search_path = '' as $$
declare v_school uuid; v_n int := 0; v_k int; k text; v text;
begin
  select school_id into v_school from public.subjects where id = p_subject;
  if v_school is null then raise exception 'materia no disponible' using errcode = 'P0002'; end if;
  for k, v in select key, value #>> '{}' from jsonb_each(p_scores) loop
    if v is null or v = '' then
      delete from public.grades where student_id = k::uuid and subject_id = p_subject and period_id = p_period;
    else
      if not (private.teaches_student_subject(k::uuid, p_subject) or private.is_director(v_school)) then
        raise exception 'no da esta materia a este alumno' using errcode = '42501';
      end if;
      if v::numeric < 5 or v::numeric > 10 then
        raise exception 'las calificaciones van de 5 a 10' using errcode = '22023';
      end if;
      insert into public.grades (school_id, student_id, subject_id, period_id, score, recorded_by)
      values (v_school, k::uuid, p_subject, p_period, round(v::numeric, 1), auth.uid())
      on conflict (student_id, subject_id, period_id) do update
        set score = excluded.score, recorded_by = excluded.recorded_by
        where public.grades.score is distinct from excluded.score;
    end if;
    get diagnostics v_k = row_count;
    v_n := v_n + v_k;
  end loop;
  return v_n;
end $$;

-- Tareas no entregadas: reemplaza la lista completa de una tarea.
create or replace function public.set_assignment_misses(p_assignment uuid, p_students uuid[])
returns integer language plpgsql set search_path = '' as $$
declare v_school uuid; v_n int;
begin
  select school_id into v_school from public.assignments where id = p_assignment;
  if v_school is null then raise exception 'tarea no disponible' using errcode = 'P0002'; end if;
  delete from public.assignment_misses where assignment_id = p_assignment and not (student_id = any(coalesce(p_students, '{}')));
  insert into public.assignment_misses (school_id, assignment_id, student_id, created_by)
  select v_school, p_assignment, s, auth.uid() from unnest(coalesce(p_students, '{}')) s
  on conflict do nothing;
  select count(*) into v_n from public.assignment_misses where assignment_id = p_assignment;
  return v_n;
end $$;

grant execute on function public.save_attendance(uuid, date, jsonb), public.save_grades(uuid, uuid, jsonb),
  public.set_assignment_misses(uuid, uuid[]) to authenticated;
revoke execute on function public.save_attendance(uuid, date, jsonb), public.save_grades(uuid, uuid, jsonb),
  public.set_assignment_misses(uuid, uuid[]) from anon, public;

-- Ficha del alumno (invoker: cada rol ve lo que RLS le permite) ------------------
create or replace function public.student_overview(p_student uuid, p_today date default current_date)
returns jsonb language plpgsql stable set search_path = '' as $$
declare v_school uuid; v_period uuid; v jsonb;
begin
  select school_id into v_school from public.students where id = p_student;
  if v_school is null then raise exception 'alumno no disponible' using errcode = 'P0002'; end if;
  v_period := private.current_period(v_school, p_today);

  select jsonb_build_object(
    'student', jsonb_build_object('id', s.id, 'first_name', s.first_name, 'last_name', s.last_name,
                                  'second_last_name', s.second_last_name),
    'group', (select jsonb_build_object('id', g.id, 'label', g.grade || '°' || g.name)
              from public.enrollments e join public.groups g on g.id = e.group_id
              join public.school_years y on y.id = e.school_year_id and y.is_current
              where e.student_id = s.id limit 1),
    'period', (select jsonb_build_object('id', p.id, 'name', p.name, 'starts_on', p.starts_on, 'ends_on', p.ends_on)
               from public.periods p where p.id = v_period),
    'attendance', (select jsonb_build_object(
                      'absences', count(*) filter (where a.status = 'absent'),
                      'lates', count(*) filter (where a.status = 'late'),
                      'excused', count(*) filter (where a.status = 'excused'),
                      'days', count(*),
                      'last_absence', max(a.date) filter (where a.status = 'absent'))
                   from public.attendance a join public.periods p on p.id = v_period
                   where a.student_id = s.id and a.date between p.starts_on and least(p.ends_on, p_today)),
    'grades', coalesce((
      select jsonb_agg(jsonb_build_object('subject', t.subject_name, 'period', t.period_name, 'score', t.score,
                                          'previous', t.previous_score, 'delta', t.delta) order by t.subject_name)
      from public.v_student_grade_trend t
      where t.student_id = s.id and t.sort = (select max(t2.sort) from public.v_student_grade_trend t2 where t2.student_id = s.id)),
      '[]'::jsonb),
    'pending_work', coalesce((
      select jsonb_agg(jsonb_build_object('subject', w.subject_name, 'title', w.title, 'due_on', w.due_on) order by w.due_on desc)
      from public.v_student_pending_work w where w.student_id = s.id and w.due_on > p_today - 30), '[]'::jsonb),
    'goal', (select jsonb_build_object('id', mg.id, 'goal', mg.goal, 'achieved', mg.achieved, 'month', mg.month)
             from public.monthly_goals mg where mg.student_id = s.id order by mg.month desc limit 1),
    'summaries', coalesce((
      select jsonb_agg(jsonb_build_object('id', ms.id, 'month', ms.month) order by ms.month desc)
      from public.monthly_summaries ms where ms.student_id = s.id and ms.status = 'approved'), '[]'::jsonb),
    'behavior_month', (select count(*) from public.behavior_reports b where b.student_id = s.id and b.occurred_on > p_today - 30)
  ) into v
  from public.students s where s.id = p_student;

  if v is null then raise exception 'alumno no disponible' using errcode = 'P0002'; end if;
  return v;
end $$;
grant execute on function public.student_overview(uuid, date) to authenticated;
revoke execute on function public.student_overview(uuid, date) from anon, public;

-- Derecho de acceso (ARCO): descarga de mis datos y los de mis hijos -------------
create or replace function public.export_my_data()
returns jsonb language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sin sesión' using errcode = '42501'; end if;
  return jsonb_build_object(
    'generated_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'memberships', (select coalesce(jsonb_agg(jsonb_build_object('school', sc.name, 'role', m.role)), '[]')
                    from public.memberships m join public.schools sc on sc.id = m.school_id where m.user_id = auth.uid()),
    'consents', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.consents c where c.user_id = auth.uid()),
    'children', (select coalesce(jsonb_agg(jsonb_build_object(
                    'student', to_jsonb(s),
                    'attendance', (select coalesce(jsonb_agg(jsonb_build_object('date', a.date, 'status', a.status) order by a.date), '[]')
                                   from public.attendance a where a.student_id = s.id),
                    'grades', (select coalesce(jsonb_agg(jsonb_build_object('subject', su.name, 'period', pe.name, 'score', g.score)), '[]')
                               from public.grades g join public.subjects su on su.id = g.subject_id
                               join public.periods pe on pe.id = g.period_id where g.student_id = s.id),
                    'summaries', (select coalesce(jsonb_agg(jsonb_build_object('month', ms.month, 'text', ms.final_text)), '[]')
                                  from public.monthly_summaries ms where ms.student_id = s.id and ms.status = 'approved'))), '[]')
                 from public.student_guardians sg join public.students s on s.id = sg.student_id
                 where sg.guardian_id = auth.uid()),
    'notifications', (select coalesce(jsonb_agg(jsonb_build_object('date', n.created_at, 'title', n.title, 'body', n.body)), '[]')
                      from public.notifications n where n.user_id = auth.uid()));
end $$;
grant execute on function public.export_my_data() to authenticated;
revoke execute on function public.export_my_data() from anon, public;
