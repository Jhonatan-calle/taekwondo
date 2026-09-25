# Plan: Reset total de la BD + seed de demo "Ale Criado"

## Metadatos

| Campo | Valor |
|---|---|
| **Versión** | 1.0 |
| **Estado** | Aprobado (implementado) |
| **Fecha** | 2026-09-24 |
| **Alcance** | **Solo datos** (filas). No toca schema, código ni migraciones. |

## Historial de revisiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-09-24 | Reset total (purga de todas las tablas `public` + `auth.users`) y recreación del árbol de demo de `no-añadir-a-git.txt`, con 3 cuentas de login y 6 alumnos variados. |

## Restricciones y Correcciones Previas (No repetir)

- **Decisión explícita del usuario:** borrar **absolutamente todo**, incluida la cuenta real
  `jhonatancallegaleano@gmail.com` (a diferencia de la purga anterior, que la conservaba).
- **Solo datos:** no se toca el schema ni `supabase_migrations.schema_migrations`.
- **Módulo torneos congelado:** se vacían sus datos, no su código/tablas.
- **Perfiles sin login:** válido desde `alta_alumno` (`profiles.id` ya no referencia `auth.users`).
- **`es_maestro` / `es_profesor` / `maestro_id`:** se siembran por SQL con Service Role (sin JWT, los
  triggers anti-escalada no se disparan).
- **Credenciales:** autorizadas por el usuario; contraseña de test `Seed123456!`; emails en minúscula.

## Árbol final (destino)

```
Nico Saez                 [MAESTRO]  dan_7   (sin login)                 ← raíz
└── Ale criado            [MAESTRO]  dan_5   alecriado@taekwondo.test    ← login
    ├── Lucas Pérez       [alumno]   blanco   (sin login)
    ├── Sofía Gómez       [alumno]   amarillo (sin login)
    ├── Mateo Fernández   [alumno]   verde    (sin login)
    ├── Teresita          [MAESTRO]  dan_5   (sin login)
    └── Andres            [MAESTRO]  dan_4   andres@taekwondo.test       ← login
        ├── Ian           [PROFESOR] dan_2   (sin login)
        ├── mechas        [PROFESOR] dan_2   (sin login)
        ├── Martí         [PROFESOR] dan_1   marti@taekwondo.test        ← login
        ├── Valentina Ruiz[alumno]   azul     (sin login)
        ├── Benjamín Sosa [alumno]   rojo     (sin login)
        └── Camila Díaz   [alumno]   dan_1    (sin login)
```

- **Cuentas con login (3):** `alecriado@`, `andres@`, `marti@` (`@taekwondo.test`) / `Seed123456!`.
- **Alumnos de test:** 3 bajo Ale (blanco/amarillo/verde) y 3 bajo Andrés (azul/rojo/dan_1).

## Ejecución

1. **Purga total** (`supabase/purga-total.sql`): `TRUNCATE` de todas las tablas `public` (CASCADE) +
   `DELETE FROM auth.users`.
2. **Cuentas de login:** por Admin API (`alecriado@`, `andres@`, `marti@`), contraseña `Seed123456!`,
   `email_confirm: true`.
3. **Seed del árbol** (`supabase/seed-demo-ale-criado.sql`): resuelve las cuentas por email, crea los
   perfiles sin login y arma la jerarquía/roles/grados.
4. **Verificación:** árbol recursivo + conteos.

## Notas

- La app conserva sesiones viejas (`LargeSecureStore`): **cerrar sesión / re-loguear** tras el reset.
- El bucket de Storage (`comprobantes`) **no** se toca en este plan (fuera de alcance); si hubiera
  archivos huérfanos, se limpian aparte.

---

🐧
