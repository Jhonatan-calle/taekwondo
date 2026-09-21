-- Seed de Alumnos (Datos de Prueba)
-- Insertamos 8 perfiles de alumnos con distintos grados y características.
-- Al usar gen_random_uuid() en el id, estos perfiles se crean sin estar asociados a un auth.users.

INSERT INTO public.profiles 
(id, nombre_completo, fecha_nacimiento, peso_kg, altura_cm, dni, genero, grado_actual, es_profesor, es_maestro, grados_verificados, maestro_id) 
VALUES
(gen_random_uuid(), 'Juan Perez', '1995-05-15', 75.5, 178, '35123456', 'masculino', 'blanco', false, false, false, '1fa6308b-4ddf-4834-81c4-887564e0e0e1'),
(gen_random_uuid(), 'Maria Gomez', '2001-08-22', 62.0, 165, '41234567', 'femenino', 'amarillo', false, false, false, '1fa6308b-4ddf-4834-81c4-887564e0e0e1'),
(gen_random_uuid(), 'Carlos Lopez', '1998-11-10', 80.0, 182, '38987654', 'masculino', 'verde', false, false, true, '1fa6308b-4ddf-4834-81c4-887564e0e0e1'),
(gen_random_uuid(), 'Ana Martinez', '2005-02-28', 58.5, 160, '45678901', 'femenino', 'azul', false, false, true, '1fa6308b-4ddf-4834-81c4-887564e0e0e1'),
(gen_random_uuid(), 'Pedro Sanchez', '1990-07-07', 85.0, 175, '33456789', 'masculino', 'rojo', false, false, true, '1fa6308b-4ddf-4834-81c4-887564e0e0e1'),
(gen_random_uuid(), 'Laura Torres', '2010-12-12', 45.0, 150, '50123456', 'femenino', 'blanco_punta_amarilla', false, false, false, '1fa6308b-4ddf-4834-81c4-887564e0e0e1'),
(gen_random_uuid(), 'Diego Ruiz', '1985-03-20', 70.0, 170, '31987654', 'masculino', 'dan_1', false, false, true, '1fa6308b-4ddf-4834-81c4-887564e0e0e1'),
(gen_random_uuid(), 'Sofia Herrera', '1999-09-09', 65.0, 168, '40567890', 'femenino', 'amarillo_punta_verde', false, false, false, '1fa6308b-4ddf-4834-81c4-887564e0e0e1');
