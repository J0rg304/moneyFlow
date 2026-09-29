# Activar usuarios y correos de MoneyFlow

El código ya usa tu proyecto `lwrpmaizanhhbbkbneyr`. La clave publishable permite usar Auth y datos bajo RLS; NO permite administrar SMTP, las URLs ni ejecutar SQL. Estos ajustes se completan en el panel de Supabase.

## 1. Base de datos

Si ya ejecutaste `01_schema.sql`, no lo repitas. Ejecuta `03_cloud_functions.sql` en SQL Editor. Añade `export_moneyflow` y `restore_moneyflow` con aislamiento por usuario. Se puede repetir y no borra los datos por sí mismo. Solo una llamada autenticada y confirmada a restaurar sustituye los datos del propietario, en una transacción.

La aplicación puede consultar y modificar las tablas del esquema 01 aunque aún falte el 03. La restauración en la nube sí necesita el 03. Los presupuestos conservan IDs compatibles con las copias locales.

## 2. Registro y sesiones

En Authentication, habilita el proveedor Email y el registro de usuarios. Mantén activada la confirmación de correo y el cambio seguro de correo (confirmación en la dirección antigua y la nueva). Establece una longitud mínima de contraseña de 10 caracteres. No habilites acceso anónimo para sustituir usuarios registrados.

El nombre se guarda en user_metadata; no se utiliza como permiso. Las sesiones se conservan entre recargas y se renuevan mediante Supabase. Cerrar sesión afecta al navegador actual. Las cuentas anteriores de IndexedDB no se migran automáticamente: registra una cuenta real y exporta/importa los datos. Ajustes permite exportar las cuentas locales antiguas tras verificar su contraseña local.

## 3. Direcciones de retorno

El repositorio `https://github.com/J0rg304/moneyFlow.git` NO es una URL de aplicación. Si activas GitHub Pages, la URL prevista es:

```text
https://j0rg304.github.io/moneyFlow/
```

En Authentication > URL Configuration, Site URL:

```text
https://j0rg304.github.io/moneyFlow/
```

Añade estas Redirect URLs exactas:

```text
https://j0rg304.github.io/moneyFlow/
https://j0rg304.github.io/moneyFlow/?auth=recovery
http://127.0.0.1:5173/
http://127.0.0.1:5173/?auth=recovery
http://localhost:5173/
http://localhost:5173/?auth=recovery
```

Mientras no publiques, puedes usar `http://127.0.0.1:5173/` como Site URL. Desde un móvil, localhost apunta al móvil: prueba los correos de localhost en el ordenador que ejecuta MoneyFlow. La aplicación calcula el retorno desde la dirección donde se está utilizando. No hay una ruta `/auth/callback` que requiera reescritura del servidor.

## 4. Envío SMTP

El servicio predeterminado de Supabase solo envía correos a miembros del equipo del proyecto y tiene límites de pruebas. Para personas externas, configura SMTP en Authentication > Email / SMTP Settings con los datos de tu proveedor:

- Sender name: MoneyFlow.
- Sender email: una dirección verificada en ese proveedor.
- Host, port, username y password: los facilitados por el proveedor.

Elige un proveedor con cuota gratuita si quieres mantener el coste cero; verifica sus límites y requisitos de remitente antes de elegirlo. Un repositorio de GitHub no proporciona SMTP ni una dirección de correo verificada. Los límites de Supabase Auth y los del SMTP se aplican por separado. No hay garantía de envío ilimitado gratis.

Introduce la contraseña SMTP directamente en Supabase. Nunca la pongas en `.env` con prefijo VITE, en GitHub ni en el código. La configuración SMTP requiere acceso al panel; no puede realizarse con la clave publishable.

## 5. Plantillas en español

En Email Templates, pega el HTML del archivo correspondiente:

| Tipo | Archivo | Asunto |
|---|---|---|
| Confirm signup | email-templates/confirmation.html | Confirma tu cuenta de MoneyFlow |
| Reset password | email-templates/recovery.html | Recupera el acceso a MoneyFlow |
| Change email address | email-templates/email-change.html | Confirma el cambio de correo de MoneyFlow |

Mantén `{{ .ConfirmationURL }}`: contiene el token y el destino correctos. No lo sustituyas por la URL del repositorio o por un enlace fijo. Los enlaces se procesan mediante Supabase Auth, y la aplicación muestra el formulario de nueva contraseña al recibir PASSWORD_RECOVERY. Puedes activar las notificaciones de seguridad de Supabase para cambios de contraseña/correo con sus plantillas predeterminadas.

## 6. Publicación en GitHub Pages

Está preparado `.github/workflows/pages.yml`. En el repositorio:

1. Settings > Pages > Source: GitHub Actions.
2. Settings > Secrets and variables > Actions > Variables: crea `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con los valores del proyecto. Son variables públicas; no uses service_role.
3. Sube estos cambios a main. El workflow instala, prueba y compila con base `/moneyFlow/`, y publica dist. También se puede lanzar manualmente desde Actions.

El workflow no publica correctamente si faltan estas variables; se detiene con una explicación. Su creación local no activa Pages ni realiza una subida a GitHub automáticamente.

## 7. Comprobación final con correo real

Después de aplicar SQL/configuración y publicar:

1. Registrarse con un correo externo al equipo.
2. Recibir y abrir la confirmación; comprobar acceso y persistencia al recargar.
3. Solicitar recuperación; abrir el enlace, fijar nueva contraseña y volver a entrar.
4. Probar enlace caducado y reenvío.
5. Cambiar correo, confirmar en ambas bandejas y entrar con la nueva dirección.
6. Entrar con dos cuentas y comprobar que no comparten movimientos.

Las pruebas automatizadas de interfaz usan respuestas simuladas para no enviar correos ni crear cuentas reales. Los SQL se prueban en PostgreSQL embebido con roles y RLS. La recepción real de correo requiere esta comprobación después de configurar SMTP.

Fuentes oficiales:
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/redirect-urls
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
