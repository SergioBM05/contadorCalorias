import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import Scanner from './pages/Scanner';
import Auth from './pages/Auth';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Comprobar la sesión actual nada más cargar la página
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitializing(false);
    });

    // Escuchar si el usuario hace login o logout en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Pantalla de carga limpia mientras Supabase verifica si el usuario tiene una sesión activa
  if (initializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)]">
        <RefreshCw className="w-8 h-8 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta del Escáner Principal (Protegida) */}
        <Route 
          path="/" 
          element={session ? <Scanner session={session} /> : <Navigate to="/auth" replace />} 
        />
        
        {/* Ruta de Autenticación */}
        <Route 
          path="/auth" 
          element={!session ? <Auth /> : <Navigate to="/" replace />} 
        />

        {/* Cualquier otra ruta inventada redirige a la principal */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}