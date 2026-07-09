import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BarChart2, Calendar, User, Plus } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Función para saber si la pestaña está activa y cambiarle el diseño
  const isActive = (path) => location.pathname === path;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto bg-[var(--card-bg)]/80 backdrop-blur-xl border border-[var(--border)] pl-4 pr-2 py-2 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex items-center gap-2 max-w-md w-full justify-between">
        
        {/* Botones principales de navegación */}
        <div className="flex items-center justify-around flex-1">
          
          {/* Dashboard / Home */}
          <button
            onClick={() => navigate('/')}
            className={`flex flex-col items-center justify-center p-2 rounded-full transition-all active:scale-90 ${
              isActive('/') 
                ? 'text-[var(--accent)] font-bold' 
                : 'text-[var(--text)] opacity-60 hover:opacity-100'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Inicio</span>
          </button>

          {/* Historial (El que acabamos de hacer chulo) */}
          <button
            onClick={() => navigate('/historial')}
            className={`flex flex-col items-center justify-center p-2 rounded-full transition-all active:scale-90 ${
              isActive('/historial') 
                ? 'text-[var(--accent)] font-bold' 
                : 'text-[var(--text)] opacity-60 hover:opacity-100'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Historial</span>
          </button>

          {/* Evolución / Gráfica de peso */}
          <button
            onClick={() => navigate('/evolucion')}
            className={`flex flex-col items-center justify-center p-2 rounded-full transition-all active:scale-90 ${
              isActive('/evolucion') 
                ? 'text-[var(--accent)] font-bold' 
                : 'text-[var(--text)] opacity-60 hover:opacity-100'
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Evolución</span>
          </button>

          {/* Perfil / Ajustes */}
          <button
            onClick={() => navigate('/profile')}
            className={`flex flex-col items-center justify-center p-2 rounded-full transition-all active:scale-90 ${
              isActive('/perfil') 
                ? 'text-[var(--accent)] font-bold' 
                : 'text-[var(--text)] opacity-60 hover:opacity-100'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Perfil</span>
          </button>

        </div>

        <button
          onClick={() => {
            navigate('/scanner'); 
          }}
          className="bg-[var(--accent)] hover:opacity-90 text-white p-3 rounded-full shadow-md transition-all active:scale-95 flex items-center justify-center group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
        </button>

      </nav>
    </div>
  );
}