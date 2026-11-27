-- Pruebas de las funciones que usa la app: importación, invitaciones, captura, ficha y descarga de datos.
begin;
set local search_path = public, extensions, tests;
select no_plan();

select tests.create_user('dir_i'), tests.create_user('maestra_i'), tests.create_user('maestro_otro'),
       tests.create_user('dir_ajeno'), tests.create_user('lupita');

insert into schools (id, name, privacy_notice_version) values
  ('00000000-0000-0000-0000-0000000001a0', 'Escuela Importa', 'v1'),
  ('00000000-0000-0000-0000-0000000001b0', 'Escuela Ajena', 'v1');
insert into memberships (school_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000001a0', tests.uid('dir_i'), 'director'),
  ('00000000-0000-0000-0000-0000000001a0', tests.uid('maestra_i'), 'teacher'),
  ('00000000-0000-0000-0000-0000000001a0', tests.uid('maestro_otro'), 'teacher'),
  ('00000000-0000-0000-0000-0000000001b0', tests.uid('dir_ajeno'), 'director');
insert into school_years (id, school_id, name, starts_on, ends_on, is_current) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000001a0', '2026-2027', '2026-08-31', '2027-07-15', true);
insert into periods (id, school_id, school_year_id, name, sort, starts_on, ends_on) values
  ('00000000-0000-0000-0000-0000000001a2', '00000000-0000-0000-0000-0000000001a0', '00000000-0000-0000-0000-0000000001a1', 'Trimestre 1', 1, '2026-08-31', '2026-11-27');
insert into subjects (id, school_id, name) values
  ('00000000-0000-0000-0000-0000000001a3', '00000000-0000-0000-0000-0000000001a0', 'Matemáticas');

-- Importación ------------------------------------------------------------------
create temp table roster as select $j$[
  {"grado": 2, "grupo": "a", "nombre": "Lucía", "apellido_paterno": "Mora", "apellido_materno": "Vela",
   "tutores": [{"nombre": "Guadalupe Vela", "correo": "Lupita@Test.mx", "parentesco": "madre"},
               {"nombre": "Pedro Mora", "correo": "pedro@test.mx", "parentesco": "padre"}]},
  {"grado": 2, "grupo": "A", "nombre": "Tomás", "apellido_paterno": "Mora", "apellido_materno": "Vela",
   "tutores": [{"nombre": "Guadalupe Vela", "correo": "lupita@test.mx", "parentesco": "madre"}]},
  {"grado": 2, "grupo": "B", "nombre": "Iván", "apellido_paterno": "Gil", "apellido_materno": "",
   "tutores": []}
]$j$::jsonb as rows;
grant select on roster to authenticated;

select tests.login('maestra_i');
select throws_ok($$ select import_roster('00000000-0000-0000-0000-0000000001a0', (select rows from roster)) $$, '42501', null,
  'una maestra no puede importar alumnos');
select tests.logout();

select tests.login('dir_ajeno');
select throws_ok($$ select import_roster('00000000-0000-0000-0000-0000000001a0', (select rows from roster)) $$, '42501', null,
  'el director de otra escuela no puede importar');
select tests.logout();

select tests.login('dir_i');
create temp table r1 as select import_roster('00000000-0000-0000-0000-0000000001a0', (select rows from roster), 'lista.xlsx') as res;
select is((select (res->>'groups_created')::int from r1), 2, 'se crean los grupos 2A y 2B (sin importar mayúsculas)');
select is((select (res->>'students_created')::int from r1), 3, 'se crean 3 alumnos');
select is((select jsonb_array_length(res->'invitations') from r1), 3, 'se crean 3 invitaciones (mamá con 2 hijos = 2 invitaciones)');
select ok((select bool_and(length(x->>'token') = 32) from r1, jsonb_array_elements(res->'invitations') x),
  'cada invitación trae su token para el correo');
select is((select email from guardian_invitations where full_name = 'Pedro Mora'), 'pedro@test.mx', 'los correos se guardan en minúsculas');
select ok(not exists (select 1 from guardian_invitations gi, r1, jsonb_array_elements(r1.res->'invitations') x
                      where gi.token_hash = x->>'token'), 'en la base se guarda el hash, nunca el token');

create temp table r2 as select import_roster('00000000-0000-0000-0000-0000000001a0', (select rows from roster)) as res;
select is((select (res->>'students_created')::int + (res->>'groups_created')::int from r2), 0,
  'subir el mismo archivo otra vez no duplica alumnos ni grupos');
select is((select (res->>'students_unchanged')::int from r2), 3, 'los 3 alumnos se reconocen como existentes');
select is((select count(*)::int from students where school_id = '00000000-0000-0000-0000-0000000001a0'), 3, 'siguen siendo 3 alumnos');
select is((select count(*)::int from imports where school_id = '00000000-0000-0000-0000-0000000001a0'), 2, 'cada importación queda registrada');

-- Cambio de grupo
select is((import_roster('00000000-0000-0000-0000-0000000001a0',
   '[{"grado": 2, "grupo": "B", "nombre": "lucía", "apellido_paterno": "MORA", "apellido_materno": "vela", "tutores": []}]')->>'students_moved')::int,
  1, 'si el alumno aparece en otro grupo, se cambia de grupo');
select throws_ok($$ select import_roster('00000000-0000-0000-0000-0000000001a0', '[]') $$, '22023', null, 'un archivo vacío se rechaza');
select tests.logout();

-- Invitación: vista previa y aceptación -----------------------------------------
create temp table tok as select x->>'token' as token from r1, jsonb_array_elements(r1.res->'invitations') x
  where x->>'email' = 'lupita@test.mx' and x->>'student_first_name' = 'Lucía';
-- La segunda importación renovó los tokens: usar el vigente.
delete from tok;
grant select, insert on tok to anon, authenticated;
select tests.login('dir_i');
insert into tok select renew_invitation((select id from guardian_invitations where email = 'lupita@test.mx'
  and student_id = (select id from students where first_name = 'Lucía')))->>'token';
select tests.logout();

select tests.login_anon();
select is((select invitation_preview((select token from tok))->>'valid'), 'true', 'sin sesión se puede ver la invitación vigente');
select is((select invitation_preview((select token from tok))->>'student_first_name'), 'Lucía', 'la vista previa trae el nombre de pila');
select is(invitation_preview('token-falso')->>'reason', 'not_found', 'un token falso no muestra nada');
select tests.logout();

select tests.login('lupita');
select lives_ok($$ select accept_guardian_invitation((select token from tok)) $$, 'la mamá acepta la invitación');
select tests.logout();
select is((select count(*)::int from student_guardians where guardian_id = tests.uid('lupita')), 2,
  'al aceptar, queda vinculada con sus 2 hijos');
select tests.login_anon();
select is((select invitation_preview((select token from tok))->>'reason'), 'used', 'la invitación usada ya no es válida');
select tests.logout();

select tests.login('dir_i');
select throws_ok($$ select renew_invitation((select id from guardian_invitations where email = 'lupita@test.mx' limit 1)) $$,
  'P0001', null, 'no se renueva una invitación aceptada');
select is((import_roster('00000000-0000-0000-0000-0000000001a0', (select rows from roster))->'invitations')::text !~ 'lupita', true,
  'reimportar no vuelve a invitar a quien ya está vinculada');
select tests.logout();

-- Captura: pasar lista ---------------------------------------------------------------
-- Lucía y Tomás quedaron en 2A (la última importación los regresó); Iván en 2B. La maestra da clase a ambos.
insert into teaching_assignments (school_id, group_id, subject_id, teacher_id, is_homeroom)
select '00000000-0000-0000-0000-0000000001a0', id, '00000000-0000-0000-0000-0000000001a3', tests.uid('maestra_i'), true
from groups where school_id = '00000000-0000-0000-0000-0000000001a0';
create temp table gid as select (select id from groups where school_id = '00000000-0000-0000-0000-0000000001a0' and name = 'A') as a,
                                (select id from groups where school_id = '00000000-0000-0000-0000-0000000001a0' and name = 'B') as b;
grant select on gid to authenticated;

select tests.login('maestra_i');
select is(save_attendance((select a from gid), '2026-11-20',
  jsonb_build_object((select id from students where first_name = 'Tomás')::text, 'absent')), 2,
  'pasar lista guarda a todo el grupo de una vez (todos presentes salvo excepciones)');
select is((select status::text from attendance where student_id = (select id from students where first_name = 'Lucía') and date = '2026-11-20'),
  'present', 'quien no se marcó queda presente');
select is((select status::text from attendance where student_id = (select id from students where first_name = 'Tomás') and date = '2026-11-20'),
  'absent', 'la excepción queda como falta');
select is(save_attendance((select a from gid), '2026-11-20', '{}'), 1, 'corregir la lista solo cambia lo distinto');
select is(save_attendance((select b from gid), '2026-11-20',
  jsonb_build_object((select id from students where first_name = 'Iván')::text, 'absent')), 1, 'lista del 2B');
select throws_ok($$ select save_attendance((select a from gid), current_date + 5, '{}') $$,
  '22023', null, 'no se pasa lista de días futuros');
select tests.logout();

select tests.login('maestro_otro');
select throws_ok($$ select save_attendance((select b from gid), '2026-11-21', '{}') $$,
  '42501', null, 'un maestro que no da clase al grupo no puede pasar lista');
select throws_ok($$ select save_grades('00000000-0000-0000-0000-0000000001a3', '00000000-0000-0000-0000-0000000001a2',
  jsonb_build_object((select id from students where first_name = 'Iván')::text, 9)) $$, null, null,
  'ni capturar calificaciones');
select tests.logout();

-- Captura: calificaciones ---------------------------------------------------------------
select tests.login('maestra_i');
select is(save_grades('00000000-0000-0000-0000-0000000001a3', '00000000-0000-0000-0000-0000000001a2',
  jsonb_build_object((select id from students where first_name = 'Iván')::text, 8.46,
                     (select id from students where first_name = 'Lucía')::text, '9')), 2, 'se guardan calificaciones');
select is((select score from grades where student_id = (select id from students where first_name = 'Iván')), 8.5::numeric,
  'la calificación se redondea a un decimal');
select throws_ok($$ select save_grades('00000000-0000-0000-0000-0000000001a3', '00000000-0000-0000-0000-0000000001a2',
  jsonb_build_object((select id from students where first_name = 'Iván')::text, 11)) $$, '22023', null, 'no se aceptan calificaciones fuera de 5 a 10');
select is(save_grades('00000000-0000-0000-0000-0000000001a3', '00000000-0000-0000-0000-0000000001a2',
  jsonb_build_object((select id from students where first_name = 'Lucía')::text, null)), 1, 'una calificación vacía se borra');

-- Captura: tareas no entregadas
insert into assignments (school_id, group_id, subject_id, title, due_on, created_by)
select '00000000-0000-0000-0000-0000000001a0', id, '00000000-0000-0000-0000-0000000001a3', 'Problemas', '2026-11-19', tests.uid('maestra_i')
from groups where school_id = '00000000-0000-0000-0000-0000000001a0' and name = 'B';
select is(set_assignment_misses((select id from assignments where title = 'Problemas'),
  array[(select id from students where first_name = 'Iván'), (select id from students where first_name = 'Lucía')]), 2,
  'se marcan 2 tareas no entregadas');
select is(set_assignment_misses((select id from assignments where title = 'Problemas'),
  array[(select id from students where first_name = 'Iván')]), 1, 'quitar a alguien de la lista la marca como entregada');

-- Ficha
select is(student_overview((select id from students where first_name = 'Iván'), '2026-11-20')->'attendance'->>'absences', '1',
  'la ficha cuenta las faltas del trimestre');
select is(jsonb_array_length(student_overview((select id from students where first_name = 'Iván'), '2026-11-20')->'pending_work'), 1,
  'la ficha muestra la tarea pendiente');
select tests.logout();

select tests.login('lupita');
select throws_ok($$ select student_overview((select id from students where first_name = 'Iván')) $$, 'P0002', null,
  'la mamá no puede ver la ficha de un alumno que no es su hijo');
insert into consents (school_id, user_id, notice_version) values ('00000000-0000-0000-0000-0000000001a0', tests.uid('lupita'), 'v1');
select is(student_overview((select s.id from students s where s.first_name = 'Lucía'), '2026-11-20')->'student'->>'first_name', 'Lucía',
  'con aviso aceptado, la mamá ve la ficha de su hija');
select is(jsonb_array_length(export_my_data()->'children'), 2, 'la descarga de datos trae a sus 2 hijos');
select ok(export_my_data()::text !~ 'Iván', 'la descarga de datos no trae alumnos ajenos');
select tests.logout();

select * from finish();
rollback;
