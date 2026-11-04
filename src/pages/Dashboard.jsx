import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Activity, Sparkles, Dumbbell, Plus, Save, CalendarDays, Trash2, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import { groupMealsByDay, sumByDay, startOfDayISO, localDateKey } from '../utils/dates';
import { percentage } from '../utils/nutrition';
import { inputClass } from '../utils/styles';
import { Card, FullScreenLoader, Modal } from '../components/ui';

const WORKOUT_DAYS = 60;

const MACROS = [
  { key: 'protein', targetKey: 'protein_target', label: 'Proteínas', color: 'bg-rose-500', icon: '🍗' },
  { key: 'carbs', targetKey: 'carbs_target', label: 'Carbohidratos', color: 'bg-blue-500', icon: '🍚' },
  { key: 'fat', targetKey: 'fat_target', label: 'Grasas', color: 'bg-amber-500', icon: '🥑' },
];

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
  const [deletingId, setDeletingId] = useState(null);

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
  const selectedDay = dayGroups.find((g) => g.id === selectedDayId) || dayGroups[0];

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

  const handleDeleteMeal = (meal) => {
    toast(`¿Eliminar "${meal.dish}"?`, {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          setDeletingId(meal.id);
          try {
            await apiService.deleteMeal(meal.id);
            setMeals((prev) => prev.filter((m) => m.id !== meal.id));
            toast.success('Plato eliminado');
          } catch (err) {
            toast.error(err.message);
          } finally {
            setDeletingId(null);
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
    });
  };

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

  // Balance neto = consumido − objetivo − ejercicio del MISMO día
  const netBalance = Math.round(totals.calories - targets.calories_target - workoutCalories);
  const isDeficit = netBalance < 0;
  const caloriesPct = percentage(totals.calories, targets.calories_target);
  const remaining = Object.fromEntries(
    MACROS.map((m) => [m.key, Math.max(Math.round(targets[m.targetKey] - totals[m.key]), 0)])
  );
  const dayLabel = selectedDay.isToday ? 'hoy' : `${selectedDay.dayName} ${selectedDay.dayNum}`;

  return (
    <div className="min-h-screen bg-(--bg) text-(--text) px-4 py-6 md:py-12 transition-colors duration-300">
      <div className="max-w-xl mx-auto space-y-6 md:space-y-8">

        {/* TOP BAR */}
        <div className="flex justify-between items-center">
          <div className="space-y-0.5">
            <span className="text-[10px] md:text-xs font-black tracking-widest text-(--accent) uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-(--text-h) tracking-tight">Mi Progreso</h1>
          </div>
          {targets.weight_goal && (
            <div className="inline-flex items-center gap-2 rounded-full border border-(--border) bg-(--card-bg) px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-(--text)">
              <span>Meta</span>
              <span className="text-(--text-h)">{targets.weight_goal} kg</span>
            </div>
          )}
        </div>

        {/* SELECTOR DE DÍA */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black tracking-wider text-(--text) uppercase flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" /> Historial por días
            </h2>
            <button type="button" onClick={() => navigate('/historial')} className="text-[10px] font-bold text-(--accent) hover:underline">
              Ver todo
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x">
            {dayGroups.map((group) => {
              const isSelected = selectedDay.id === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedDayId(group.id)}
                  aria-pressed={isSelected}
                  className={`snap-start shrink-0 w-20 p-3 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? 'bg-(--accent) text-white border-(--accent) shadow-lg'
                      : 'bg-(--card-bg) border-(--border) text-(--text-h) hover:border-(--accent)'
                  }`}
                >
                  <p className="!text-center text-[10px] font-black uppercase tracking-wider opacity-80">{group.isToday ? 'Hoy' : group.dayName}</p>
                  <p className="!text-center text-xl font-black mt-1">{group.dayNum}</p>
                  <p className="!text-center text-[10px] font-semibold mt-1">{group.totalCalories} kcal</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* BALANCE ENERGÉTICO NETO */}
        <div className={`transition-all duration-700 ${animate ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="bg-(--accent-bg) border border-(--accent-border) p-4 md:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-(--accent)">⚖️ Balance energético neto ({dayLabel})</p>
              <p className="text-3xl md:text-4xl font-black text-(--text-h) tracking-tighter">
                {netBalance > 0 ? '+' : ''}{netBalance.toLocaleString('es-ES')}{' '}
                <span className="text-sm md:text-lg font-medium text-(--text) opacity-70">kcal</span>
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider text-center border ${
                isDeficit ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
              }`}>
                {isDeficit ? '🔥 Déficit' : '💪 Superávit'}
              </span>
              <div className="flex gap-3 text-[11px] font-mono pt-1 sm:pt-0" title="Macros restantes">
                <span>🍗 <b className="text-(--text-h)">{remaining.protein}g</b></span>
                <span>🍚 <b className="text-(--text-h)">{remaining.carbs}g</b></span>
                <span>🥑 <b className="text-(--text-h)">{remaining.fat}g</b></span>
              </div>
            </div>
          </div>
        </div>

        {/* ENERGÍA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-5 flex flex-col justify-between gap-3">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-(--text) flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" /> Energía de alimentos
                </p>
                <p className="text-2xl font-black text-(--text-h) tracking-tight">
                  {totals.calories} <span className="text-xs font-medium text-(--text)">/ {targets.calories_target} kcal</span>
                </p>
              </div>
              <div className="bg-(--accent-bg) border border-(--accent-border) text-(--accent) font-black text-[10px] px-2 py-0.5 rounded-xl">
                {caloriesPct}%
              </div>
            </div>
            <ProgressBar pct={caloriesPct} animate={animate} />
          </Card>

          <Card className="p-5 flex flex-col justify-between gap-2">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-(--text) flex items-center gap-1.5">
                  <Dumbbell className="w-4 h-4 text-purple-500" /> Gasto por ejercicio
                </p>
                <p className="text-2xl font-black text-purple-500 tracking-tight">
                  -{workoutCalories} <span className="text-xs font-medium text-(--text)">kcal {dayLabel}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWorkoutModal(true)}
                className="p-1.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 active:scale-95 transition flex items-center gap-1 text-[10px] font-bold shadow-md shadow-purple-900/20"
              >
                <Plus className="w-3.5 h-3.5" /> Registrar
              </button>
            </div>
            <p className="text-[10px] text-(--text) font-medium">Calorías quemadas que se restan de tu balance.</p>
          </Card>
        </div>

        {/* MACROS */}
        <div className="space-y-2.5">
          {MACROS.map((macro) => {
            const current = Math.round(totals[macro.key]);
            const target = targets[macro.targetKey];
            const pct = percentage(current, target);
            return (
              <Card key={macro.key} className="!rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-base select-none" aria-hidden="true">{macro.icon}</span>
                    <span className="text-xs md:text-sm font-black text-(--text-h)">{macro.label}</span>
                    <span className="text-[10px] font-bold text-(--text) bg-(--bg) border border-(--border) px-1.5 py-0.5 rounded-md ml-1">{pct}%</span>
                  </div>
                  <div className="text-right text-xs font-mono text-(--text-h)">
                    <span className="font-black text-sm">{current}g</span>
                    <span className="text-(--text) font-medium"> / {target}g</span>
                  </div>
                </div>
                <ProgressBar pct={pct} color={macro.color} animate={animate} />
              </Card>
            );
          })}
        </div>

        {/* COMIDAS DEL DÍA */}
        <div className="space-y-3">
          <h2 className="text-xs font-black tracking-wider text-(--text) uppercase flex items-center gap-1.5 pl-1">
            <Activity className="w-4 h-4" /> Comidas registradas ({dayLabel})
          </h2>
          <div className="space-y-2">
            {selectedDay.meals.length === 0 ? (
              <button
                type="button"
                onClick={() => navigate('/scanner')}
                className="w-full border-2 border-dashed border-(--border) rounded-2xl p-5 text-xs font-bold text-(--text) hover:border-(--accent) hover:text-(--accent) transition flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" /> Aún no hay comidas este día. Escanea tu primer plato
              </button>
            ) : (
              selectedDay.meals.map((meal) => (
                <Card key={meal.id} className="!rounded-2xl p-3.5 flex justify-between items-center gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-black text-(--text-h) capitalize text-xs md:text-sm truncate">{meal.dish}</p>
                    <p className="text-[10px] md:text-xs text-(--text) font-mono">
                      {new Date(meal.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}P {meal.protein}g · HC {meal.carbs}g · G {meal.fat}g
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-black text-(--text-h) bg-(--bg) border border-(--border) px-2.5 py-1 rounded-xl whitespace-nowrap">
                      +{meal.calories} kcal
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteMeal(meal)}
                      disabled={deletingId === meal.id}
                      aria-label={`Eliminar ${meal.dish}`}
                      className="p-1.5 rounded-lg text-(--text) hover:text-red-500 hover:bg-red-500/10 transition disabled:opacity-50"
                    >
                      {deletingId === meal.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </Card>
              ))
            )}
          </div>
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
            <span className="text-[10px] text-(--text) block">Se restará de tu balance neto de hoy.</span>
          </label>
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
