import { supabase } from './supabaseClient';

// 1. Limpiamos la URL base añadiendo el /api que definiste en Express

//Ruta para vercel
const API_URL = 'https://back-contador-calorias.vercel.app/api'; 

//Ruta para pruebas en local
//const API_URL = 'http://localhost:5000/api';

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': session ? `Bearer ${session.access_token}` : '',
  };
};

export const apiService = {
  // Enviar imagen en Base64 para analizar
  scanMeal: async (imageBase64) => {
    const headers = await getAuthHeaders();
    // Queda como: /api/meals/scan 🚀
    const response = await fetch(`${API_URL}/meals/scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ imageBase64 }),
    });
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Error al escanear el plato');
    }
    return response.json();
  },

  // Traer el historial de comidas de hoy
  getTodayMeals: async () => {
    const headers = await getAuthHeaders();
    // Queda como: /api/meals/today 🚀
    const response = await fetch(`${API_URL}/meals/today`, { 
      method: 'GET',
      headers
    });
    if (!response.ok) throw new Error('Error al obtener las comidas');
    return response.json();
  },

  //Traer el historial de todas las comidas 
  getAllMealsHistory: async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/meals/history`, { 
    method: 'GET',
    headers
  });
  if (!response.ok) throw new Error('Error al obtener el historial completo');
  return response.json();
},

  saveProfile: async (profileData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No hay una sesión activa');

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(
        { user_id: user.id, ...profileData },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throw new Error(error.message || 'Error al guardar el perfil');
    return data;
  },
};