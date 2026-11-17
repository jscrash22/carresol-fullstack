# 🚀 Despliegue de Carresol (guía para principiantes)

Carresol tiene tres piezas. Piénsalas así:

| Pieza | Qué es | Dónde vive |
|---|---|---|
| **GitHub** | El código (y el historial de cambios) | `jscrash22/carresol-fullstack` |
| **Supabase** | La base de datos PostgreSQL | Proyecto `tdapkdknamqvucmoarqc`, región `us-east-1` |
| **Render** | El servidor donde corre la API (Node/Express) | Servicio web `carresol-api`, Virginia, plan gratis |
| **GitHub Pages** | El sitio web estático (HTML/CSS/JS) | `https://jscrash22.github.io/carresol-fullstack/` |

El navegador del usuario carga el sitio de **GitHub Pages**; ese sitio llama por HTTPS a la
**API de Render**, y la API habla con **Supabase**.

---

## 1. Qué necesitas antes de empezar

- Cuenta de GitHub con el repositorio `carresol-fullstack` (público).
- Cuenta en [render.com](https://render.com) (registro con GitHub).
- Proyecto de Supabase con la contraseña de la base de datos a mano.

---

## 2. Variables de entorno (sin valores reales)

Estas son las variables que la API necesita en Render. Los valores reales están en
`server/.env` (local) y en el archivo `render-variables-SECRETO.md` del escritorio
(**bórralo al terminar**). Nunca se suben al repositorio.

| Variable | De dónde sale | Ejemplo de forma |
|---|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → *Transaction pooler* (puerto 6543) | `postgresql://postgres.<ref>:<clave>@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Supabase → *Session pooler* (puerto 5432) | `postgresql://postgres.<ref>:<clave>@aws-1-us-east-1.pooler.supabase.com:5432/postgres` |
| `JWT_SECRET` | Se genera una vez (96 caracteres hex) | cadena larga y aleatoria |
| `CORS_ORIGIN` | El **origen** del frontend, sin ruta ni `/` final | `https://jscrash22.github.io` |
| `NODE_ENV` | Fija | `production` |
| `HTTPS` | Fija (Render termina el TLS) | `false` |
| `JWT_EXPIRES_IN` | Fija | `2h` |
| `BCRYPT_ROUNDS` | Fija | `12` |

> ⚠️ **No definas `PORT` en Render**: la plataforma lo inyecta automáticamente.

---

## 3. Desplegar la API en Render (Blueprint)

1. Entra en [dashboard.render.com](https://dashboard.render.com).
2. **New → Blueprint**.
3. Conecta el repositorio `jscrash22/carresol-fullstack` y elige la rama `main`.
4. Render lee `render.yaml` y muestra el servicio `carresol-api`.
5. Rellena las variables marcadas como secretas (`DATABASE_URL`, `DIRECT_URL`,
   `JWT_SECRET`, `CORS_ORIGIN`). Usa `https://jscrash22.github.io` como `CORS_ORIGIN`
   provisional.
6. **Apply**. El primer build tarda varios minutos: instala dependencias, genera Prisma y
   aplica las migraciones (incluida la de RLS) contra Supabase.
7. Cuando el estado sea **Live**, copia la URL del servicio
   (`https://carresol-api-xxxx.onrender.com`).

### Alternativa manual (sin Blueprint)

**New → Web Service** → repositorio → y configura:

- **Root Directory:** `server`
- **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/health`
- **Plan:** Free · **Region:** Virginia
- Añade las variables de la tabla del punto 2.

---

## 4. Conectar el frontend con la API

1. Edita `frontend/config.js` y pon la URL real (termina en `/api`, sin barra final):

   ```js
   export const API_PROD_URL = 'https://carresol-api-xxxx.onrender.com/api';
   ```

2. Haz commit y push a `main`. La Action de GitHub Pages vuelve a publicar el sitio.
3. En Render → `carresol-api` → **Environment**, actualiza `CORS_ORIGIN` con el origen
   exacto del sitio (`https://jscrash22.github.io`). Guarda: Render redespliega solo.

---

## 5. Publicar el frontend en GitHub Pages

La Action `.github/workflows/pages.yml` ya lo hace en cada push a `main` que toque
`frontend/`. Solo hay que activarla una vez:

1. Repositorio → **Settings → Pages**.
2. En *Build and deployment* → **Source: GitHub Actions**.
3. Espera a que termine el workflow **Desplegar frontend en GitHub Pages** (pestaña
   *Actions*).
4. Abre `https://jscrash22.github.io/carresol-fullstack/`.

---

## 6. Comprobar que todo funciona

| Prueba | Cómo | Resultado esperado |
|---|---|---|
| Salud | Abre `https://carresol-api-xxxx.onrender.com/api/health` | `{"ok":true}` |
| Productos | Abre `.../api/productos` | 25 productos |
| Login | En el sitio, entra con `admin@carresol.com` y la contraseña de `server/.env` | Panel de administración |
| CORS | Desde el sitio en Pages, carga el catálogo | Sin errores de CORS en la consola |

> El plan gratis de Render **duerme la API tras ~15 minutos sin uso**. La primera petición
> puede tardar hasta un minuto: el frontend muestra “El servidor está despertando…” en una
> región `aria-live` y reintenta hasta 3 veces.

---

## 7. Cambiar la URL de la API más adelante

1. Edita `API_PROD_URL` en `frontend/config.js`.
2. Commit y push a `main`.
3. Si cambia el dominio del sitio, actualiza `CORS_ORIGIN` en Render.

---

## 8. Problemas típicos

- **`P1001` / no conecta:** revisa que `DIRECT_URL` use el puerto **5432** y
  `DATABASE_URL` el **6543** con `?pgbouncer=true`.
- **Error de CORS:** `CORS_ORIGIN` debe ser solo el origen (`https://jscrash22.github.io`),
  sin ruta y sin `/` final.
- **El build falla en Prisma:** confirma que `prisma` está en `dependencies` (no en
  `devDependencies`) y que `rootDir` es `server`.
- **404 al recargar el sitio:** Pages sirve archivos estáticos; esta SPA usa rutas por
  hash (`#/catalogo`), así que no debería ocurrir.
