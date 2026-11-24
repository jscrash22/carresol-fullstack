# Bloqueos, problemas y planes B — Reto 2

Registro de lo que no se pudo completar tal como pedía el prompt, con el plan B aplicado y
qué debe hacer el estudiante a mano. Los bloqueos **históricos** se conservan como historial,
pero su estado actual está resuelto y es coherente con `docs/REPORTE_DESPLIEGUE.md`.

---

## B01 — Supabase sin cadena de conexión (HISTÓRICO → RESUELTO)

- **Qué pasó**: en la fase inicial se recibió solo la contraseña de la BD por chat, sin la
  referencia del proyecto, por lo que no se podía construir `DATABASE_URL`.
- **Plan B histórico**: se montó un PostgreSQL portable local para desarrollar mientras se
  obtenía la referencia. Ese plan ya NO está vigente.
- **Estado actual**: **RESUELTO**. Supabase está conectado, las migraciones se aplicaron con
  `prisma migrate deploy` (incluida `20261117000000_rls_public`, que activa RLS en las tablas
  del esquema `public`) y la API está desplegada en Render.
- **Pendiente para el estudiante**: rotar la contraseña de Supabase si viajó por chat y borrar
  los archivos de credenciales que queden en su escritorio. Nunca versionar `.env`.

## B02 — Nombre del zip (RESUELTO)

- El prompt pedía `Reto2_Apellido_Nombre.zip` y no se había recibido el nombre.
- **Decisión confirmada por el usuario**: usar el default **`Reto2_Carresol.zip`**.
  El estudiante puede renombrarlo antes de entregarlo si su docente exige el formato con
  apellido y nombre.

## B03 — Docker no instalado (HISTÓRICO → RESUELTO)

- **Qué pasó**: la máquina de desarrollo no tenía Docker, así que no se pudo usar el
  `docker-compose.yml` original.
- **Estado actual**: **RESUELTO**. La base de datos definitiva es Supabase (administrada) y
  Render ejecuta la API sin Docker. El `docker-compose.yml` del repo se dejó como opción local
  (`postgres:16-alpine` con healthcheck) por si se instala Docker más adelante.

## B04 — npm.ps1 bloqueado por ExecutionPolicy (RESUELTO)

- PowerShell con política `Restricted` impide ejecutar `npm.ps1`.
- **Plan B aplicado**: usar `npm.cmd` (o `cmd /c npm`) en toda la documentación y en los
  scripts. Alternativa del estudiante: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## B05 — dev.db sin migrar (HISTÓRICO)

- El `dev.db` heredado no tenía tablas ni seed. Se migró y sembró en su momento para la línea
  base local. Hoy el entorno de referencia es Supabase; `dev.db` no se usa.

## B06 — Clave de Supabase entre corchetes (HISTÓRICO → RESUELTO)

- Un archivo del escritorio traía las URLs con la contraseña entre `[...]` (formato Markdown),
  lo que producía `P1000`.
- **Plan B aplicado**: se limpiaron los corchetes al importar la cadena. La conexión funcionó
  y las migraciones quedaron aplicadas. Si la contraseña viajó por chat, debe rotarse (ver B01).

## B07 — PostgreSQL portable inestable (HISTÓRICO → YA NO APLICA)

- El PostgreSQL portable local llegó a fallar con `0xC0000142` (interferencia de antivirus /
  sincronización de carpetas en Windows).
- **Estado actual**: **YA NO APLICA**. Ya no se depende de PostgreSQL local: la BD es Supabase
  y la API corre en Render. Las evidencias 81/37/31 de la línea base se conservan en
  `docs/evidencias/` como registro histórico.

## B08 — Poolers de Supabase inalcanzables desde esta máquina (FASE 13, vigente)

- **Qué pasó**: `DATABASE_URL` (6543) y `DIRECT_URL` (5432) dan **timeout TCP** desde el equipo;
  Prisma responde `PrismaClientInitializationError`. En cambio la API en Render responde 200 y
  ve 25 productos, de modo que el proyecto de Supabase **no está pausado**: está bloqueado el
  egress local hacia esos puertos.
- **Restricción adicional**: la BD real contiene 1 usuario que no es del seed y 2 pedidos
  reales, por lo que ejecutar el smoke/E2E completo contra producción crearía/modificaría
  datos ajenos. No se hizo.
- **Plan B aplicado**:
  1. No ejecutar `db:reset`, `db:seed` ni migraciones desde esta máquina.
  2. Línea base tomada de las evidencias archivadas (81/37/31) más comprobaciones de solo
     lectura contra la API pública.
  3. Las pruebas nuevas se ejecutaron con **API simulada** (Playwright + rutas interceptadas)
     y datos `TEST-`, sin escrituras en Supabase; 29 PASS / 0 FAIL / 0 BLOCKED tras el push.
  4. `server/scripts/respaldo-json.js` queda listo para ejecutarse cuando haya red con acceso
     a los poolers: desde `server/`, `node scripts/respaldo-json.js` (nunca versionar
     `server/backups/` ni imprimir su contenido).
- **Pendiente del estudiante**: reintentar el respaldo JSON y, si quiere repetir el smoke
  completo, hacerlo en un entorno con egress permitido y sobre una copia de la BD.

## B09 — `npm audit`: 3 avisos altos de prisma 6 (riesgo aceptado, vigente)

- `prisma@6.19.3` arrastra `@prisma/config → deepmerge-ts` con 3 avisos `high`.
- **Plan B**: no se actualizó a Prisma 7 porque rompe la API de migraciones/seed y el modelo
  actual. Riesgo **aceptado y documentado** en README. El parche, cuando se migre, es
  `npm i -D prisma@latest @prisma/client@latest` + revisar `schema.prisma` y los scripts.

## B10 — Despliegue del código nuevo (RESUELTO)

- Al ejecutar la primera verificación las rutas nuevas aún no estaban en la URL pública; por
  eso 2 comprobaciones aparecieron como PENDIENTES.
- **Plan B aplicado**: `git merge mejoras-finales → main` y `git push origin main` (push normal,
  sin `--force`). Render y GitHub Pages redesplegaron correctamente.
- **Resultado final**: `docs/evidencias/verificacion-final.txt` → **14 PASS / 0 FAIL /
  0 PENDIENTES**, incluidos `/api/config-publica` y el `413` unificado. Una de las primeras
  comprobaciones había usado 40 KB (por debajo del límite de 64 KB); se corrigió a 80 KB.
  No se crearon datos de prueba en producción.

## B11 — Arranque en frío y pausa del plan gratis (riesgo operativo, vigente)

- Render puede tardar ~1 minuto en responder la primera petición tras un periodo inactivo;
  Supabase gratis puede pausar el proyecto.
- **Plan B**: `appController` lanza un ping temprano a `/api/health`, muestra un aviso `aria-live`
  mientras reintenta las GET y pinta esqueletos/caché antes de esperar la red; el workflow
  `.github/workflows/keepalive.yml` hace una petición diaria a `/api/productos`, y el README
  explica cómo reanudar Supabase desde el dashboard.

## B12 — Pedido real de más de 10 unidades contra Supabase (FASE 16, vigente)

- **Qué pasó**: B08 sigue bloqueando los poolers (6543/5432) desde esta máquina, así que no es
  seguro ejecutar un pedido/carrito real con cantidades altas contra la BD desplegada (hay datos
  ajenos y no se pueden limpiar).
- **Plan B aplicado**:
  1. `validar-topes-ux.mjs` comprueba en aislamiento (sin `.env`, sin BD) que 2000/600 unidades
     pasan la validación y que el mensaje de error habla de “unidades” — **6 PASS**.
  2. `pw-ux-despues.mjs` intercepta la API con Playwright y verifica el mensaje
     `Stock insuficiente: solo hay 12 unidades…` en el checkout — **26 PASS** globales.
  3. No se escribió ningún dato `TEST-` en Supabase; por tanto no hay limpieza pendiente en BD.
- **Pendiente para el estudiante**: si quiere la prueba end-to-end real, ejecutarla desde una red
  con egress permitido a Supabase, usar solo usuarios/productos `TEST-` y borrarlos después.

## B13 — Fallo del despliegue de GitHub Pages tras el push (FASE 16, resuelto)

- **Qué pasó**: el push con las correcciones UX disparó el workflow `pages.yml`, pero el paso
  `Publicar` falló con `No artifacts named "github-pages" were found`. El artefacto sí se subía;
  el buscador de artefactos de `deploy-pages@v4` ya no lo encontraba con las acciones antiguas
  reforzadas a Node 24.
- **Plan B aplicado**: se alinearon todas las acciones del workflow a versiones compatibles con
  Node 24 y artefactos v7 (`checkout@v7`, `configure-pages@v6`, `upload-pages-artifact@v5`,
  `deploy-pages@v5`) y se hizo un push normal (sin `--force`).
- **Resultado**: la última ejecución (`45406506616`) terminó en **success** y el HTML/JS/CSS
  públicos ya contienen `modulepreload`, `#aviso-global`, la copia `catalogo_cache` y la barra
  de cierre sticky. La API sigue respondiendo `/api/health` y `/api/productos` (25).

---

## Resumen de estados

| ID | Estado |
|---|---|
| B01 | RESUELTO (histórico conservado) |
| B02 | RESUELTO (`Reto2_Carresol.zip`) |
| B03 | RESUELTO (ya no se usa Docker) |
| B04 | RESUELTO |
| B05 | HISTÓRICO |
| B06 | RESUELTO (rotar contraseña si viajó por chat) |
| B07 | YA NO APLICA (histórico conservado) |
| B08 | VIGENTE — egress local bloqueado; Plan B con API simulada |
| B09 | VIGENTE — riesgo `npm audit` aceptado |
| B10 | RESUELTO — push normal y verificación 14/0/0 |
| B11 | VIGENTE — mitigado con keepalive, health early y esqueletos |
| B12 | VIGENTE — verificación real de stock alto pendiente; Plan B con API simulada |
| B13 | RESUELTO — Pages redesplegado con acciones Node 24 / artefactos v7 |
