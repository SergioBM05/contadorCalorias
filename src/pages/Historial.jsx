import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { MoveLeft, Calendar, Flame,RefreshCw, Utensils, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Historial() {
  const navigate = useNavigate();
  const [historyGroups, setHistoryGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await apiService.getAllMealsHistory();
        
        // Agrupar comidas por fecha única (Formato estándar para ordenar fácilmente)
        const groups = data.reduce((acc, meal) => {
          const dateObj = new Date(meal.created_at);
          const dateKey = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
          
          if (!acc[dateKey]) {
            // Formatos atractivos para la UI
            const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
            const dayNum = dateObj.toLocaleDateString('es-ES', { day: '2-digit' });
            const fullLabel = dateObj.toLocaleDateString('es-ES', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });

            acc[dateKey] = {
              id: dateKey,
              dayName: dayName.replace('.', ''),
              dayNum: dayNum,
              dateLabel: fullLabel,
              meals: [],
              totalCalories: 0,
              totalProtein: 0,
              totalCarbs: 0,
              totalFat: 0
            };
          }
          
          acc[dateKey].meals.push(meal);
          acc[dateKey].totalCalories += meal.calories || 0;
          acc[dateKey].totalProtein += meal.protein || 0;
          acc[dateKey].totalCarbs += meal.carbs || 0;
          acc[dateKey].totalFat += meal.fat || 0;
          
          return acc;
        }, {});

        const sortedGroups = Object.values(groups).sort((a, b) => b.id.localeCompare(a.id));
        setHistoryGroups(sortedGroups);
        
        // Seleccionar el día más reciente por defecto si existen registros
        if (sortedGroups.length > 0) {
          setSelectedGroup(sortedGroups[0]);
        }
      } catch (err) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="w-full flex-1 flex flex-col px-4 md:px-12 pb-8 text-left font-sans bg-[var(--bg)] min-h-screen">
      
      {/* Header */}
      <header className="py-6 border-b border-[var(--border)] flex items-center gap-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-3 bg-[var(--text-h)] text-[var(--bg)] hover:opacity-90 rounded-full shadow-lg transition-transform active:scale-95 flex items-center justify-center"
        >
          <MoveLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="!my-0 font-black tracking-tight text-2xl sm:text-3xl bg-gradient-to-r from-[var(--text-h)] to-[var(--accent)] bg-clip-text text-transparent">
            HISTORIAL DINÁMICO
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text)] opacity-80">
            Navega por los días en tu calendario fitness para analizar tus macros.
          </p>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 my-6 max-w-4xl w-full mx-auto flex flex-col gap-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text)] flex-1">
            <RefreshCw className="w-10 h-10 text-[var(--accent)] animate-spin mb-4" />
            <p className="font-semibold text-sm">Cargando línea de tiempo...</p>
          </div>
        ) : historyGroups.length === 0 ? (
          <div className="border border-[var(--border)] rounded-3xl p-12 text-center text-[var(--text)] bg-[var(--code-bg)] my-auto">
            <Calendar className="w-12 h-12 mx-auto text-[var(--text)] opacity-40 mb-4" />
            <p className="text-base font-bold text-[var(--text-h)] mb-1">No hay registros guardados</p>
            <p className="text-sm max-w-xs mx-auto">Tus fotos escaneadas generarán un calendario inteligente en este apartado.</p>
          </div>
        ) : (
          <>
            {/* CAROUSEL / CALENDARIO HORIZONTAL */}
            <div className="w-full flex flex-col gap-2">
              <span className="text-xs font-bold text-[var(--text)] uppercase tracking-wider opacity-60 px-1">
                Selecciona un Día
              </span>
              <div className="w-full flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-[var(--border)] snap-x">
                {historyGroups.map((group) => {
                  const isSelected = selectedGroup?.id === group.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group)}
                      className={`snap-center flex-shrink-0 w-20 p-3.5 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 min-h-[96px] ${
                        isSelected
                          ? "bg-[var(--text-h)] border-[var(--text-h)] text-[var(--bg)] shadow-xl scale-105"
                          : "bg-[var(--code-bg)] border-[var(--border)] text-[var(--text-h)] hover:border-[var(--accent)]"
                      }`}
                    >
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? "text-[var(--bg)] opacity-75" : "text-[var(--text)]"}`}>
                        {group.dayName}
                      </span>
                      <span className="text-2xl font-black tracking-tighter">
                        {group.dayNum}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 ${isSelected ? "bg-[var(--bg)]/20 text-[var(--bg)]" : "bg-red-500/10 text-red-500"}`}>
                        {group.totalCalories} kcal
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* VISTA DETALLADA DEL DÍA SELECCIONADO */}
            {selectedGroup && (
              <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                
                {/* Panel resumido de Macros del Día */}
                <div className="bg-[var(--code-bg)] border border-[var(--border)] rounded-3xl p-6 shadow-[var(--shadow)] flex flex-col md:flex-row gap-6 items-center justify-between">
                  <div className="text-center md:text-left">
                    <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider block mb-1">
                      Resumen Diario del
                    </span>
                    <h2 className="!my-0 text-xl font-black text-[var(--text-h)] capitalize tracking-tight">
                      {selectedGroup.dateLabel}
                    </h2>
                  </div>

                  {/* Círculo de calorías y desglose */}
                  <div className="flex flex-wrap items-center justify-center gap-6">
                    <div className="flex items-center gap-3 bg-[var(--bg)] border border-[var(--border)] px-4 py-3 rounded-2xl shadow-inner">
                      <div className="p-2.5 bg-red-500/10 text-red-500 rounded-xl">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[var(--text)] opacity-60 uppercase block">Energía</span>
                        <span className="text-lg font-black text-[var(--text-h)]">{selectedGroup.totalCalories} <span className="text-xs font-normal">Kcal</span></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs font-bold min-w-[240px]">
                      <div className="bg-[var(--bg)] border border-[var(--border)] p-2.5 rounded-xl flex flex-col items-center">
                        <span className="text-orange-400 font-black text-sm">{selectedGroup.totalProtein}g</span>
                        <span className="text-[9px] text-[var(--text)] opacity-60 mt-0.5">Proteína</span>
                      </div>
                      <div className="bg-[var(--bg)] border border-[var(--border)] p-2.5 rounded-xl flex flex-col items-center">
                        <span className="text-blue-400 font-black text-sm">{selectedGroup.totalCarbs}g</span>
                        <span className="text-[9px] text-[var(--text)] opacity-60 mt-0.5">Carbs</span>
                      </div>
                      <div className="bg-[var(--bg)] border border-[var(--border)] p-2.5 rounded-xl flex flex-col items-center">
                        <span className="text-yellow-500 font-black text-sm">{selectedGroup.totalFat}g</span>
                        <span className="text-[9px] text-[var(--text)] opacity-60 mt-0.5">Grasas</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Listado de Comidas del Día Seleccionado */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text)] uppercase tracking-wider px-1">
                    <Utensils className="w-3.5 h-3.5 opacity-60" />
                    Platos Ingeridos ({selectedGroup.meals.length})
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {selectedGroup.meals.map((meal) => (
                      <div 
                        key={meal.id} 
                        className="bg-[var(--code-bg)] border border-[var(--border)] p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm hover:border-[var(--accent)] transition-all duration-200 group"
                      >
                        <div className="space-y-1">
                          <h3 className="!my-0 font-black text-[var(--text-h)] text-lg tracking-tight group-hover:text-[var(--accent)] transition-colors">
                            {meal.dish}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-[var(--text)] opacity-60 font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(meal.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* Macros Individuales */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-bold">
                          <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1">
                            {meal.calories} kcal
                          </span>
                          <span className="bg-[var(--bg)] border border-[var(--border)] text-[var(--text-h)] px-2.5 py-1.5 rounded-xl">
                            <span className="text-orange-400">P:</span> {meal.protein}g
                          </span>
                          <span className="bg-[var(--bg)] border border-[var(--border)] text-[var(--text-h)] px-2.5 py-1.5 rounded-xl">
                            <span className="text-blue-400">C:</span> {meal.carbs}g
                          </span>
                          <span className="bg-[var(--bg)] border border-[var(--border)] text-[var(--text-h)] px-2.5 py-1.5 rounded-xl">
                            <span className="text-yellow-500">G:</span> {meal.fat}g
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}