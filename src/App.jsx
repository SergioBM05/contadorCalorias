import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { supabase } from './services/supabaseClient';
import { apiService } from './services/api';
import { isProfileComplete, readPendingProfile, clearPendingProfile } from './utils/nutrition';
import { FullScreenLoader } from './components/ui';
import Navbar from './components/Navbar';
import Auth from './pages/Auth';
import ErrorBoundary from './components/ErrorBoundary';
import { useResolvedTheme, watchSystemTheme } from './utils/theme';

// Code-splitting: cada página se descarga solo cuando se visita (recharts pesa mucho)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Scanner = lazy(() => import('./pages/Scanner'));
const Profile = lazy(() => import('./pages/Profile'));
const Historial = lazy(() => import('./pages/Historial'));
const Evolucion = lazy(() => import('./pages/Evolucion'));
const Dieta = lazy(() => import('./pages/Dieta'));

/**
 * El test de registro guarda el perfil en localStorage antes de crear la cuenta.
 * Aquí se sincroniza en cuanto hay sesión (al instante, o tras confirmar el email).
 */
const syncPendingProfile = async (email) => {
  const pending = readPendingProfile(email);
  if (!pending) return null;
  try {
    const saved = await apiService.saveProfile(pending);
    clearPendingProfile();
    toast.success('¡Perfil configurado! Ya puedes empezar a registrar tus comidas');
    return saved;
  } catch (err) {
    console.error('No se pudo sincronizar el perfil pendiente:', err);
    return null;
  }
};

export default function App() {
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const checkedUserRef = useRef(null);

  const checkUserProfile = useCallback(async (currentSession) => {
    const userId = currentSession?.user?.id ?? null;

    // Evita repetir la consulta en cada refresco de token
    if (userId && checkedUserRef.current === userId) return;
    checkedUserRef.current = userId;

    if (!userId) {
      setHasProfile(false);
      setInitializing(false);
      return;
    }

    try {
      let profile = await apiService.getProfile();
      if (!isProfileComplete(profile)) profile = (await syncPendingProfile(currentSession.user.email)) || profile;
      setHasProfile(isProfileComplete(profile));
    } catch (err) {
      console.error('Error verificando perfil:', err);
      setHasProfile(false);
    } finally {
      setInitializing(false);
    }
  }, []);

  const theme = useResolvedTheme();
  useEffect(() => watchSystemTheme(), []);

  useEffect(() => {
    // onAuthStateChange emite INITIAL_SESSION al suscribirse, no hace falta getSession aparte.
    // Diferimos la consulta para no bloquear el callback de Supabase (recomendación oficial).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setTimeout(() => checkUserProfile(newSession), 0);
    });
    return () => subscription.unsubscribe();
  }, [checkUserProfile]);

  if (initializing) return <FullScreenLoader />;

  const canAccess = Boolean(session && hasProfile);
  const guard = (element) => (canAccess ? element : <Navigate to="/auth" replace />);

  return (
    <BrowserRouter>
      <Toaster richColors position="top-center" closeButton theme={theme} />

      <div className={canAccess ? 'pb-safe' : ''}>
        <ErrorBoundary>
        <Suspense fallback={<FullScreenLoader />}>
          <Routes>
            <Route path="/" element={guard(<Dashboard />)} />
            <Route path="/scanner" element={guard(<Scanner />)} />
            <Route path="/profile" element={guard(<Profile />)} />
            <Route path="/historial" element={guard(<Historial />)} />
            <Route path="/evolucion" element={guard(<Evolucion />)} />
            <Route path="/dieta" element={guard(<Dieta />)} />

            {/* Sin sesión → login/registro. Con sesión pero sin perfil → completar el test. */}
            <Route
              path="/auth"
              element={
                canAccess
                  ? <Navigate to="/" replace />
                  : <Auth session={session} onProfileCompleted={() => setHasProfile(true)} />
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </div>

      {canAccess && <Navbar />}
    </BrowserRouter>
  );
}
