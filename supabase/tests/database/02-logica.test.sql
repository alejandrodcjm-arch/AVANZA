-- Pruebas de la lógica de negocio: alertas, límite de avisos, resumen semanal, foto de datos,
-- aprobación de resúmenes, casos y tablero del director.
begin;
set local search_path = public, extensions, tests;
select no_plan();

-- Escenario ----------------------------------------------------------------
select tests.create_user('dir_l'), tests.create_user('maestra_l'), tests.create_user('papa_l'),
       tests.create_user('mama_l'), tests.create_user('dir_otra');

insert into schools (id, name, privacy_notice_version) values
  ('00000000-0000-0000-0000-0000000000c1', 'Escuela Lógica', 'v1'),
  ('00000000-0000-0000-0000-0000000000c2', 'Escuela Otra', 'v1');
insert into memberships (school_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000c1', tests.uid('dir_l'), 'director'),
  ('00000000-0000-0000-0000-0000000000c1', tests.uid('maestra_l'), 'teacher'),
  ('00000000-0000-0000-0000-0000000000c1', tests.uid('papa_l'), 'guardian'),
  ('00000000-0000-0000-0000-0000000000c1', tests.uid('mama_l'), 'guardian'),
  ('00000000-0000-0000-0000-0000000000c2', tests.uid('dir_otra'), 'director');
insert into school_years (id, school_id, name, starts_on, ends_on, is_current) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', '2026-2027', '2026-08-31', '2027-07-15', true);
insert into periods (id, school_id, school_year_id, name, sort, starts_on, ends_on) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', 'Trimestre 1', 1, '2026-08-31', '2026-11-27'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', 'Trimestre 2', 2, '2026-11-30', '2027-03-12');
insert into subjects (id, school_id, name) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'Matemáticas'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', 'Lenguajes');
insert into groups (id, school_id, school_year_id, grade, name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', 4, 'A');
insert into teaching_assignments (school_id, group_id, subject_id, teacher_id, is_homeroom) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', tests.uid('maestra_l'), true),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f2', tests.uid('maestra_l'), false);

-- Ana: falta mucho. Beto: va bien. Carla: reprueba y no entrega tareas.
insert into students (id, school_id, first_name, last_name) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Ana', 'Ruiz'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', 'Beto', 'Ruiz'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000c1', 'Carla', 'Paz');
insert into enrollments (school_id, student_id, group_id, school_year_id)
select '00000000-0000-0000-0000-0000000000c1', s, '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1'
from unnest(array['00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2',
                  '00000000-0000-0000-0000-0000000000b3']::uuid[]) s;

-- papa_l (con aviso) es tutor de Ana y Beto; mama_l (sin aviso) es tutora de Carla.
insert into student_guardians (school_id, student_id, guardian_id, relationship) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', tests.uid('papa_l'), 'padre'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', tests.uid('papa_l'), 'padre'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b3', tests.uid('mama_l'), 'madre');
insert into consents (school_id, user_id, notice_version) values
  ('00000000-0000-0000-0000-0000000000c1', tests.uid('papa_l'), 'v1');

-- 20 días hábiles de asistencia (26 oct a 20 nov). Ana falta 4 (20 %), Beto 0, Carla 1 (5 %).
insert into attendance (school_id, student_id, group_id, date, status)
select '00000000-0000-0000-0000-0000000000c1', s.id, '00000000-0000-0000-0000-0000000000a1', d::date,
       case when s.id = '00000000-0000-0000-0000-0000000000b1' and d::date in ('2026-11-03', '2026-11-10', '2026-11-17', '2026-11-19') then 'absent'
            when s.id = '00000000-0000-0000-0000-0000000000b3' and d::date = '2026-11-12' then 'absent'
            when s.id = '00000000-0000-0000-0000-0000000000b2' and d::date = '2026-11-18' then 'late'
            else 'present' end::attendance_status
from students s
cross join generate_series('2026-10-26'::date, '2026-11-20'::date, interval '1 day') d
where s.school_id = '00000000-0000-0000-0000-0000000000c1' and extract(isodow from d) < 6;

insert into grades (school_id, student_id, subject_id, period_id, score) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 8.0),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 9.5),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 5.0),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e1', 7.0);

-- Carla no entrega 3 tareas de noviembre.
with t as (
  insert into assignments (school_id, group_id, subject_id, title, due_on)
  select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1',
         'Tarea ' || n, ('2026-11-0' || n)::date
  from generate_series(2, 4) n
  returning id)
insert into assignment_misses (school_id, assignment_id, student_id)
select '00000000-0000-0000-0000-0000000000c1', id, '00000000-0000-0000-0000-0000000000b3' from t;

insert into behavior_reports (school_id, student_id, occurred_on, severity, description) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', '2026-11-11', 'minor', 'Uno'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', '2026-11-18', 'minor', 'Dos');

insert into sensitive_notes (school_id, student_id, body, created_by) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'SECRETO-MEDICO-XYZ', tests.uid('maestra_l'));
insert into observations (school_id, student_id, body, created_by, created_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Lee con más fluidez.', tests.uid('maestra_l'), '2026-11-15');

-- Motor de alertas -------------------------------------------------------
select is(private.evaluate_alerts('00000000-0000-0000-0000-0000000000c1', '2026-11-20'), 4,
  'el motor crea 4 alertas: faltas de Ana, conducta de Ana, calificación y tareas de Carla');
select results_eq(
  $$ select s.first_name || ':' || a.indicator::text from alerts a join students s on s.id = a.student_id
     where a.school_id = '00000000-0000-0000-0000-0000000000c1' order by 1 $$,
  array['Ana:attendance', 'Ana:behavior', 'Carla:assignments', 'Carla:grades'],
  'las alertas son exactamente las esperadas');
select is((select (detail->>'pct')::numeric from alerts where student_id = '00000000-0000-0000-0000-0000000000b1' and indicator = 'attendance'),
  20.0, 'la alerta de faltas guarda el porcentaje exacto (4 de 20)');
select ok(not exists (select 1 from alerts where student_id = '00000000-0000-0000-0000-0000000000b2'),
  'Beto, que va bien, no tiene alertas');
select is(private.evaluate_alerts('00000000-0000-0000-0000-0000000000c1', '2026-11-20'), 0,
  'correr el motor otra vez no duplica alertas abiertas');
select is((select count(*)::int from notifications where kind = 'alert' and user_id = tests.uid('maestra_l')), 1,
  'la maestra titular recibe un solo aviso con el total');
select is((select body from notifications where kind = 'alert' and user_id = tests.uid('dir_l')), '4 alertas nuevas hoy.',
  'el director recibe un aviso con el número exacto');
select ok(not exists (select 1 from notifications where kind = 'alert' and user_id in (tests.uid('papa_l'), tests.uid('mama_l'))),
  'los papás nunca reciben avisos de alertas');
select ok(not exists (select 1 from alerts where school_id = '00000000-0000-0000-0000-0000000000c2'),
  'otra escuela no recibe alertas ajenas');

-- Si se descarta, al día siguiente puede volver a abrirse (sigue habiendo riesgo)
select tests.login('maestra_l');
select lives_ok($$ select dismiss_alert((select id from alerts where student_id = '00000000-0000-0000-0000-0000000000b3' and indicator = 'grades'), 'Ya habló con los papás') $$,
  'la maestra descarta una alerta con motivo');
select throws_ok($$ select dismiss_alert((select id from alerts where student_id = '00000000-0000-0000-0000-0000000000b1' and indicator = 'behavior'), '') $$,
  '22023', null, 'no se puede descartar sin motivo');
select tests.logout();
select is(private.evaluate_alerts('00000000-0000-0000-0000-0000000000c1', '2026-11-20'), 1,
  'tras descartar, una nueva evaluación puede reabrir la alerta si el dato sigue igual');

-- Un papá no puede descartar alertas (ni verlas)
select tests.login('papa_l');
select throws_ok($$ select dismiss_alert((select id from alerts limit 1), 'intento') $$, 'P0002', null,
  'un papá no puede descartar alertas');
select tests.logout();

-- Límite de avisos: máximo 3 no urgentes por semana por hijo ----------------
select is(private.notify('00000000-0000-0000-0000-0000000000c1', tests.uid('papa_l'), '00000000-0000-0000-0000-0000000000b1', 'case_update', 't', 'b'), true, 'aviso 1 sale');
select is(private.notify('00000000-0000-0000-0000-0000000000c1', tests.uid('papa_l'), '00000000-0000-0000-0000-0000000000b1', 'case_update', 't', 'b'), true, 'aviso 2 sale');
select is(private.notify('00000000-0000-0000-0000-0000000000c1', tests.uid('papa_l'), '00000000-0000-0000-0000-0000000000b1', 'case_update', 't', 'b'), true, 'aviso 3 sale');
select is(private.notify('00000000-0000-0000-0000-0000000000c1', tests.uid('papa_l'), '00000000-0000-0000-0000-0000000000b1', 'case_update', 't', 'b'), false, 'el aviso 4 de la semana se detiene');
select is(private.notify('00000000-0000-0000-0000-0000000000c1', tests.uid('papa_l'), '00000000-0000-0000-0000-0000000000b1', 'case_update', 't', 'b', null, true), true, 'un aviso urgente sí sale');
select is(private.notify('00000000-0000-0000-0000-0000000000c1', tests.uid('papa_l'), '00000000-0000-0000-0000-0000000000b2', 'case_update', 't', 'b'), true, 'el límite es por hijo: Beto aún tiene cupo');
delete from notifications where user_id = tests.uid('papa_l');

-- Resumen semanal -------------------------------------------------------------
select is(private.build_weekly_digests('2026-11-20', '00000000-0000-0000-0000-0000000000c1'), 2,
  'resumen semanal: uno por hijo del papá con aviso; ninguno para la mamá sin aviso');
select is((select body from notifications where kind = 'weekly_digest' and student_id = '00000000-0000-0000-0000-0000000000b1'),
  'Faltó 2 días esta semana. Lleva 4 faltas en el trimestre.', 'el resumen de Ana dice números exactos');
select is((select body from notifications where kind = 'weekly_digest' and student_id = '00000000-0000-0000-0000-0000000000b2'),
  'Asistió todos los días de esta semana. No ha faltado en el trimestre.', 'el resumen de Beto reconoce su asistencia');
select ok((select bool_and(body !~* '(promedio del grupo|compañeros|lugar|ranking|mejor que|peor que)') from notifications where kind = 'weekly_digest'),
  'el resumen semanal nunca compara con otros alumnos');
select is(private.build_weekly_digests('2026-11-20', '00000000-0000-0000-0000-0000000000c1'), 0,
  'no se manda dos veces el resumen semanal');

-- Foto de datos para la IA ---------------------------------------------------
select is((build_summary_snapshot('00000000-0000-0000-0000-0000000000b1', '2026-11-01')->'attendance'->>'month_absences')::int, 4,
  'la foto trae las faltas exactas del mes');
select is(build_summary_snapshot('00000000-0000-0000-0000-0000000000b1', '2026-11-01')->>'student_first_name', 'Ana',
  'la foto solo trae el nombre de pila');
select ok(build_summary_snapshot('00000000-0000-0000-0000-0000000000b1', '2026-11-01')::text !~ '(Ruiz|SECRETO)',
  'la foto nunca trae apellidos ni notas sensibles');
select is(build_summary_snapshot('00000000-0000-0000-0000-0000000000b1', '2026-11-01')->>'grades_period', 'Trimestre 1',
  'noviembre usa las calificaciones del trimestre 1 aunque el 2 empiece el 30');
select is(jsonb_array_length(build_summary_snapshot('00000000-0000-0000-0000-0000000000b3', '2026-11-01')->'missed_assignments'), 1,
  'la foto agrupa las tareas no entregadas por materia');
select is(build_summary_snapshot('00000000-0000-0000-0000-0000000000b1', '2026-11-01')->'teacher_observations'->>0, 'Lee con más fluidez.',
  'la foto trae las observaciones del mes');

select tests.login('papa_l');
select throws_ok($$ select build_summary_snapshot('00000000-0000-0000-0000-0000000000b1', '2026-11-01') $$, '42501', null,
  'un papá no puede pedir la foto de datos');
select tests.logout();

-- Resumen mensual: preparar, borrador del sistema, aprobación ---------------------
select is(private.prepare_monthly_summaries('2026-11-01', '00000000-0000-0000-0000-0000000000c1'), 3,
  'se prepara un resumen por alumno inscrito');
select is(private.prepare_monthly_summaries('2026-11-01', '00000000-0000-0000-0000-0000000000c1'), 0,
  'preparar otra vez no duplica');

select lives_ok($$ select save_summary_draft((select id from monthly_summaries where student_id = '00000000-0000-0000-0000-0000000000b3'),
  'Borrador con error', '["número no coincide"]', 'v1', 'modelo') $$, 'el sistema guarda un borrador');
select is((select status::text from monthly_summaries where student_id = '00000000-0000-0000-0000-0000000000b3'), 'needs_manual',
  'un borrador que no pasa la validación queda para redacción manual');

select tests.login('maestra_l');
select throws_ok($$ select save_summary_draft((select id from monthly_summaries limit 1), 'x', '[]', 'v1', 'm') $$, '42501', null,
  'una persona no puede guardar borradores como si fuera el sistema');
select throws_ok($$ select approve_summary((select id from monthly_summaries where student_id = '00000000-0000-0000-0000-0000000000b1'), 'Muy corto') $$,
  '22023', null, 'no se aprueba un texto demasiado corto');
select lives_ok($$ select approve_summary((select id from monthly_summaries where student_id = '00000000-0000-0000-0000-0000000000b1'),
  'Este mes Ana faltó 4 días. Su meta para diciembre es llegar todos los días; en casa pueden ayudar preparando la mochila la noche anterior.') $$,
  'la maestra aprueba el resumen de Ana');
select throws_ok($$ select approve_summary((select id from monthly_summaries where student_id = '00000000-0000-0000-0000-0000000000b1'),
  'Este mes Ana faltó 4 días. Su meta para diciembre es llegar todos los días; en casa pueden ayudar.') $$,
  'P0001', null, 'un resumen aprobado no se vuelve a aprobar');
select tests.logout();
select is((select approved_by from monthly_summaries where student_id = '00000000-0000-0000-0000-0000000000b1'), tests.uid('maestra_l'),
  'queda registrado quién aprobó');
select is((select count(*)::int from notifications where kind = 'monthly_summary' and user_id = tests.uid('papa_l')), 1,
  'el papá con aviso recibe el resumen aprobado');

select tests.login('papa_l');
select is((select count(*)::int from monthly_summaries), 1, 'el papá solo ve el resumen aprobado de su hija');
select tests.logout();

select tests.login('dir_otra');
select throws_ok($$ select approve_summary((select id from monthly_summaries where student_id = '00000000-0000-0000-0000-0000000000b2'),
  'Texto suficientemente largo para pasar la validación de longitud mínima.') $$, null, null,
  'un director de otra escuela no puede aprobar');
select tests.logout();

-- Casos ------------------------------------------------------------------------
select tests.login('maestra_l');
select lives_ok($$ select convert_alert_to_case((select id from alerts where student_id = '00000000-0000-0000-0000-0000000000b1' and indicator = 'attendance'),
  'Ana falta los martes') $$, 'la maestra convierte una alerta en caso');
select tests.logout();
select is((select status::text from alerts where student_id = '00000000-0000-0000-0000-0000000000b1' and indicator = 'attendance'), 'converted',
  'la alerta queda como convertida');
select is((select owner_id from cases where student_id = '00000000-0000-0000-0000-0000000000b1'), tests.uid('maestra_l'),
  'el caso queda a cargo de quien lo abrió');

select tests.login('maestra_l');
select lives_ok($$ select escalate_case((select id from cases where student_id = '00000000-0000-0000-0000-0000000000b1')) $$,
  'la maestra escala el caso');
select tests.logout();
select is((select owner_id from cases where student_id = '00000000-0000-0000-0000-0000000000b1'), tests.uid('dir_l'),
  'al escalar, el caso pasa al director');

select tests.login('dir_l');
select throws_ok($$ select close_case((select id from cases where student_id = '00000000-0000-0000-0000-0000000000b1'), '') $$,
  '22023', null, 'no se cierra un caso sin resultado');
select lives_ok($$ select close_case((select id from cases where student_id = '00000000-0000-0000-0000-0000000000b1'),
  'Los papás ajustaron horarios; asistió toda la semana.') $$, 'el director cierra el caso con resultado');

-- Tablero del director -------------------------------------------------------
select is((director_dashboard('00000000-0000-0000-0000-0000000000c1', '2026-11-20')->>'open_alerts')::int, 3,
  'el tablero cuenta las alertas abiertas');
select is((director_dashboard('00000000-0000-0000-0000-0000000000c1', '2026-11-20')->>'summaries_pending')::int, 2,
  'el tablero cuenta resúmenes por aprobar');
select is(jsonb_array_length(director_dashboard('00000000-0000-0000-0000-0000000000c1', '2026-11-25')->'teachers_behind'), 1,
  'el tablero muestra al maestro que lleva más de 2 días sin pasar lista');
select tests.logout();

select tests.login('maestra_l');
select throws_ok($$ select director_dashboard('00000000-0000-0000-0000-0000000000c1') $$, '42501', null,
  'una maestra no puede ver el tablero del director');
select tests.logout();
select tests.login('dir_otra');
select throws_ok($$ select director_dashboard('00000000-0000-0000-0000-0000000000c1') $$, '42501', null,
  'un director de otra escuela no ve el tablero ajeno');
select tests.logout();

-- Funciones del sistema cerradas al navegador
select ok(not has_function_privilege('authenticated', 'private.evaluate_alerts(uuid, date)', 'execute'),
  'el navegador no puede correr el motor de alertas');
select ok(not has_function_privilege('authenticated', 'public.save_summary_draft(uuid, text, jsonb, text, text)', 'execute'),
  'el navegador no puede guardar borradores de la IA');

select * from finish();
rollback;
