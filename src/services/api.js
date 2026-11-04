import { supabase } from './supabaseClient';

// Configurable por entorno: en local define VITE_API_URL=http://localhost:5000/api en .env.local
const API_URL = (import.meta.env.VITE_API_URL || 'https://back-contador-calorias.vercel.app/api').replace(/\/$/, '');

const REQUEST_TIMEOUT_MS = 60_000; // La IA puede tardar, pero no dejamos la petición colgada para siempre

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session && { Authorization: `Bearer ${session.access_token}` }),
  };
};

const request = async (path, { method = 'GET', body, fallbackError }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: await getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 413) throw new Error('La imagen es demasiado grande');
      if (response.status === 401) throw new Error('Tu sesión ha caducado, vuelve a iniciar sesión');
      throw new Error(data?.error || data?.message || fallbackError);
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('El servidor tardó demasiado en responder. Inténtalo de nuevo.', { cause: err });
    if (err instanceof TypeError) throw new Error('No se pudo conectar con el servidor. Revisa tu conexión.', { cause: err });
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

const getUserId = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('No hay una sesión activa');
  return session.user.id;
};

export const apiService = {
  // ---- Backend (Express + IA) ----

  /** Analiza una imagen (data URL base64) y devuelve { dish, calories, protein, carbs, fat } */
  scanMeal: (imageBase64, contextNote = '') =>
    request('/meals/scan', {
      method: 'POST',
      body: { imageBase64, contextNote },
      fallbackError: 'Error al escanear el plato',
    }),

  /** Genera una receta ajustada a los macros restantes */
  generateDietPlan: ({ prompt, mealType, remaining }) =>
    request('/meals/plan', {
      method: 'POST',
      body: { prompt, mealType, remaining },
      fallbackError: 'Error al generar la receta',
    }),

  getTodayMeals: () => request('/meals/today', { fallbackError: 'Error al obtener las comidas' }),

  getAllMealsHistory: async () => {
    const data = await request('/meals/history', { fallbackError: 'Error al obtener el historial completo' });
    return Array.isArray(data) ? data : [];
  },

  // ---- Supabase directo ----

  getProfile: async () => {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  saveProfile: async (profileData) => {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, ...profileData }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw new Error(error.message || 'Error al guardar el perfil');
    return data;
  },

  /** Actualización parcial (no usar upsert: validaría NOT NULL de columnas no enviadas) */
  updateProfile: async (fields) => {
    const userId = await getUserId();
    const { error } = await supabase.from('user_profiles').update(fields).eq('user_id', userId);
    if (error) throw new Error(error.message || 'Error al actualizar el perfil');
  },

  addMeal: async ({ dish, calories, protein, carbs, fat }) => {
    const userId = await getUserId();
    const { error } = await supabase.from('meals').insert([
      { user_id: userId, dish: dish.trim(), calories, protein, carbs, fat },
    ]);
    if (error) throw new Error(error.message || 'Error al registrar el plato');
  },

  deleteMeal: async (mealId) => {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('meals')
      .delete()
      .eq('id', mealId)
      .eq('user_id', userId)
      .select('id');
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error('No se pudo eliminar el plato (sin permisos)');
  },

  getWorkoutsSince: async (sinceISO) => {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('workouts')
      .select('calories_burned, created_at')
      .eq('user_id', userId)
      .gte('created_at', sinceISO);
    if (error) throw new Error(error.message);
    return data || [];
  },

  addWorkout: async (caloriesBurned) => {
    const userId = await getUserId();
    const { error } = await supabase
      .from('workouts')
      .insert([{ user_id: userId, calories_burned: caloriesBurned, created_at: new Date().toISOString() }]);
    if (error) throw new Error(error.message || 'No se pudo guardar el entrenamiento');
  },
};
