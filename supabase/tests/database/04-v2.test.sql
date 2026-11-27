-- Versión 2: incidencias, reconocimientos, corte semanal, Excel del maestro, ficha y reportes.
begin;
set local search_path = public, extensions, tests;
select no_plan();

select tests.create_user('dir_v'), tests.create_user('maestra_v'), tests.create_user('maestro_ingles'),
       tests.create_user('papa_v'), tests.create_user('mama_v'), tests.create_user('dir_otra_v');

insert into schools (id, name, privacy_notice_version) values
  ('00000000-0000-0000-0000-0000000002a0', 'Escuela V2', 'v1'), ('00000000-0000-0000-0000-0000000002b0', 'Otra V2', 'v1');
insert into memberships (school_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000002a0', tests.uid('dir_v'), 'director'),
  ('00000000-0000-0000-0000-0000000002a0', tests.uid('maestra_v'), 'teacher'),
  ('00000000-0000-0000-0000-0000000002a0', tests.uid('maestro_ingles'), 'teacher'),
  ('00000000-0000-0000-0000-0000000002a0', tests.uid('papa_v'), 'guardian'),
  ('00000000-0000-0000-0000-0000000002a0', tests.uid('mama_v'), 'guardian'),
  ('00000000-0000-0000-0000-0000000002b0', tests.uid('dir_otra_v'), 'director');
insert into school_years (id, school_id, name, starts_on, ends_on, is_current) values
  ('00000000-0000-0000-0000-0000000002a1', '00000000-0000-0000-0000-0000000002a0', '2026-2027', '2026-08-31', '2027-07-15', true);
insert into periods (id, school_id, school_year_id, name, sort, starts_on, ends_on) values
  ('00000000-0000-0000-0000-0000000002a2', '00000000-0000-0000-0000-0000000002a0', '00000000-0000-0000-0000-0000000002a1', 'Trimestre 1', 1, '2026-08-31', '2026-11-27');
insert into subjects (id, school_id, name) values
  ('00000000-0000-0000-0000-0000000002a3', '00000000-0000-0000-0000-0000000002a0', 'Matemáticas'),
  ('00000000-0000-0000-0000-0000000002a4', '00000000-0000-0000-0000-0000000002a0', 'Inglés');
insert into groups (id, school_id, school_year_id, grade, name) values
  ('00000000-0000-0000-0000-0000000002a5', '00000000-0000-0000-0000-0000000002a0', '00000000-0000-0000-0000-0000000002a1', 5, 'A');
insert into teaching_assignments (school_id, group_id, subject_id, teacher_id, is_homeroom) values
  ('00000000-0000-0000-0000-0000000002a0', '00000000-0000-0000-0000-0000000002a5', '00000000-0000-0000-0000-0000000002a3', tests.uid('maestra_v'), true),
  ('00000000-0000-0000-0000-0000000002a0', '00000000-0000-0000-0000-0000000002a5', '00000000-0000-0000-0000-0000000002a4', tests.uid('maestro_ingles'), false);
insert into students (id, school_id, first_name, last_name) values
  ('00000000-0000-0000-0000-0000000002c1', '00000000-0000-0000-0000-0000000002a0', 'Pablo', 'Ríos'),
  ('00000000-0000-0000-0000-0000000002c2', '00000000-0000-0000-0000-0000000002a0', 'Rosa', 'León'),
  ('00000000-0000-0000-0000-0000000002c3', '00000000-0000-0000-0000-0000000002a0', 'Teo', 'Mar');
insert into enrollments (school_id, student_id, group_id, school_year_id)
select '00000000-0000-0000-0000-0000000002a0', s, '00000000-0000-0000-0000-0000000002a5', '00000000-0000-0000-0000-0000000002a1'
from unnest(array['00000000-0000-0000-0000-0000000002c1', '00000000-0000-0000-0000-0000000002c2', '00000000-0000-0000-0000-0000000002c3']::uuid[]) s;
insert into student_guardians (school_id, student_id, guardian_id, relationship) values
  ('00000000-0000-0000-0000-0000000002a0', '00000000-0000-0000-0000-0000000002c1', tests.uid('papa_v'), 'padre'),
  ('00000000-0000-0000-0000-0000000002a0', '00000000-0000-0000-0000-0000000002c2', tests.uid('mama_v'), 'madre');
insert into consents (school_id, user_id, notice_version) values
  ('00000000-0000-0000-0000-0000000002a0', tests.uid('papa_v'), 'v1'), ('00000000-0000-0000-0000-0000000002a0', tests.uid('mama_v'), 'v1');

-- Incidencias ----------------------------------------------------------------------------------
select tests.login('maestra_v');
create temp table inc as select report_incident(
  array['00000000-0000-0000-0000-0000000002c1']::uuid[], array['00000000-0000-0000-0000-0000000002c2']::uuid[],
  '2026-11-19', '10:40', 'patio', 'agresion_fisica', 'moderate',
  'Pablo empujó a Rosa en la fila del recreo.', 'aviso_familia', null) as id;
select tests.logout();
grant select on inc to authenticated;

select is((select count(*)::int from behavior_reports where incident_id = (select id from inc)), 2, 'una captura crea un registro por alumno');
select is((select involvement::text from behavior_reports where student_id = '00000000-0000-0000-0000-0000000002c2'), 'afectado', 'Rosa queda como afectada, no como responsable');
select ok((select bool_and(description !~ '(Pablo|Rosa)') from behavior_reports where incident_id = (select id from inc)),
  'el texto para las familias nunca nombra a otros alumnos');
select is((select count(*)::int from notifications where user_id in (tests.uid('papa_v'), tests.uid('mama_v')) and kind = 'case_update'), 2,
  'moderada: ambas familias reciben aviso');
select ok(not (select bool_or(urgent) from notifications where kind = 'case_update'), 'moderada no es urgente');
select ok((select bool_and(family_notified_at is not null) from behavior_reports where incident_id = (select id from inc)), 'queda registrado que se avisó');

select tests.login('papa_v');
select is((select count(*)::int from incidents), 0, 'las familias nunca ven la incidencia interna');
select is((select count(*)::int from behavior_reports), 1, 'el papá ve solo el registro de su hijo');
select tests.logout();

select tests.login('maestro_ingles');
select is((select count(*)::int from incidents), 1, 'otro maestro del grupo ve la incidencia de sus alumnos');
select tests.logout();

-- Leve: no avisa en el momento (va al resumen semanal)
select tests.login('maestra_v');
select lives_ok($$ select report_incident(array['00000000-0000-0000-0000-0000000002c3']::uuid[], '{}', '2026-11-20', null, 'salon', 'interrupcion', 'minor',
  'Interrumpió varias veces.', 'platica', 'Le costó esperar su turno para hablar.') $$, 'incidencia leve');
select throws_ok($$ select report_incident('{}', '{}', '2026-11-20', null, 'salon', 'otra', 'minor', 'x x x', 'platica', null) $$, '22023', null,
  'sin alumnos no se registra');
select tests.logout();
select is((select count(*)::int from notifications where student_id = '00000000-0000-0000-0000-0000000002c3'), 0, 'leve: sin aviso inmediato');
select is((select description from behavior_reports where student_id = '00000000-0000-0000-0000-0000000002c3'), 'Le costó esperar su turno para hablar.',
  'la familia ve el texto que escribió la maestra para ella');

-- Posible acoso: abre caso con dirección; grave: aviso urgente
select tests.login('maestra_v');
select lives_ok($$ select report_incident(array['00000000-0000-0000-0000-0000000002c1']::uuid[], array['00000000-0000-0000-0000-0000000002c3']::uuid[],
  '2026-11-21', '10:30', 'patio', 'acoso', 'serious', 'Burlas repetidas desde hace dos semanas.', 'citatorio', null) $$, 'posible acoso');
select tests.logout();
select is((select owner_id from cases where incident_id is not null and school_id = '00000000-0000-0000-0000-0000000002a0' limit 1), tests.uid('dir_v'), 'el caso de acoso queda a cargo de dirección');
select is((select status::text from cases where incident_id is not null and school_id = '00000000-0000-0000-0000-0000000002a0' limit 1), 'escalated', 'el caso nace escalado');
select ok((select bool_or(urgent) from notifications where user_id = tests.uid('papa_v') and kind = 'case_update'), 'grave: aviso urgente');

select tests.login('dir_otra_v');
select throws_ok($$ select report_incident(array['00000000-0000-0000-0000-0000000002c1']::uuid[], '{}', '2026-11-20', null, 'salon', 'otra', 'minor', 'intento', 'platica', null) $$,
  '42501', null, 'otra escuela no registra incidencias de alumnos ajenos');
select tests.logout();

-- Las alertas de conducta cuentan solo a quien participó, no al afectado
update alert_rules set threshold = 1 where school_id = '00000000-0000-0000-0000-0000000002a0' and indicator = 'behavior';
select private.evaluate_alerts('00000000-0000-0000-0000-0000000002a0', '2026-11-21');
select ok(not exists (select 1 from alerts where student_id = '00000000-0000-0000-0000-0000000002c2' and indicator = 'behavior'),
  'a la niña afectada no se le levanta alerta de conducta');
select ok(exists (select 1 from alerts where student_id = '00000000-0000-0000-0000-0000000002c1' and indicator = 'behavior'),
  'al alumno que participó sí');

-- Reconocimientos ---------------------------------------------------------------------------------
select tests.login('maestra_v');
select is(give_recognition(array['00000000-0000-0000-0000-0000000002c1', '00000000-0000-0000-0000-0000000002c2']::uuid[], 'colaboracion', 'Ayudaron a ordenar el salón'), 2,
  'reconocimiento a varios alumnos de una vez');
select tests.logout();
select tests.login('papa_v');
select is((select count(*)::int from recognitions), 1, 'el papá ve los reconocimientos de su hijo, no los de otros');
select throws_ok($$ select give_recognition(array['00000000-0000-0000-0000-0000000002c1']::uuid[], 'esfuerzo') $$, '42501', null,
  'un papá no puede dar reconocimientos');
select tests.logout();

-- Corte semanal -------------------------------------------------------------------------------------
select tests.login('maestra_v');
select is(save_weekly_pending('00000000-0000-0000-0000-0000000002a5', '00000000-0000-0000-0000-0000000002a3', '2026-11-18',
  jsonb_build_object('00000000-0000-0000-0000-0000000002c1', 2)), 3, 'el corte guarda a todo el grupo');
select is((select week_start from weekly_pending limit 1), '2026-11-16'::date, 'cualquier día se normaliza al lunes de esa semana');
select is((select pending_count from weekly_pending where student_id = '00000000-0000-0000-0000-0000000002c2'), 0::smallint, 'quien no se marcó queda al corriente');
select is(save_weekly_pending('00000000-0000-0000-0000-0000000002a5', '00000000-0000-0000-0000-0000000002a3', '2026-11-16',
  jsonb_build_object('00000000-0000-0000-0000-0000000002c1', 2)), 0, 'repetir el mismo corte no cambia nada');
select throws_ok($$ select save_weekly_pending('00000000-0000-0000-0000-0000000002a5', '00000000-0000-0000-0000-0000000002a4', '2026-11-16', '{}') $$,
  '42501', null, 'la maestra no captura pendientes de una materia que no da');
select tests.logout();

-- Excel del maestro ---------------------------------------------------------------------------------
select tests.login('maestro_ingles');
select is((import_gradebook('00000000-0000-0000-0000-0000000002a5', '00000000-0000-0000-0000-0000000002a4', 'ingles.xlsx',
  jsonb_build_array(jsonb_build_object('title', 'Unit 1 worksheet', 'due_on', '2026-11-17', 'missing', jsonb_build_array('00000000-0000-0000-0000-0000000002c3')),
                    jsonb_build_object('title', 'Vocabulary quiz', 'missing', jsonb_build_array())))->>'activities')::int, 2,
  'del Excel se crean las actividades');
select is((import_gradebook('00000000-0000-0000-0000-0000000002a5', '00000000-0000-0000-0000-0000000002a4', 'ingles.xlsx',
  jsonb_build_array(jsonb_build_object('title', 'Unit 1 worksheet', 'due_on', '2026-11-17', 'missing', jsonb_build_array()))))->>'missing', '0',
  'subir otra vez el Excel actualiza (Teo ya entregó) sin duplicar');
select is((select count(*)::int from assignments where source = 'excel'), 2, 'no se duplicaron actividades');
select throws_ok($$ select import_gradebook('00000000-0000-0000-0000-0000000002a5', '00000000-0000-0000-0000-0000000002a3', 'x.xlsx', '[]') $$,
  '42501', null, 'no sube Excel de una materia que no da');
select tests.logout();

-- Ficha v2 -----------------------------------------------------------------------------------------
select tests.login('papa_v');
select is(jsonb_array_length(student_overview('00000000-0000-0000-0000-0000000002c1', '2026-11-20')->'week'->'days'), 5, 'la semana trae lunes a viernes');
select is((student_overview('00000000-0000-0000-0000-0000000002c1', '2026-11-20')->'week'->'pending'->0->>'count')::int, 2, 'la semana trae los pendientes del corte');
select is(jsonb_array_length(student_overview('00000000-0000-0000-0000-0000000002c1', '2026-11-25')->'recognitions'), 1, 'la ficha trae sus reconocimientos');
select ok((student_overview('00000000-0000-0000-0000-0000000002c1', '2026-11-25')->'behavior')::text !~ '(Rosa|Teo|empujó)', 'la ficha del papá no trae nombres ni el texto interno');
select tests.logout();

-- Resumen semanal con pendientes y reconocimientos
select private.build_weekly_digests('2026-11-20', '00000000-0000-0000-0000-0000000002a0');
select matches((select body from notifications where kind = 'weekly_digest' and student_id = '00000000-0000-0000-0000-0000000002c1'),
  'Trabajos pendientes: 2 de Matemáticas', 'el resumen semanal dice cuántos pendientes y de qué materia');
select matches((select body from notifications where kind = 'weekly_digest' and student_id = '00000000-0000-0000-0000-0000000002c2'),
  'Entregó todos sus trabajos', 'si está al corriente, el resumen lo reconoce');

-- Reportes ------------------------------------------------------------------------------------------
select tests.login('dir_v');
select is((report_behavior('00000000-0000-0000-0000-0000000002a0', '2026-11-01', '2026-11-30')->>'total')::int, 3, 'convivencia: total de incidencias');
select is((report_behavior('00000000-0000-0000-0000-0000000002a0', '2026-11-01', '2026-11-30')->>'bullying_open')::int, 1, 'convivencia: casos de acoso abiertos');
select is((report_behavior('00000000-0000-0000-0000-0000000002a0', '2026-11-01', '2026-11-30')->'by_location'->0->>'key'), 'patio', 'convivencia: el lugar con más incidencias');
select ok(report_staff('00000000-0000-0000-0000-0000000002a0', '2026-11-01', '2026-11-30') is not null, 'cumplimiento docente');
select ok(report_grades('00000000-0000-0000-0000-0000000002a0', '00000000-0000-0000-0000-0000000002a2') ? 'capture_by_teacher', 'reporte de calificaciones');
select ok(report_attendance('00000000-0000-0000-0000-0000000002a0', '2026-11-01', '2026-11-30') ? 'chronic_students', 'reporte de asistencia');
select tests.logout();
select tests.login('maestra_v');
select throws_ok($$ select report_behavior('00000000-0000-0000-0000-0000000002a0', '2026-11-01', '2026-11-30') $$, '42501', null, 'los reportes son de dirección');
select tests.logout();
select tests.login('dir_otra_v');
select throws_ok($$ select report_staff('00000000-0000-0000-0000-0000000002a0', '2026-11-01', '2026-11-30') $$, '42501', null, 'otra escuela no ve reportes ajenos');
select tests.logout();

select * from finish();
rollback;
