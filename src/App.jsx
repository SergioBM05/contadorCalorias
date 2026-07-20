import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import Auth from './pages/Auth';
import { RefreshCw } from 'lucide-react';
import Profile from './pages/profile';
import Historial from './pages/Historial';
import Navbar from './pages/Navbar';
import { Toaster } from 'sonner';
import Evolucion from './pages/Evolucion';
import Dieta from './pages/Dieta';

export default function App() {
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [hasProfile, setHasProfile] = useState(false); // 

  const isProfileComplete = (profile) => {
    if (!profile) return false;

    return Boolean(
      profile.gender &&
      profile.age != null &&
      profile.weight_kg != null &&
      profile.height_cm != null &&
      profile.activity_level &&
      profile.fitness_goal &&
      profile.weight_goal != null &&
      profile.weight_goal !== '' &&
      profile.calories_target != null &&
      profile.protein_target != null &&
      profile.carbs_target != null &&
      profile.fat_target != null
    );
  };

  useEffect(() => {
    // Función interna para verificar si el usuario logueado tiene perfil en la DB
    const checkUserProfile = async (currentSession) => {
      if (!currentSession) {
        setHasProfile(false);
        setInitializing(false);
        return;
      }

      try {
        // Buscamos si el usuario ya completó sus datos físicos en user_profiles
        const { data } = await supabase
          .from('user_profiles')
          .select('gender, age, weight_kg, height_cm, activity_level, fitness_goal, weight_goal, calories_target, protein_target, carbs_target, fat_target')
          .eq('user_id', currentSession.user.id)
          .maybeSingle(); // Usa maybeSingle para que no rompa si da vacío

        setHasProfile(isProfileComplete(data));
      } catch (err) {
        console.error("Error verificando perfil:", err);
      } finally {
        setInitializing(false);
      }
    };

    // 1. Comprobación inicial de la sesión
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkUserProfile(session);
    });

    // 2. Escuchar cambios de estado (Login, Logout, Registro)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      checkUserProfile(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (initializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-(--bg)">
        <RefreshCw className="w-8 h-8 text-(--accent) animate-spin" />
      </div>
    );
  }

  // Comprobamos si el usuario cumple los requisitos para ver la barra de navegación
  const showNavbar = Boolean(session && hasProfile);

  return (
    <BrowserRouter>
      <Toaster richColors position="top-center" />
      
      {/* Si el usuario está logueado, añadimos padding inferior para que el contenido no quede oculto bajo el Navbar */}
      <div className={showNavbar ? "pb-24" : ""}>
        <Routes>
          {/* 1. Dashboard: Solo si hay sesión Y tiene perfil completo */}
          <Route
            path="/"
            element={
              session
                ? (hasProfile ? <Dashboard session={session} /> : <Navigate to="/auth" replace />)
                : <Navigate to="/auth" replace />
            }
          />

          {/* 2. Escáner: Protegido igual */}
          <Route
            path="/scanner"
            element={
              session
                ? (hasProfile ? <Scanner session={session} /> : <Navigate to="/auth" replace />)
                : <Navigate to="/auth" replace />
            }
          />

          {/* 3. Auth: Si NO hay sesión va a Auth. Si HAY sesión pero NO perfil, lo DEJAMOS en Auth para que haga el Paso 2 */}
          <Route
            path="/auth"
            element={
              !session
                ? <Auth onProfileCompleted={() => setHasProfile(true)} />
                : (hasProfile ? <Navigate to="/" replace /> : <Auth onProfileCompleted={() => setHasProfile(true)} />)
            }
          />

          <Route
            path='/profile'
            element={session && hasProfile ? <Profile /> : <Navigate to="/auth" replace />}
          />

          <Route
            path='/historial'
            element={session && hasProfile ? <Historial /> : <Navigate to="/auth" replace />}
          />

           <Route
            path='/evolucion'
            element={session && hasProfile ? <Evolucion /> : <Navigate to="/auth" replace />}
          />

          <Route
            path='/dieta'
            element={session && hasProfile ? <Dieta /> : <Navigate to="/auth" replace />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />


        </Routes>
      </div>

      {/* 4. Navbar Flotante: Solo se monta si el usuario está autenticado y con perfil completo */}
      {showNavbar && <Navbar />}
    </BrowserRouter>
  );
}