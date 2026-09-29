# MoneyFlow

Aplicación de finanzas personales con React, TypeScript, Vite y Supabase. Ofrece un espacio local sin cuenta, una demo aislada y cuentas en línea con datos separados mediante RLS.

## Desarrollo

```sh
npm install
npm run dev
```

Copia `.env.example` a `.env.local` y configura la URL y la clave publishable de Supabase. El archivo local está excluido de Git. Nunca incluyas service_role ni contraseñas SMTP en variables VITE.

## Funcionalidades

- Ingresos, gastos, filtros y presupuestos mensuales.
- Historial de seis meses, gráfico por categorías y comparación mensual.
- Temas claro, oscuro y automático.
- Suscripciones mensuales/anuales: creación, edición, pausa y confirmación de pago sin duplicados.
- Exportación CSV/PDF de movimientos filtrados y copias completas JSON.
- Supabase Auth: registro, confirmación, reenvío, inicio/cierre de sesión, recuperación y cambio de contraseña, nombre y correo.
- Sesiones persistentes; datos en la nube consultados al entrar, guardar o volver a la pestaña. No hay edición offline de datos en la nube.
- Demo y espacio sin cuenta en IndexedDB. No se suben automáticamente.
- Exportación de las antiguas cuentas locales desde Ajustes para migrarlas a una cuenta real.

## Configurar Supabase y publicar

Sigue [la guía de usuarios, correos y GitHub Pages](supabase/CONFIGURACION_USUARIOS.md).

En un proyecto nuevo ejecuta `supabase/01_schema.sql`. Si ya está aplicado, no lo repitas. Ejecuta también `supabase/03_cloud_functions.sql` para exportación coherente y restauración atómica. `02_example_data.sql` es opcional y necesita un UUID de usuario de prueba real.

El workflow `.github/workflows/pages.yml` prepara el despliegue en `/moneyFlow/`. Requiere activar Pages con GitHub Actions y configurar las variables públicas del repositorio. Todavía hay que configurar SMTP y URLs de retorno en Supabase; la clave pública no permite hacerlo. El plan Free y cualquier proveedor SMTP gratuito están sujetos a cuotas.

## Pruebas

```sh
npm test
npm run build
npm run test:e2e
```

Vitest comprueba cálculos, copias y SQL en PostgreSQL embebido (PGlite), incluidas políticas entre dos usuarios, anonimato e importaciones fallidas. Playwright usa Edge instalado en Windows y simula Supabase para probar los flujos de Auth sin enviar correos ni crear cuentas reales. Las capturas se guardan en `test-results/`, excluido de Git.

La entrega de correo real se debe comprobar después de configurar SMTP, con una cuenta externa al equipo del proyecto.

## Arquitectura

- `src/AccountRoot.tsx`, `Auth.tsx`, `AccountSettings.tsx`: sesión y formularios de cuenta.
- `src/supabase.ts`: cliente y mensajes de autenticación.
- `src/store.ts`: acceso local/nube, conversiones y actualización de pantallas.
- `src/db.ts`: almacenamiento local y demo; bases anteriores para exportación.
- `src/App.tsx`, `Subscriptions.tsx`, `Insights.tsx`: interfaz.
- `src/domain.ts`, `recurring.ts`: reglas y validación.
- `supabase/`: SQL, plantillas de correo e instrucciones.

Los importes se guardan como céntimos enteros. Las copias contienen finanzas, no credenciales. Cambiar de origen o navegador no traslada datos locales. Utiliza datos ficticios para capturas públicas y no publiques copias personales en GitHub.
