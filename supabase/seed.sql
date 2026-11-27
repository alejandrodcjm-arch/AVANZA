-- Escuela de prueba para desarrollo y demos. NUNCA correr en producción.
-- Usuarios (contraseña local: Demo1234!):
--   director@demo.mx  laura@demo.mx (3A)  jorge@demo.mx (3B y 3C)
--   papa@demo.mx (tutor de 2 hermanos, con aviso aceptado)  mama@demo.mx (sin aviso aceptado)

do $$
declare
  v_school uuid := '11111111-1111-1111-1111-111111111111';
  v_year uuid := '11111111-1111-1111-1111-111111111112';
  v_t1 uuid := '11111111-1111-1111-1111-111111111113';
  v_t2 uuid := '11111111-1111-1111-1111-111111111114';
  v_t3 uuid := '11111111-1111-1111-1111-111111111115';
  v_director uuid := '22222222-2222-2222-2222-222222222221';
  v_laura uuid := '22222222-2222-2222-2222-222222222222';
  v_jorge uuid := '22222222-2222-2222-2222-222222222223';
  v_papa uuid := '22222222-2222-2222-2222-222222222224';
  v_mama uuid := '22222222-2222-2222-2222-222222222225';
  v_groups uuid[] := array['33333333-3333-3333-3333-333333333331'::uuid,
                           '33333333-3333-3333-3333-333333333332'::uuid,
                           '33333333-3333-3333-3333-333333333333'::uuid];
  v_group_names text[] := array['A', 'B', 'C'];
  v_subjects uuid[] := array['44444444-4444-4444-4444-444444444441'::uuid,
                             '44444444-4444-4444-4444-444444444442'::uuid,
                             '44444444-4444-4444-4444-444444444443'::uuid,
                             '44444444-4444-4444-4444-444444444444'::uuid];
  v_subject_names text[] := array['Lenguajes', 'Saberes y Pensamiento Científico',
                                  'Ética, Naturaleza y Sociedades', 'De lo Humano y lo Comunitario'];
  v_first text[] := array['Sofía','Mateo','Valentina','Santiago','Regina','Sebastián','Camila','Leonardo','Ximena','Emiliano',
                          'Renata','Diego','Valeria','Daniel','Victoria','Iker','María José','Gael','Natalia','Rodrigo',
                          'Fernanda','Alejandro','Andrea','Julián','Paula','Ángel','Isabella','Miguel','Romina','Luis'];
  v_last text[] := array['Hernández','García','Martínez','López','González','Rodríguez','Pérez','Sánchez','Ramírez','Cruz',
                         'Flores','Gómez','Morales','Vázquez','Reyes','Jiménez','Torres','Díaz','Gutiérrez','Ruiz',
                         'Mendoza','Aguilar','Ortiz','Castillo','Soto','Chávez','Herrera','Medina','Rojas','Luna'];
  u record;
  g int; i int; idx int;
  v_student uuid; v_teacher uuid; v_day date; v_roll int; v_status public.attendance_status;
  v_base numeric; v_score numeric; s int; a uuid; k int;
begin
  -- Usuarios de Auth (el disparador crea sus perfiles)
  for u in select * from (values
      (v_director, 'director@demo.mx', 'Patricia Morales (Directora)'),
      (v_laura, 'laura@demo.mx', 'Laura Castillo'),
      (v_jorge, 'jorge@demo.mx', 'Jorge Medina'),
      (v_papa, 'papa@demo.mx', 'Roberto Ramírez'),
      (v_mama, 'mama@demo.mx', 'Claudia Ortiz')) as t(id, email, name)
  loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
                            email_change, email_change_token_new, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
            extensions.crypt('Demo1234!', extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.name),
            '', '', '', '', now(), now());
    if to_regclass('auth.identities') is not null then
      execute 'insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
               values (gen_random_uuid(), $1, $1::text, jsonb_build_object(''sub'', $1::text, ''email'', $2), ''email'', now(), now(), now())'
        using u.id, u.email;
    end if;
  end loop;

  insert into public.schools (id, name, cct, privacy_notice_version)
  values (v_school, 'Colegio Demo Durango', '10PPR0000X', '2026-11');

  insert into public.memberships (school_id, user_id, role) values
    (v_school, v_director, 'director'), (v_school, v_laura, 'teacher'), (v_school, v_jorge, 'teacher'),
    (v_school, v_papa, 'guardian'), (v_school, v_mama, 'guardian');

  insert into public.school_years (id, school_id, name, starts_on, ends_on, is_current)
  values (v_year, v_school, '2026-2027', '2026-08-31', '2027-07-15', true);

  insert into public.periods (id, school_id, school_year_id, name, sort, starts_on, ends_on) values
    (v_t1, v_school, v_year, 'Trimestre 1', 1, '2026-08-31', '2026-11-27'),
    (v_t2, v_school, v_year, 'Trimestre 2', 2, '2026-11-30', '2027-03-12'),
    (v_t3, v_school, v_year, 'Trimestre 3', 3, '2027-03-15', '2027-07-15');

  for s in 1..4 loop
    insert into public.subjects (id, school_id, name) values (v_subjects[s], v_school, v_subject_names[s]);
  end loop;

  for g in 1..3 loop
    insert into public.groups (id, school_id, school_year_id, grade, name)
    values (v_groups[g], v_school, v_year, 3, v_group_names[g]);
    v_teacher := case when g = 1 then v_laura else v_jorge end;
    for s in 1..4 loop
      insert into public.teaching_assignments (school_id, group_id, subject_id, teacher_id, is_homeroom)
      values (v_school, v_groups[g], v_subjects[s], v_teacher, s = 1);
    end loop;
  end loop;

  -- 90 alumnos, 30 por grupo, con datos determinísticos (siempre iguales)
  for g in 1..3 loop
    v_teacher := case when g = 1 then v_laura else v_jorge end;
    for i in 1..30 loop
      idx := (g - 1) * 30 + i;
      v_student := ('55555555-5555-5555-5555-' || lpad(idx::text, 12, '0'))::uuid;
      insert into public.students (id, school_id, first_name, last_name, second_last_name)
      values (v_student, v_school, v_first[1 + (i * 7 + g * 11) % 30], v_last[1 + (i * 11 + g * 7) % 30], v_last[1 + (i * 13 + g * 17) % 30]);
      insert into public.enrollments (school_id, student_id, group_id, school_year_id)
      values (v_school, v_student, v_groups[g], v_year);

      -- Asistencia del 1 de septiembre al 25 de noviembre, días hábiles sin festivos
      for v_day in select d::date from generate_series('2026-09-01'::date, '2026-11-25'::date, interval '1 day') d
                   where extract(isodow from d) < 6 and d::date not in ('2026-09-16', '2026-11-16')
      loop
        v_roll := abs(hashtext(v_student::text || v_day::text)) % 100;
        v_status := case
          when idx % 15 = 0 and v_roll < 18 then 'absent'
          when idx % 15 <> 0 and v_roll < 3 then 'absent'
          when v_roll between 95 and 96 then 'late'
          else 'present' end;
        insert into public.attendance (school_id, student_id, group_id, date, status, recorded_by)
        values (v_school, v_student, v_groups[g], v_day, v_status, v_teacher);
      end loop;

      -- Calificaciones del trimestre 1
      v_base := 6.5 + (abs(hashtext(v_student::text)) % 33) / 10.0;
      for s in 1..4 loop
        v_score := least(10, greatest(5, round((v_base + ((abs(hashtext(v_student::text || s::text)) % 15) - 7) / 10.0)::numeric, 1)));
        if s = 2 and idx % 13 = 0 then v_score := 5.5; end if;
        insert into public.grades (school_id, student_id, subject_id, period_id, score, recorded_by)
        values (v_school, v_student, v_subjects[s], v_t1, v_score, v_teacher);
      end loop;
    end loop;
  end loop;

  -- Tareas de Saberes y Pensamiento Científico en noviembre; alumnos con idx % 11 = 0 no entregan 4
  for g in 1..3 loop
    v_teacher := case when g = 1 then v_laura else v_jorge end;
    for k in 1..6 loop
      insert into public.assignments (school_id, group_id, subject_id, title, due_on, created_by)
      values (v_school, v_groups[g], v_subjects[2], 'Ejercicios de fracciones ' || k, ('2026-11-02'::date + (k * 3)), v_teacher)
      returning id into a;
      for i in 1..30 loop
        idx := (g - 1) * 30 + i;
        if idx % 11 = 0 and k <= 4 then
          insert into public.assignment_misses (school_id, assignment_id, student_id, created_by)
          values (v_school, a, ('55555555-5555-5555-5555-' || lpad(idx::text, 12, '0'))::uuid, v_teacher);
        end if;
      end loop;
    end loop;
  end loop;

  -- Convivencia: incidencias con fecha, hora, lugar y tipo (como un registro real de un trimestre).
  -- Alumnos con idx % 17 = 0 acumulan varias; el resto, casos aislados. Más en patio a la hora del recreo.
  for k in 1..45 loop
    idx := case when k % 3 = 0 then 17 * (1 + k % 5) else 1 + (k * 37) % 90 end;
    v_student := ('55555555-5555-5555-5555-' || lpad(idx::text, 12, '0'))::uuid;
    v_teacher := case when idx <= 30 then v_laura else v_jorge end;
    v_day := '2026-09-07'::date + (k * 17) % 78;
    if extract(isodow from v_day) > 5 then v_day := v_day - (extract(isodow from v_day)::int - 5); end if;
    insert into public.incidents (school_id, occurred_on, occurred_time, location, category, severity, description, action_taken, reported_by)
    values (v_school, v_day,
            (array['08:20','09:40','10:35','10:45','10:50','11:30','12:15','13:20'])[1 + (k * 5) % 8]::time,
            (array['patio','salon','patio','pasillos','salon','banos','entrada_salida','patio','deportes'])[1 + (k * 7) % 9]::public.incident_location,
            (array['interrupcion','falta_respeto','agresion_verbal','interrupcion','incumplimiento','agresion_fisica','celular','interrupcion','dano_material'])[1 + (k * 4) % 9]::public.incident_category,
            (case when k % 11 = 0 then 'serious' when k % 4 = 0 then 'moderate' else 'minor' end)::public.behavior_severity,
            'Registro de prueba ' || k || '.',
            (array['platica','llamada_atencion','aviso_familia','reparacion','citatorio'])[1 + k % 5]::public.incident_action,
            v_teacher)
    returning id into a;
    insert into public.behavior_reports (school_id, student_id, occurred_on, severity, description, created_by, incident_id, involvement)
    select v_school, v_student, i.occurred_on, i.severity, private.category_label(i.category) || '.', v_teacher, i.id, 'involucrado'
    from public.incidents i where i.id = a;
  end loop;
  -- Un posible caso de acoso con alumno afectado, ya en seguimiento de dirección.
  insert into public.incidents (school_id, occurred_on, occurred_time, location, category, severity, description, action_taken, reported_by)
  values (v_school, '2026-11-19', '10:40', 'patio', 'acoso', 'moderate', 'Burlas repetidas en el recreo durante dos semanas.', 'citatorio', v_jorge)
  returning id into a;
  insert into public.behavior_reports (school_id, student_id, occurred_on, severity, description, created_by, incident_id, involvement) values
    (v_school, '55555555-5555-5555-5555-000000000034', '2026-11-19', 'moderate', 'Posible acoso escolar.', v_jorge, a, 'involucrado'),
    (v_school, '55555555-5555-5555-5555-000000000040', '2026-11-19', 'moderate', 'Su hijo o hija se vio afectado en una situación en la escuela. Ya se está atendiendo.', v_jorge, a, 'afectado');
  insert into public.cases (school_id, student_id, owner_id, summary, opened_by, incident_id, status)
  values (v_school, '55555555-5555-5555-5555-000000000040', v_director, 'Protocolo de acoso escolar: burlas repetidas en el recreo.', v_jorge, a, 'escalated');

  -- Reconocimientos (más que reportes: la meta es 4 a 1).
  for k in 1..160 loop
    idx := 1 + (k * 13) % 90;
    insert into public.recognitions (school_id, student_id, category, note, created_by, created_at)
    values (v_school, ('55555555-5555-5555-5555-' || lpad(idx::text, 12, '0'))::uuid,
            (array['esfuerzo','respeto','colaboracion','responsabilidad','mejora','liderazgo'])[1 + k % 6]::public.recognition_category,
            case when k % 4 = 0 then 'Ayudó a un compañero a terminar su trabajo.' end,
            case when idx <= 30 then v_laura else v_jorge end,
            '2026-09-07'::timestamptz + ((k * 11) % 78) * interval '1 day' + interval '15 hours');
  end loop;

  -- Corte semanal de pendientes en noviembre (Lenguajes y Saberes), todo el grupo.
  for g in 1..3 loop
    for k in 0..3 loop
      for s in 1..2 loop
        for i in 1..30 loop
          idx := (g - 1) * 30 + i;
          insert into public.weekly_pending (school_id, student_id, subject_id, week_start, pending_count, recorded_by)
          values (v_school, ('55555555-5555-5555-5555-' || lpad(idx::text, 12, '0'))::uuid, v_subjects[s], '2026-11-02'::date + k * 7,
                  case when idx % 11 = 0 then 2 when (idx + k) % 7 = 0 then 1 else 0 end,
                  case when g = 1 then v_laura else v_jorge end);
        end loop;
      end loop;
    end loop;
  end loop;

  insert into public.observations (school_id, student_id, body, created_by) values
    (v_school, '55555555-5555-5555-5555-000000000001', 'Participa con entusiasmo en lectura en voz alta.', v_laura),
    (v_school, '55555555-5555-5555-5555-000000000031', 'Mejoró mucho su orden en el cuaderno este mes.', v_jorge);

  -- Familias de prueba: papá con dos hijos (3A y 3B) y mamá sin aviso aceptado
  insert into public.student_guardians (school_id, student_id, guardian_id, relationship) values
    (v_school, '55555555-5555-5555-5555-000000000001', v_papa, 'padre'),
    (v_school, '55555555-5555-5555-5555-000000000031', v_papa, 'padre'),
    (v_school, '55555555-5555-5555-5555-000000000002', v_mama, 'madre');
  insert into public.consents (school_id, user_id, notice_version) values (v_school, v_papa, '2026-11');
  -- Los hermanos llevan los apellidos de su papá
  update public.students set last_name = 'Ramírez', second_last_name = 'Soto'
  where id in ('55555555-5555-5555-5555-000000000001', '55555555-5555-5555-5555-000000000031');
  update public.students set last_name = 'Ortiz', second_last_name = 'Luna'
  where id = '55555555-5555-5555-5555-000000000002';
  -- v3: calendario SEP + eventos de la escuela, horarios y estado de cuenta ------------------
  perform private.insert_sep_calendar(v_school, v_director);
  insert into public.calendar_events (school_id, group_id, subject_id, kind, title, description, starts_on, ends_on, start_time, end_time, created_by) values
    (v_school, null, null, 'junta', 'Junta de padres de familia', 'Entrega de boletas del primer trimestre en el salón de cada grupo.', '2026-12-04', '2026-12-04', '08:00', '09:30', v_director),
    (v_school, null, null, 'evento', 'Festival navideño', 'En el patio principal. Los alumnos llegan 7:30 con su vestuario.', '2026-12-18', '2026-12-18', '09:00', '11:30', v_director),
    (v_school, v_groups[1], v_subjects[2], 'examen', 'Examen de fracciones', 'Repasar las páginas 40 a 52 del libro.', '2026-12-08', '2026-12-08', null, null, v_laura),
    (v_school, v_groups[2], v_subjects[1], 'evento', 'Visita a la biblioteca municipal', 'Traer permiso firmado.', '2026-12-10', '2026-12-10', '09:00', '12:00', v_jorge);

  for g in 1..3 loop
    for k in 1..5 loop
      insert into public.schedule_blocks (school_id, group_id, weekday, starts_at, ends_at, subject_id, label) values
        (v_school, v_groups[g], k, '08:00', '09:00', v_subjects[1 + (k + g) % 4], null),
        (v_school, v_groups[g], k, '09:00', '10:00', v_subjects[1 + (k + g + 1) % 4], null),
        (v_school, v_groups[g], k, '10:00', '10:30', null, 'Recreo'),
        (v_school, v_groups[g], k, '10:30', '11:30', v_subjects[1 + (k + g + 2) % 4], null),
        (v_school, v_groups[g], k, '11:30', '12:30', v_subjects[1 + (k + g + 3) % 4], null),
        (v_school, v_groups[g], k, '12:30', '13:30', null, case when k = 1 then 'Honores y Educación Física' when k in (2, 4) then 'Inglés' else 'Artes' end);
    end loop;
  end loop;

  update public.schools set payment_info = 'Banco Demo · CLABE 000000000000000000 · Referencia: número de lista del alumno. También en caja de 7:30 a 14:00.'
  where id = v_school;
  for idx in 1..90 loop
    v_student := ('55555555-5555-5555-5555-' || lpad(idx::text, 12, '0'))::uuid;
    insert into public.tuition_charges (school_id, student_id, concept, amount, paid, due_on, paid_on) values
      (v_school, v_student, 'Inscripción 2026-2027', 4200, 4200, '2026-08-15', '2026-08-12'),
      (v_school, v_student, 'Colegiatura septiembre', 3500, 3500, '2026-09-10', '2026-09-08'),
      (v_school, v_student, 'Colegiatura octubre', 3500, case when idx % 17 = 0 then 0 else 3500 end, '2026-10-10', case when idx % 17 = 0 then null else '2026-10-09'::date end),
      (v_school, v_student, 'Colegiatura noviembre', 3500, case when idx % 9 = 0 or idx % 17 = 0 or idx = 31 then 0 else 3500 end, '2026-11-10',
       case when idx % 9 = 0 or idx % 17 = 0 or idx = 31 then null else '2026-11-10'::date end),
      (v_school, v_student, 'Colegiatura diciembre', 3500, 0, '2026-12-10', null);
  end loop;
end $$;
