# Supabase para MoneyFlow

La aplicación ya está conectada mediante Supabase Auth y el cliente JavaScript. El espacio sin cuenta y la demo siguen siendo locales.

Lee [CONFIGURACION_USUARIOS.md](CONFIGURACION_USUARIOS.md) para activar correos, URLs de retorno y publicación.

## Archivos SQL

1. `01_schema.sql`: esquema inicial de movimientos, presupuestos y suscripciones; RLS por usuario; confirmación de pagos atómica. Solo ejecutar una vez en un proyecto nuevo.
2. `02_example_data.sql`: datos ficticios opcionales. Sustituir target_user por un usuario de pruebas real de Authentication > Users.
3. `03_cloud_functions.sql`: exportación e importación JSON transaccionales. Ejecutar después del 01; se puede repetir. No elimina datos al instalarlo.

La restauración toma el propietario de auth.uid(), valida la copia y sustituye solo sus datos. Los constraints y RLS se aplican a todas las escrituras. El SQL Editor utiliza permisos de administrador: sus resultados no representan los permisos de un usuario conectado desde la aplicación.

## Nombres de campos

El adaptador `src/store.ts` convierte amountCents/limitCents/nextDate/anchorDay a amount_cents/limit_cents/next_date/anchor_day. Los presupuestos exportados reconstruyen su ID como mes:categoría. Los identificadores de movimientos y suscripciones se conservan al importar.

## Comprobaciones

`npm test` ejecuta los archivos SQL en PostgreSQL embebido y prueba aislamiento de dos usuarios, acceso anónimo, duplicados de pagos y rollback de importaciones inválidas. Esto no aplica las migraciones a tu proyecto remoto. El código puede consultar el esquema inicial con paginación si falta el 03; la restauración en la nube requiere instalarlo.
