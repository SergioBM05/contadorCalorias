import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { Flame, Activity, Sparkles, Dumbbell, Plus, X, Save } from "lucide-react";
import { toast } from 'sonner';

export default function Dashboard() {
  const [meals, setMeals] = useState([]);
  const [targets, setTargets] = useState(null); 
  const [workoutCalories, setWorkoutCalories] = useState(0); 
  const [loading, setLoading] = useState(true);
  const [animate, setAnimate] = useState(false);

  // ESTADOS PARA EL MODAL DE ENTRENAMIENTO
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [formWorkoutCalories, setFormWorkoutCalories] = useState("");
  const [submittingWorkout, setSubmittingWorkout] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Traer objetivos de usuario
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("calories_target, protein_target, carbs_target, fat_target")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;
      setTargets(profileData);

      // 2. Traer platos de HOY
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: mealsData, error: mealsError } = await supabase
        .from("meals")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", today.toISOString());

      if (mealsError) throw mealsError;
      setMeals(mealsData || []);

      // 3. Traer entrenamientos de HOY
      try {
        const { data: workoutData } = await supabase
          .from("workouts")
          .select("calories_burned")
          .eq("user_id", user.id)
          .gte("created_at", today.toISOString());
        
        const totalBurned = (workoutData || []).reduce((sum, w) => sum + (w.calories_burned || 0), 0);
        setWorkoutCalories(totalBurned);
      } catch (err) {
        console.log("No se pudo leer la tabla de entrenamientos.", err);
      }

    } catch (error) {
      console.error("Error cargando los datos:", error.message);
    } finally {
      setLoading(false);
      setTimeout(() => setAnimate(true), 50);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Función para guardar el entrenamiento en Supabase
  const handleSaveWorkout = async (e) => {
    e.preventDefault();
    if (!formWorkoutCalories || isNaN(formWorkoutCalories)) {
      return toast.error("Introduce una cantidad válida de calorías");
    }

    setSubmittingWorkout(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("workouts").insert([
        {
          user_id: user.id,
          calories_burned: parseInt(formWorkoutCalories),
          created_at: new Date().toISOString()
        }
      ]);

      if (error) throw error;

      toast.success("¡Entrenamiento registrado correctamente!");
      setFormWorkoutCalories("");
      setShowWorkoutModal(false);
      
      // Recargar datos para actualizar la interfaz
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo guardar el entrenamiento");
    } finally {
      setSubmittingWorkout(false);
    }
  };

  if (loading || !targets) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center text-[var(--text-h)] font-medium gap-4">
        <div className="w-12 h-12 border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin"></div>
        <p className="animate-pulse text-gray-400 text-sm">Sincronizando tus macros con la IA...</p>
      </div>
    );
  }

  const totals = meals.reduce((acc, meal) => {
    acc.calories += meal.calories || 0;
    acc.protein += meal.protein || 0;
    acc.carbs += meal.carbs || 0;
    acc.fat += meal.fat || 0;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const getPercentage = (consumed, target) => {
    if (!target) return 0;
    return Math.min((consumed / target) * 100, 100).toFixed(0);
  };

  // CÁLCULO DEL BALANCE NETO REAL (Consumido - Gasto Objetivo Base - Gasto Ejercicio)
  const netBalance = totals.calories - targets.calories_target - workoutCalories;
  const isDeficit = netBalance < 0;

  const remaining = {
    protein: Math.max(targets.protein_target - totals.protein, 0),
    carbs: Math.max(targets.carbs_target - totals.carbs, 0),
    fat: Math.max(targets.fat_target - totals.fat, 0),
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-4 py-6 md:py-12 transition-colors duration-300 relative">
      <div className="max-w-xl mx-auto space-y-6 md:space-y-8">

        {/* TOP BAR */}
        <div className="flex justify-between items-center">
          <div className="space-y-0.5">
            <span className="text-[10px] md:text-xs font-black tracking-widest text-[var(--accent)] uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Datos en tiempo real
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-h)] tracking-tight">Mi Progreso</h1>
          </div>
        </div>

        {/* BALANCE ENERGÉTICO NETO (Sustituye a Combustible Restante) */}
        <div className={`transition-all duration-700 delay-150 transform ${animate ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="bg-[var(--accent-bg)] border border-[var(--accent-border)] p-4 md:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-[var(--accent)] flex items-center gap-1">⚖️ Balance Energético Neto</p>
              <h2 className="text-3xl md:text-4xl font-black text-[var(--text-h)] tracking-tighter">
                {netBalance > 0 ? `+${netBalance.toLocaleString()}` : netBalance.toLocaleString()} <span className="text-sm md:text-lg font-medium text-[var(--text)] opacity-70">kcal totales</span>
              </h2>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider text-center ${
                isDeficit 
                  ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                  : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
              }`}>
                {isDeficit ? "🔥 Deficit Activo" : "💪 Superávit Activo"}
              </span>
              
              {/* Desglose de macros restantes con emojis */}
              <div className="flex gap-3 text-[11px] font-mono opacity-80 pt-1 sm:pt-0">
                <div><span className="select-none">🍗</span> <span className="font-bold text-[var(--text-h)]">{remaining.protein}g</span></div>
                <div><span className="select-none">🍚</span> <span className="font-bold text-[var(--text-h)]">{remaining.carbs}g</span></div>
                <div><span className="select-none">🥑</span> <span className="font-bold text-[var(--text-h)]">{remaining.fat}g</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* ENERGÍA EN DOS BLOQUES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* CONSUMIDAS */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] p-5 rounded-3xl shadow-[var(--shadow)] relative overflow-hidden flex flex-col justify-between gap-3">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" /> Energía de Alimentos
                </p>
                <h2 className="text-2xl font-black text-[var(--text-h)] tracking-tight">
                  {totals.calories} <span className="text-xs font-medium text-gray-400">/ {targets.calories_target} kcal</span>
                </h2>
              </div>
              <div className="bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[var(--accent)] font-black text-[10px] px-2 py-0.5 rounded-xl">
                {getPercentage(totals.calories, targets.calories_target)}%
              </div>
            </div>
            <div className="w-full bg-[var(--bg)] h-2 border border-[var(--border)] rounded-full overflow-hidden">
              <div
                className="bg-[var(--accent)] h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: animate ? `${getPercentage(totals.calories, targets.calories_target)}%` : '0%' }}
              />
            </div>
          </div>

          {/* QUEMADAS CON ACCIÓN EDITAR/AAÑADIR */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] p-5 rounded-3xl shadow-[var(--shadow)] flex flex-col justify-between gap-2">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                  <Dumbbell className="w-4 h-4 text-purple-500" /> Gasto por Ejercicio
                </p>
                <h2 className="text-2xl font-black text-purple-400 tracking-tight">
                  -{workoutCalories} <span className="text-xs font-medium text-gray-400">kcal hoy</span>
                </h2>
              </div>
              <button 
                onClick={() => setShowWorkoutModal(true)} 
                className="p-1.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 active:scale-95 transition flex items-center gap-1 text-[10px] font-bold shadow-md shadow-purple-900/20"
              >
                <Plus className="w-3.5 h-3.5" /> Registrar
              </button>
            </div>
            <p className="text-[10px] text-gray-500 font-medium">Calorías negativas que impulsan tu déficit real diario.</p>
          </div>
        </div>

        {/* SECCIÓN DE MACROS */}
        <div className="space-y-2.5">
          {[
            { label: "Proteínas", current: totals.protein, target: targets.protein_target, color: "bg-rose-500", icon: "🍗" },
            { label: "Carbohidratos", current: totals.carbs, target: targets.carbs_target, color: "bg-blue-500", icon: "🍚" },
            { label: "Grasas", current: totals.fat, target: targets.fat_target, color: "bg-amber-500", icon: "🥑" }
          ].map((macro) => {
            const pct = getPercentage(macro.current, macro.target);
            return (
              <div key={macro.label} className="bg-[var(--card-bg)] border border-[var(--border)] p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-base select-none">{macro.icon}</span>
                    <span className="text-xs md:text-sm font-black text-[var(--text-h)]">{macro.label}</span>
                    <span className="text-[10px] font-bold text-gray-400 bg-[var(--bg)] border border-[var(--border)] px-1.5 py-0.5 rounded-md ml-1">{pct}%</span>
                  </div>
                  <div className="text-right text-xs font-mono text-[var(--text-h)]">
                    <span className="font-black text-sm">{macro.current}g</span>
                    <span className="text-gray-400 font-medium"> / {macro.target}g</span>
                  </div>
                </div>
                <div className="w-full bg-[var(--bg)] h-2 border border-[var(--border)] rounded-full overflow-hidden">
                  <div 
                    className={`${macro.color} h-full rounded-full transition-all duration-1000 ease-out`} 
                    style={{ width: animate ? `${pct}%` : '0%' }} 
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* HISTORIAL COMIDAS */}
        <div className="space-y-3">
          <h3 className="text-xs font-black tracking-wider text-gray-400 uppercase flex items-center gap-1.5 pl-1">
            <Activity className="w-4 h-4" /> Comidas Registradas Hoy
          </h3>
          <div className="space-y-2">
            {meals.length === 0 ? (
              <p className="text-xs text-gray-400 italic pl-1 py-2">Aún no has registrado alimentos hoy.</p>
            ) : (
              meals.map((meal) => (
                <div key={meal.id} className="bg-[var(--card-bg)] border border-[var(--border)] p-3.5 rounded-2xl flex justify-between items-center gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-black text-[var(--text-h)] capitalize text-xs md:text-sm truncate">{meal.dish}</p>
                    <p className="text-[10px] md:text-xs text-gray-400 font-mono flex items-center gap-1.5">
                      <span>🍗 P: {meal.protein}g</span> · <span>🍚 HC: {meal.carbs}g</span> · <span>🥑 G: {meal.fat}g</span>
                    </p>
                  </div>
                  <span className="text-xs font-black text-[var(--text-h)] bg-[var(--border)] px-2.5 py-1 rounded-xl whitespace-nowrap shrink-0">
                    +{meal.calories} kcal
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* MODAL PARA AÑADIR/EDITAR CALORÍAS DE ENTRENAMIENTO */}
      {showWorkoutModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveWorkout} className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-md p-6 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-lg text-[var(--text-h)]">Añadir Calorías Quemadas</h3>
              </div>
              <button type="button" onClick={() => setShowWorkoutModal(false)} className="p-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-full text-[var(--text)] hover:bg-[var(--border)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 block">CALORÍAS QUEMADAS (KCAL) *</label>
              <input 
                type="number" 
                placeholder="Ej: 450" 
                required 
                value={formWorkoutCalories} 
                onChange={(e) => setFormWorkoutCalories(e.target.value)} 
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-base font-bold text-[var(--text-h)] rounded-xl px-3 py-2 outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-gray-500 block">Este valor restará calorías a tu balance neto para cuantificar tu déficit corporal diario.</span>
            </div>

            <button 
              type="submit" 
              disabled={submittingWorkout} 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition"
            >
              <Save className="w-4 h-4" />
              {submittingWorkout ? "Guardando..." : "GUARDAR ENTRENAMIENTO"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}