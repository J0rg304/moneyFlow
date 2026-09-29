# Supabase para MoneyFlow

Estos archivos preparan una base multiusuario. La aplicación todavía usa IndexedDB y cuentas locales: ejecutar SQL NO conecta el frontend ni publica la web.

## Instalación

1. Crea un proyecto Supabase en una organización Free.
2. Abre SQL Editor > New query, pega `01_schema.sql` y ejecuta Run una sola vez en un proyecto nuevo. Si hay tablas con esos nombres, el script falla y revierte la transacción; no borra tablas.
3. Crea una cuenta de pruebas desde Authentication > Users. Las cuentas se gestionan con Supabase Auth, nunca insertando contraseñas en tablas públicas.
4. Opcional: copia su UUID en `02_example_data.sql` y ejecútalo. Son datos ficticios de esa cuenta. Los importes están en céntimos: 3000 = 30 EUR.
5. Las tablas movements, budgets y recurring aparecerán con RLS activado. Cada sesión autenticada solo puede leer o modificar sus propias filas. El SQL Editor es administrador: ver todas las filas ahí NO prueba las políticas.

## Cambios pendientes en la aplicación

- Instalar @supabase/supabase-js y crear un cliente con la URL del proyecto y una publishable key (o anon legacy). Nunca incluir secret/service_role ni contraseña de base de datos en Vite o el navegador.
- Sustituir el registro local por auth.signUp y el inicio de sesión por auth.signInWithPassword; manejar confirmación de correo, sesión y cierre.
- Sustituir consultas/escrituras Dexie por Supabase. Vaciar cachés/datos de pantalla al cambiar de usuario. Mantener la demo exclusivamente local.
- Mapear amountCents → amount_cents, limitCents → limit_cents, nextDate → next_date, anchorDay → anchor_day. id, type, date, category, note, name, month, interval y active conservan su nombre. El nombre del usuario puede vivir en user_metadata de Auth; no se usa como autorización.
- Usar claves compuestas: upsert de movimientos/suscripciones con onConflict: 'user_id,id'; presupuestos con onConflict: 'user_id,month,category'. Los ID son TEXT para conservar IDs locales, incluidos los pagos recurrentes. El usuario propietario se obtiene de la sesión, no del archivo importado.
- La tabla budgets admite cualquier ID textual; al exportar al formato JSON existente, reconstruir el ID como `${month}:${category}` para cumplir su validador.
- Para registrar un pago, llamar a rpc('record_recurring_payment', { p_id: id, p_expected_date: nextDate }). No crear el gasto y avanzar la fecha con dos peticiones separadas. Un resultado null indica una fecha ya avanzada: refrescar datos. La función usa el calendario Europe/Madrid para decidir si ha vencido.
- Los CSV/PDF pueden seguir generándose en el navegador con los datos de Supabase.
- Para restaurar una copia completa de forma atómica habrá que añadir una RPC de importación validada. No borrar primero los datos mediante varias peticiones independientes.

Configuración prevista (estos nombres todavía no los consume la aplicación):

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## Migración de datos

Exporta JSON desde el espacio local correspondiente y crea una cuenta nueva en Supabase. El hash de las contraseñas locales no se importa a Auth: los usuarios deben registrarse de nuevo. El siguiente desarrollo debe importar movimientos, presupuestos y recurrentes al usuario conectado, conservando los IDs. No mezclar datos de la demo ni distintas cuentas locales. No publicar copias JSON en el repositorio.

## Validación antes de publicar

Crear dos usuarios de pruebas A/B. Con sus sesiones reales y la clave pública, comprobar que A no puede leer, actualizar, borrar ni insertar datos propiedad de B en ninguna de las tres tablas. Sin sesión, las consultas deben rechazarse. Confirmar un pago dos veces con la misma fecha debe crear un único movimiento y avanzar una sola vez. Comprobar pausa, pagos futuros y transición 31 enero → 28 febrero → 31 marzo. Este SQL no se ha ejecutado contra tu proyecto; requiere validación allí antes de publicar.

## Coste y registro público

Supabase tiene plan Free con cuotas; no es capacidad ilimitada ni una promesa de alojamiento gratuito para cualquier volumen. Su documentación indica 500 MB de base por proyecto y posibles pausas tras periodos de poca actividad de 7 días.

El SMTP predeterminado solo envía a miembros del equipo del proyecto. Para confirmaciones y recuperación de contraseñas de usuarios externos se necesita SMTP propio; no basta con crear tablas. Alternativamente se puede configurar un proveedor OAuth, con sus ajustes y políticas. No desactivar la confirmación de correo como atajo para publicar cuentas que deban verificar identidad. Configurar Site URL y Redirect URLs para el dominio publicado.

Fuentes oficiales consultadas:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/platform/free-project-pausing
