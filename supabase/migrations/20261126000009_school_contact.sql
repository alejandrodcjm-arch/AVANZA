-- Datos de la escuela que exige el aviso de privacidad (identidad, domicilio y contacto ARCO).
alter table public.schools
  add column if not exists address text,
  add column if not exists privacy_email text check (privacy_email is null or position('@' in privacy_email) > 1),
  add column if not exists phone text;
