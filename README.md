# MoneyFlow

Finanzas personales locales, sin suscripciones ni APIs de pago. React + TypeScript + Vite + Dexie (IndexedDB).

## Ejecutar

```sh
npm install
npm run dev
```

Abre la URL que indica Vite. Para comprobar el proyecto:

```sh
npm test
npm run build
```

## Primera versión

- Ingresos y gastos: alta, edición y eliminación.
- Resumen mensual, gráfico de categorías y filtros.
- Presupuestos mensuales por categoría.
- Copias JSON con validación y restauración transaccional.
- Demo independiente, sin mezclar datos personales.
- Diseño adaptable a móvil y escritorio.

Los importes se guardan en céntimos enteros. Los datos permanecen en el navegador y origen utilizados: cambiar de puerto, navegador o dispositivo no transfiere los datos. Exporta una copia desde Ajustes antes de cambiar el entorno. Borrar el almacenamiento del navegador puede borrar tus registros. MoneyFlow no cifra el almacenamiento. No subas copias personales al repositorio.

## Arquitectura

- `src/App.tsx`: pantallas, formularios y consultas reactivas.
- `src/db.ts`: bases personales y demo separadas.
- `src/domain.ts`: tipos, cálculos y validación.
- `src/domain.test.ts`: pruebas de dinero y copias.
- `src/styles.css`: diseño adaptable con recursos locales.

## Siguientes hitos

Categorías personalizadas, evolución de seis meses, instalación PWA y pruebas de navegador. La versión actual necesita servir la aplicación para abrirla: todavía no incluye service worker ni garantiza el arranque sin conexión.

## Documentar el aprendizaje

1. Enseñar el primer registro y explicar componentes y estado.
2. Mostrar la persistencia y explicar IndexedDB.
3. Explicar por qué se almacena el dinero en céntimos.
4. Mostrar presupuestos y una copia de seguridad.

Utiliza exclusivamente la demo para capturas públicas. El gráfico circular utiliza CSS y una lista textual con importes, sin servicios externos.

## Apariencia e historial

El selector de la barra superior y Ajustes permiten elegir Claro, Oscuro o Sistema. La preferencia se guarda en este navegador; Sistema sigue los cambios de apariencia del dispositivo.

El resumen incluye los seis meses anteriores hasta el mes seleccionado, con ingresos, gastos y ahorro en una tabla accesible. Las comparaciones utilizan los totales registrados, no extrapolan ni consideran un mes sin registros como ahorro. Puedes volver al mes actual desde el selector de fechas.

## Pruebas de navegador

`npm run test:e2e` comprueba persistencia del tema, adaptación al sistema, formularios, historial y ausencia de desbordamiento en móvil. Utiliza Microsoft Edge instalado en Windows. Las capturas se generan en `test-results/` (excluido del repositorio).

## Suscripciones y pagos recurrentes

La sección Suscripciones permite crear, editar, pausar, reanudar y eliminar servicios mensuales o anuales. Muestra el coste mensual equivalente. Registrar pago confirma un vencimiento de hoy o anterior, crea el gasto con esa fecha y avanza el vencimiento en una transacción. El identificador de cada cargo impide duplicar la misma ocurrencia. Los meses cortos respetan el día original (31 de enero → 28 de febrero → 31 de marzo). No se realizan cobros ni se ejecutan tareas en segundo plano. Al eliminar un servicio se conservan los gastos anteriores.

Las copias JSON v2 incluyen suscripciones. Se siguen aceptando copias v1; restaurarlas sustituye los datos del espacio actual y deja su lista de suscripciones vacía.

## Cuentas locales

Registro e inicio de sesión gratuitos, sin servidor. Cada cuenta tiene su propia base IndexedDB; el espacio sin cuenta y la demo se conservan separados. La contraseña se verifica con PBKDF2-SHA256, 600.000 iteraciones y sal aleatoria. No se almacena la contraseña en texto plano. Al recargar una pestaña con cuenta se solicita iniciar sesión de nuevo.

Este acceso es local: los datos financieros no están cifrados y alguien con control del navegador puede acceder al almacenamiento. No hay verificación de correo, recuperación por email ni sincronización entre dispositivos. Las copias no incluyen credenciales. Para trasladar datos existentes a una cuenta, exporta JSON desde el espacio sin cuenta e impórtalo en la cuenta.

## Informes CSV y PDF

En Movimientos, Exportar CSV/PDF descarga exactamente el mes y los filtros visibles. El CSV usa UTF-8 con BOM, separador punto y coma y neutraliza fórmulas en campos de texto. El PDF incluye totales, filas y paginación; utiliza una fuente PDF estándar compatible con español, no con todos los alfabetos o emojis. Ambos informes se generan localmente. El JSON sigue siendo el formato para restaurar datos.
