# MealScan AI · Contador de calorías

App web (React + Vite + Tailwind v4) para registrar comidas escaneándolas con IA, controlar macros diarios y seguir la evolución del peso.

## Funcionalidades

- **Registro guiado**: test de 5 pasos (sexo, métricas, actividad, objetivo) que calcula calorías y macros con Mifflin-St Jeor.
- **Escáner con IA**: haz una foto o sube una imagen; la IA estima calorías y macros y puedes corregirlos antes de guardar (las calorías se reajustan al editar un macro).
- **Dashboard**: balance energético neto por día (consumo − objetivo − ejercicio), progreso de macros, registro de entrenamientos y borrado de platos.
- **Historial**: comidas agrupadas por día (zona horaria local).
- **Evolución**: gráfica de peso con tendencia y meta, y calorías de los últimos 14 días frente a tu objetivo.
- **Planner de dieta**: la IA propone una receta con pesos exactos ajustada a los macros que te quedan.

## Arquitectura

| Capa | Tecnología |
|------|------------|
| Frontend | React 19, React Router 7, Tailwind 4, Recharts, Sonner |
| Auth y BD | Supabase (`user_profiles`, `meals`, `workouts`, `weight_logs`) |
| Backend IA | API Express desplegada en Vercel (`/api/meals/scan`, `/api/meals/plan`, `/api/meals/history`, `/api/meals/today`) |

```
src/
  components/   Navbar y componentes UI compartidos (PageHeader, Card, Modal, loader)
  pages/        Auth, Dashboard, Scanner, Historial, Evolucion, Dieta, Profile
  services/     api.js (backend + Supabase), supabaseClient.js
  utils/        nutrition.js (cálculo de macros, validación), dates.js (agrupación por día local), image.js (compresión)
```

## Puesta en marcha

```bash
npm install
npm run dev
```

Variables de entorno (`.env` / `.env.local`):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
# Opcional: backend local (por defecto se usa el de Vercel)
VITE_API_URL=http://localhost:5000/api
```

Scripts: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`.

## Notas

- Las imágenes se comprimen en el navegador (máx. 1280 px, JPEG) para no superar el límite de payload de Vercel.
- Si Supabase tiene activada la confirmación de email, el perfil calculado en el test se guarda localmente y se sincroniza automáticamente en el primer inicio de sesión.
- Para que el borrado de platos funcione, la tabla `meals` necesita una política RLS de `DELETE` para `auth.uid() = user_id`.
