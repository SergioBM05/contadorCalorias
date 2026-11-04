import { NavLink, useNavigate } from 'react-router-dom';
import { Home, BarChart2, User, Plus, ChefHat, CalendarDays } from 'lucide-react';

const LINKS = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/historial', label: 'Historial', icon: CalendarDays },
  { to: '/evolucion', label: 'Evolución', icon: BarChart2 },
  { to: '/dieta', label: 'Dieta', icon: ChefHat },
  { to: '/profile', label: 'Perfil', icon: User },
];

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <div
      className="fixed left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
      style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
    >
      <nav
        aria-label="Navegación principal"
        className="pointer-events-auto bg-(--card-bg)/85 backdrop-blur-xl border border-(--border) pl-2 pr-2 py-2 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.25)] flex items-center gap-1 max-w-md w-full justify-between"
      >
        <div className="flex items-center justify-around flex-1">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center px-1.5 py-1.5 rounded-full transition-all active:scale-90 ${
                  isActive ? 'text-(--accent) font-bold' : 'text-(--text) opacity-70 hover:opacity-100'
                }`
              }
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] mt-0.5">{label}</span>
            </NavLink>
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate('/scanner')}
          aria-label="Escanear un plato"
          className="bg-(--accent) hover:opacity-90 text-white p-3 rounded-full shadow-md transition-all active:scale-95 flex items-center justify-center group shrink-0"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </nav>
    </div>
  );
}
