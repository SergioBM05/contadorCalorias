import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Dumbbell, Plus, Save, CalendarDays, Camera, Loader2, PenLine, History, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import { groupMealsByDay, groupBySlot, calculateStreak, sumByDay, startOfDayISO, localDateKey } from '../utils/dates';
import { percentage } from '../utils/nutrition';
import { inputClass } from '../utils/styles';
import { Card, FullScreenLoader, Modal } from '../components/ui';
import CalorieRing from '../components/CalorieRing';
import MealActions from '../components/MealActions';

const WORKOUT_DAYS = 60;

const MACROS = [
  { key: 'protein', targetKey: 'protein_target', label: 'Proteína', color: 'bg-rose-500', text: 'text-rose-500' },
  { key: 'carbs', targetKey: 'carbs_target', label: 'Carbos', color: 'bg-blue-500', text: 'text-blue-500' },
  { key: 'fat', targetKey: 'fat_target', label: 'Grasas', color: 'bg-amber-500', text: 'text-amber-500' },
];

const greeting = () => {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 21) return 'Buenas tardes';
  return 'Buenas noches';
};

const ProgressBar = ({ pct, color = 'bg-(--accent)', animate }) => (
  <div className="w-full bg-(--bg) h-2 border border-(--border) rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
    <div className={`${color} h-full rounded-full transition-all duration-1000 ease-out`} style={{ width: animate ? `${pct}%` : '0%' }} />
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [targets, setTargets] = useState(null);
  const [meals, setMeals] = useState([]);
  const [workoutsByDay, setWorkoutsByDay] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [animate, setAnimate] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState(localDateKey());

  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [formWorkoutCalories, setFormWorkoutCalories] = useState('');
  const [submittingWorkout, setSubmittingWorkout] = useState(false);

  const loadData = useCallback(async () => {
    const [profileRes, historyRes, workoutsRes] = await Promise.allSettled([
      apiService.getProfile(),
      apiService.getAllMealsHistory(),
      apiService.getWorkoutsSince(startOfDayISO(WORKOUT_DAYS)),
    ]);

    if (profileRes.status === 'fulfilled' && profileRes.value) {
      setTargets(profileRes.value);
      setLoadError(null);
    } else {
      setLoadError('No se pudo cargar tu perfil');
    }

    if (historyRes.status === 'fulfilled') setMeals(historyRes.value);
    else toast.error(historyRes.reason?.message || 'No se pudo cargar el historial');

    if (workoutsRes.status === 'fulfilled') setWorkoutsByDay(sumByDay(workoutsRes.value, 'calories_burned'));
    else console.warn('No se pudo leer la tabla de entrenamientos.', workoutsRes.reason);

    setLoading(false);
    setTimeout(() => setAnimate(true), 50);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Promise.resolve evita llamar a setState de forma síncrona dentro del efecto
    Promise.resolve().then(() => !cancelled && loadData());
    return () => { cancelled = true; };
  }, [loadData]);

  const dayGroups = useMemo(() => groupMealsByDay(meals, { includeToday: true }), [meals]);
  const streak = useMemo(() => calculateStreak(meals), [meals]);
  const selectedDay = dayGroups.find((g) => g.id === selectedDayId) || dayGroups[0];
  const slots = useMemo(() => groupBySlot(selectedDay?.meals), [selectedDay]);

  const handleSaveWorkout = async (e) => {
    e.preventDefault();
    const kcal = parseInt(formWorkoutCalories, 10);
    if (!kcal || kcal <= 0 || kcal > 5000) return toast.error('Introduce una cantidad entre 1 y 5000 kcal');

    setSubmittingWorkout(true);
    try {
      await apiService.addWorkout(kcal);
      toast.success('¡Entrenamiento registrado!');
      setFormWorkoutCalories('');
      setShowWorkoutModal(false);
      setSelectedDayId(localDateKey());
      await loadData();
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el entrenamiento');
    } finally {
      setSubmittingWorkout(false);
    }
  };

  const onMealUpdated = (updated) => setMeals((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  const onMealDeleted = (id) => setMeals((prev) => prev.filter((m) => m.id !== id));

  if (loading) return <FullScreenLoader message="Sincronizando tus macros..." />;

  if (loadError || !targets) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm font-bold text-(--text-h)">{loadError || 'Sin datos de perfil'}</p>
        <button type="button" onClick={() => { setLoading(true); loadData(); }} className="text-xs font-bold text-(--accent) hover:underline">
          Reintentar
        </button>
      </div>
    );
  }

  const totals = {
    calories: selectedDay.totalCalories,
    protein: selectedDay.totalProtein,
    carbs: selectedDay.totalCarbs,
    fat: selectedDay.totalFat,
  };
  const workoutCalories = workoutsByDay[selectedDay.id] || 0;
  // El ejercicio amplía el margen del día: objetivo efectivo = objetivo + quemadas
  const effectiveTarget = targets.calories_target + workoutCalories;
  const netBalance = Math.round(totals.calories - effectiveTarget);
  const isDeficit = netBalance < 0;
  const dayLabel = selectedDay.isToday ? 'hoy' : `${selectedDay.dayName} ${selectedDay.dayNum}`;

  return (
    <div className="min-h-screen bg-(--bg) text-(--text) px-4 py-6 md:py-12 transition-colors duration-300">
      <div className="max-w-xl mx-auto space-y-6">

        {/* TOP BAR */}
        <div className="flex justify-between items-center gap-3">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] md:text-xs font-black tracking-widest text-(--accent) uppercase">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-(--text-h) tracking-tight">{greeting()} 👋</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {streak > 0 && (
              <div
                className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-black text-orange-500"
                title={`${streak} ${streak === 1 ? 'día seguido' : 'días seguidos'} registrando comidas`}
              >
                <Flame className="w-3.5 h-3.5" /> {streak}
              </div>
            )}
            {targets.weight_goal && (
              <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-(--border) bg-(--card-bg) px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-(--text)">
                Meta <span className="text-(--text-h)">{targets.weight_goal} kg</span>
              </div>
            )}
          </div>
        </div>

        {/* SELECTOR DE DÍA */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black tracking-wider text-(--text) uppercase flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" /> Días
            </h2>
            <button type="button" onClick={() => navigate('/historial')} className="text-[10px] font-bold text-(--accent) hover:underline">
              Ver historial
            </button>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x">
            {dayGroups.map((group) => {
              const isSelected = selectedDay.id === group.id;
              const pct = percentage(group.totalCalories, targets.calories_target);
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedDayId(group.id)}
                  aria-pressed={isSelected}
                  className={`snap-start shrink-0 w-[4.5rem] p-2.5 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? 'bg-(--accent) text-white border-(--accent) shadow-lg'
                      : 'bg-(--card-bg) border-(--border) text-(--text-h) hover:border-(--accent)'
                  }`}
                >
                  <p className="!text-center text-[10px] font-black uppercase tracking-wider opacity-80">{group.isToday ? 'Hoy' : group.dayName}</p>
                  <p className="!text-center text-xl font-black">{group.dayNum}</p>
                  <div className={`h-1 rounded-full mt-1 overflow-hidden ${isSelected ? 'bg-white/30' : 'bg-(--border)'}`}>
                    <div className={`h-full rounded-full ${isSelected ? 'bg-white' : 'bg-(--accent)'}`} style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RESUMEN: ANILLO + MACROS */}
        <Card className={`p-5 transition-all duration-700 ${animate ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <CalorieRing consumed={totals.calories} target={effectiveTarget} animate={animate} />

            <div className="flex-1 w-full space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="!text-center text-[10px] font-black uppercase text-(--text)">Objetivo</p>
                  <p className="!text-center text-sm font-black text-(--text-h)">{targets.calories_target}</p>
                </div>
                <div>
                  <p className="!text-center text-[10px] font-black uppercase text-(--text)">Comido</p>
                  <p className="!text-center text-sm font-black text-(--text-h)">{totals.calories}</p>
                </div>
                <div>
                  <p className="!text-center text-[10px] font-black uppercase text-(--text)">Ejercicio</p>
                  <p className="!text-center text-sm font-black text-purple-500">+{workoutCalories}</p>
                </div>
              </div>

              {MACROS.map((macro) => {
                const current = Math.round(totals[macro.key]);
                const target = targets[macro.targetKey];
                return (
                  <div key={macro.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={`font-black ${macro.text}`}>{macro.label}</span>
                      <span className="font-mono text-(--text-h)">
                        <b>{current}</b><span className="text-(--text)"> / {target}g</span>
                      </span>
                    </div>
                    <ProgressBar pct={percentage(current, target)} color={macro.color} animate={animate} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-(--border)">
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
              isDeficit ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
            }`}>
              {isDeficit ? '🔥 Déficit' : '💪 Superávit'} {netBalance > 0 ? '+' : ''}{netBalance.toLocaleString('es-ES')} kcal
            </span>
            <button
              type="button"
              onClick={() => setShowWorkoutModal(true)}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 active:scale-95 transition flex items-center gap-1 text-[11px] font-bold"
            >
              <Dumbbell className="w-3.5 h-3.5" /> Ejercicio
            </button>
          </div>
        </Card>

        {/* ACCESOS RÁPIDOS */}
        {selectedDay.isToday && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Escanear', icon: Camera, to: '/scanner' },
              { label: 'Manual', icon: PenLine, to: '/scanner?tab=manual' },
              { label: 'Repetir', icon: History, to: '/scanner?tab=recent' },
            ].map(({ label, icon: Icon, to }) => (
              <button
                key={label}
                type="button"
                onClick={() => navigate(to)}
                className="bg-(--card-bg) border border-(--border) rounded-2xl py-3 flex flex-col items-center gap-1 text-xs font-bold text-(--text-h) hover:border-(--accent) hover:text-(--accent) transition"
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        )}

        {/* COMIDAS DEL DÍA POR FRANJA */}
        <div className="space-y-3">
          <h2 className="text-xs font-black tracking-wider text-(--text) uppercase flex items-center gap-1.5 pl-1">
            <Activity className="w-4 h-4" /> Comidas ({dayLabel})
          </h2>

          {slots.length === 0 ? (
            <button
              type="button"
              onClick={() => navigate('/scanner')}
              className="w-full border-2 border-dashed border-(--border) rounded-2xl p-6 text-xs font-bold text-(--text) hover:border-(--accent) hover:text-(--accent) transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Aún no hay comidas este día. Añade la primera
            </button>
          ) : (
            slots.map((slot) => (
              <div key={slot.id} className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-black text-(--text-h)">{slot.icon} {slot.label}</span>
                  <span className="text-[10px] font-bold text-(--text)">{slot.calories} kcal</span>
                </div>
                {slot.meals.map((meal) => (
                  <Card key={meal.id} className="!rounded-2xl p-3 flex justify-between items-center gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-black text-(--text-h) first-letter:uppercase text-sm truncate">{meal.dish}</p>
                      <p className="text-[10px] md:text-xs text-(--text) font-mono">
                        {new Date(meal.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}P {meal.protein}g · HC {meal.carbs}g · G {meal.fat}g
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs font-black text-(--text-h) bg-(--bg) border border-(--border) px-2 py-1 rounded-xl whitespace-nowrap">
                        {meal.calories} kcal
                      </span>
                      <MealActions meal={meal} onUpdated={onMealUpdated} onDeleted={onMealDeleted} />
                    </div>
                  </Card>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      <Modal open={showWorkoutModal} onClose={() => setShowWorkoutModal(false)} title="Añadir calorías quemadas" icon={Dumbbell}>
        <form onSubmit={handleSaveWorkout} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-(--text) block">CALORÍAS QUEMADAS HOY (KCAL) *</span>
            <input
              type="number" inputMode="numeric" min={1} max={5000} placeholder="Ej: 450" required autoFocus
              value={formWorkoutCalories} onChange={(e) => setFormWorkoutCalories(e.target.value)}
              className={`${inputClass} text-base`}
            />
            <span className="text-[10px] text-(--text) block">Se suman a tu margen de calorías de hoy.</span>
          </label>
          <div className="flex gap-2">
            {[150, 300, 500].map((v) => (
              <button key={v} type="button" onClick={() => setFormWorkoutCalories(String(v))} className="flex-1 py-1.5 rounded-lg border border-(--border) bg-(--bg) text-xs font-bold text-(--text-h) hover:border-purple-500">
                {v}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={submittingWorkout}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition"
          >
            {submittingWorkout ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {submittingWorkout ? 'Guardando...' : 'GUARDAR ENTRENAMIENTO'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
