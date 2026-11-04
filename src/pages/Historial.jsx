import { useEffect, useMemo, useState } from 'react';
import { Calendar, Flame, RefreshCw, Utensils, Clock, CalendarDays, Search } from 'lucide-react';
import { apiService } from '../services/api';
import { groupMealsByDay, lastNDays } from '../utils/dates';
import { PageHeader, Card } from '../components/ui';
import MealActions from '../components/MealActions';
import { inputClass } from '../utils/styles';

export default function Historial() {
  const [meals, setMeals] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiService
      .getAllMealsHistory()
      .then((data) => { if (!cancelled) { setMeals(data); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  // Búsqueda por nombre de plato: solo quedan los días con coincidencias
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groupMealsByDay(q ? meals.filter((m) => m.dish?.toLowerCase().includes(q)) : meals);
  }, [meals, query]);
  const weekAvg = useMemo(() => {
    const week = new Set(lastNDays(7));
    const last7 = groupMealsByDay(meals).filter((g) => week.has(g.id));
    return last7.length ? Math.round(last7.reduce((s, g) => s + g.totalCalories, 0) / last7.length) : 0;
  }, [meals]);
  const selected = groups.find((g) => g.id === selectedId) || groups[0];

  const onMealUpdated = (updated) => setMeals((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  const onMealDeleted = (id) => setMeals((prev) => prev.filter((m) => m.id !== id));

  return (
    <div className="w-full min-h-screen bg-(--bg) px-4 py-6 md:py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <PageHeader
          title="Historial"
          icon={CalendarDays}
          right={!loading && groups.length > 0 && (
            <span className="text-[10px] font-black uppercase text-(--text) px-2">{groups.length} días</span>
          )}
        />

        {!loading && !error && meals.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-(--text)" />
              <input type="search" placeholder="Buscar un plato..." value={query} onChange={(e) => { setQuery(e.target.value); setSelectedId(null); }} className={`${inputClass} pl-10`} />
            </div>
            {weekAvg > 0 && (
              <div className="bg-(--card-bg) border border-(--border) rounded-xl px-4 py-2 flex items-center justify-between sm:justify-start gap-3">
                <span className="text-[10px] font-black uppercase text-(--text)">Media últimos 7 días</span>
                <span className="text-sm font-black text-(--text-h)">{weekAvg.toLocaleString('es-ES')} kcal</span>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-(--text)">
            <RefreshCw className="w-10 h-10 text-(--accent) animate-spin mb-4" />
            <p className="font-semibold text-sm">Cargando línea de tiempo...</p>
          </div>
        ) : error ? (
          <Card className="p-10 text-center">
            <p className="!text-center text-sm font-bold text-(--text-h) mb-2">{error}</p>
            <button type="button" onClick={() => { setLoading(true); setReloadKey((k) => k + 1); }} className="text-xs font-bold text-(--accent) hover:underline">
              Reintentar
            </button>
          </Card>
        ) : groups.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-(--text) opacity-40 mb-4" />
            <p className="!text-center text-base font-bold text-(--text-h) mb-1">{query ? 'Ningún plato coincide con la búsqueda' : 'No hay registros guardados'}</p>
            <p className="!text-center text-sm max-w-xs mx-auto text-(--text)">{query ? 'Prueba con otro nombre.' : 'Tus platos aparecerán aquí organizados por día.'}</p>
          </Card>
        ) : (
          <>
            {/* SELECTOR DE DÍA */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-(--text) uppercase tracking-wider opacity-60 px-1">Selecciona un día</span>
              <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x">
                {groups.map((group) => {
                  const isSelected = selected?.id === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedId(group.id)}
                      className={`snap-start shrink-0 w-20 p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 min-h-24 ${
                        isSelected
                          ? 'bg-(--text-h) border-(--text-h) text-(--bg) shadow-xl'
                          : 'bg-(--card-bg) border-(--border) text-(--text-h) hover:border-(--accent)'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-75">{group.isToday ? 'Hoy' : group.dayName}</span>
                      <span className="text-2xl font-black tracking-tighter">{group.dayNum}</span>
                      <span className="text-[9px] font-bold uppercase opacity-60">{group.monthName}</span>
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded-md whitespace-nowrap ${isSelected ? 'bg-(--bg)/20' : 'bg-red-500/10 text-red-500'}`}>
                        {group.totalCalories} kcal
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selected && (
              <div key={selected.id} className="space-y-6 animate-fade-up">
                {/* RESUMEN */}
                <Card className="p-5 flex flex-col md:flex-row gap-5 items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-(--accent) uppercase tracking-wider block mb-1">Resumen del día</span>
                    <h2 className="text-xl font-black text-(--text-h) first-letter:uppercase tracking-tight">{selected.dateLabel}</h2>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <div className="flex items-center gap-3 bg-(--bg) border border-(--border) px-4 py-3 rounded-2xl">
                      <div className="p-2.5 bg-red-500/10 text-red-500 rounded-xl"><Flame className="w-5 h-5" /></div>
                      <div>
                        <span className="text-[10px] font-bold text-(--text) opacity-60 uppercase block">Energía</span>
                        <span className="text-lg font-black text-(--text-h)">{selected.totalCalories} <span className="text-xs font-normal">kcal</span></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs font-bold min-w-60">
                      {[
                        ['Proteína', selected.totalProtein, 'text-rose-500'],
                        ['Carbs', selected.totalCarbs, 'text-blue-500'],
                        ['Grasas', selected.totalFat, 'text-amber-500'],
                      ].map(([label, value, color]) => (
                        <div key={label} className="bg-(--bg) border border-(--border) p-2.5 rounded-xl flex flex-col items-center">
                          <span className={`${color} font-black text-sm`}>{Math.round(value)}g</span>
                          <span className="text-[9px] text-(--text) opacity-60 mt-0.5">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* PLATOS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-(--text) uppercase tracking-wider px-1">
                    <Utensils className="w-3.5 h-3.5 opacity-60" /> Platos ingeridos ({selected.meals.length})
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {selected.meals.map((meal) => (
                      <Card key={meal.id} className="!rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-(--accent) transition">
                        <div className="flex items-start justify-between gap-3 min-w-0">
                          <div className="space-y-1 min-w-0">
                            <h3 className="font-black text-(--text-h) text-base tracking-tight first-letter:uppercase truncate">{meal.dish}</h3>
                            <div className="flex items-center gap-1.5 text-xs text-(--text) opacity-70 font-semibold">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(meal.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className="sm:hidden">
                            <MealActions meal={meal} onUpdated={onMealUpdated} onDeleted={onMealDeleted} />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                          <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-xl">{meal.calories} kcal</span>
                          <span className="bg-(--bg) border border-(--border) text-(--text-h) px-2.5 py-1.5 rounded-xl"><span className="text-rose-500">P:</span> {meal.protein}g</span>
                          <span className="bg-(--bg) border border-(--border) text-(--text-h) px-2.5 py-1.5 rounded-xl"><span className="text-blue-500">C:</span> {meal.carbs}g</span>
                          <span className="bg-(--bg) border border-(--border) text-(--text-h) px-2.5 py-1.5 rounded-xl"><span className="text-amber-500">G:</span> {meal.fat}g</span>
                          <div className="hidden sm:block">
                            <MealActions meal={meal} onUpdated={onMealUpdated} onDeleted={onMealDeleted} />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
