# MealScan AI · Contador de calorías

App web (React + Vite + Tailwind v4) para registrar comidas escaneándolas con IA, controlar macros diarios y seguir la evolución del peso.

## Funcionalidades

- **Registro guiado**: test de 5 pasos (sexo, métricas, actividad, objetivo) que calcula calorías y macros con Mifflin-St Jeor.
- **Añadir comida** (botón +), con tres modos:
  - *Escanear*: foto o imagen → la IA estima calorías y macros, muestra su confianza y nota de ración; puedes elegir ración (×0.5–×2) y corregir valores.
  - *Manual*: nombre y macros a mano (calorías calculadas a partir de los macros si no las pones).
  - *Recientes*: buscador de tus platos anteriores para repetirlos con un toque.
- **Dashboard**: anillo de calorías restantes (el ejercicio amplía el margen), macros, racha de días registrando, comidas agrupadas por franja (desayuno/comida/merienda/cena), editar y borrar platos.
- **Historial**: comidas por día (zona horaria local), buscador de platos y media de los últimos 7 días.
- **Evolución**: gráfica de peso con tendencia y meta, ritmo en kg/semana y estimación de semanas hasta la meta, lista de registros con borrado, y calorías de los últimos 14 días.
- **Planner de dieta**: la IA propone una receta con pesos exactos ajustada a los macros que te quedan; se puede registrar como comida.
- **Tema** claro / oscuro / sistema (en Perfil) y **app instalable** (manifest web).

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
- Editar y borrar requieren políticas RLS de `UPDATE`/`DELETE` para `auth.uid() = user_id` en `meals` y `DELETE` en `weight_logs`. Si faltan, la app muestra un aviso de "sin permisos".
