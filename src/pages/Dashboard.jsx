import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { Plus, Flame, Activity, Sparkles, User } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [meals, setMeals] = useState([]);
  const [targets, setTargets] = useState(null); // Estado para los objetivos de la DB
  const [loading, setLoading] = useState(true);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Obtener el usuario autenticado actual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 2. Traer los objetivos personalizados desde user_profiles
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("calories_target, protein_target, carbs_target, fat_target")
          .eq("user_id", user.id)
          .single();

        if (profileError) throw profileError;
        setTargets(profileData);

        // 3. Traer los platos que el usuario ha escaneado HOY
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Inicio del día de hoy

        const { data: mealsData, error: mealsError } = await supabase
          .from("meals")
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", today.toISOString()); // Solo los de hoy en adelante

        if (mealsError) throw mealsError;
        setMeals(mealsData || []);

      } catch (error) {
        console.error("Error cargando los datos del Dashboard:", error.message);
      } finally {
        setLoading(false);
        setTimeout(() => setAnimate(true), 50);
      }
    };

    fetchDashboardData();
  }, []);

  // Si está cargando o no se han encontrado objetivos todavía, mostramos la pantalla de carga
  if (loading || !targets) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center text-[var(--text-h)] font-medium gap-4">
        <div className="w-12 h-12 border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin"></div>
        <p className="animate-pulse text-gray-400">Sincronizando tus macros con la IA...</p>
      </div>
    );
  }

  // Calcular los totales reales consumidos hoy sumando los platos cargados
  const totals = meals.reduce((acc, meal) => {
    acc.calories += meal.calories || 0;
    acc.protein += meal.protein || 0;
    acc.carbs += meal.carbs || 0;
    acc.fat += meal.fat || 0;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Función para calcular el porcentaje dinámico comparando contra la DB
  const getPercentage = (consumed, target) => {
    if (!target) return 0;
    return Math.min((consumed / target) * 100, 100).toFixed(0);
  };

  const remaining = {
    calories: Math.max(targets.calories_target - totals.calories, 0),
    protein: Math.max(targets.protein_target - totals.protein, 0),
    carbs: Math.max(targets.carbs_target - totals.carbs, 0),
    fat: Math.max(targets.fat_target - totals.fat, 0),
  };


  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-4 py-8 md:py-12 transition-colors duration-300">
      <div className="max-w-xl mx-auto space-y-8">

        {/* TOP BAR / HEADER ASIMÉTRICO */}
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-xs font-bold tracking-widest text-[var(--accent)] uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Datos en tiempo real
            </span>
            <h1 className="text-3xl font-black text-[var(--text-h)] tracking-tight">Mi Progreso</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/profile")}
              className="p-3 border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-h)] hover:bg-[var(--border)] rounded-full transition-transform active:scale-95 flex items-center justify-center"
            >
              <User className="w-5 h-5" />
            </button>

            <button
              onClick={() => navigate("/scanner")}
              className="p-3 bg-[var(--text-h)] text-[var(--bg)] hover:opacity-90 rounded-full shadow-lg transition-transform active:scale-95 flex items-center justify-center"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className={`transition-all duration-700 delay-150 transform ${animate ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="bg-[var(--accent-bg)] border border-[var(--accent-border)] p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--accent)]">🔋 Combustible restante</p>
              <h2 className="text-4xl font-black text-[var(--text-h)] tracking-tighter">
                {remaining.calories.toLocaleString()} <span className="text-lg font-medium text-[var(--text)] opacity-70">kcal por comer</span>
              </h2>
            </div>

            {/* Pequeño desglose minimalista de macros restantes */}
            <div className="flex gap-3 text-sm border-l border-[var(--accent-border)] pl-4 sm:border-none sm:pl-0">
              <span className="font-mono text-[var(--text-h)]">P: <span className="font-bold">{remaining.protein}g</span></span>
              <span className="font-mono text-[var(--text-h)]">HC: <span className="font-bold">{remaining.carbs}g</span></span>
              <span className="font-mono text-[var(--text-h)]">G: <span className="font-bold">{remaining.fat}g</span></span>
            </div>
          </div>
        </div>

        {/* TARJETA DE CALORÍAS DINÁMICA */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-3xl shadow-[var(--shadow)] relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500" /> Energía Total
              </p>
              <h2 className="text-4xl font-black text-[var(--text-h)] tracking-tight">
                {totals.calories} <span className="text-lg font-medium text-gray-400">/ {targets.calories_target} kcal</span>
              </h2>
            </div>
            <div className="bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[var(--accent)] font-bold text-xs px-2.5 py-1 rounded-xl">
              {getPercentage(totals.calories, targets.calories_target)}%
            </div>
          </div>

          <div className="w-full bg-[var(--border)] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[var(--accent)] h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: animate ? `${getPercentage(totals.calories, targets.calories_target)}%` : '0%' }}
            />
          </div>
        </div>

        {/* CONTENEDOR DE MACROS DINÁMICOS DESDE LA DB */}
        <div className="space-y-3">
          {[
            { label: "Proteínas", current: totals.protein, target: targets.protein_target, color: "bg-rose-500", icon: "🍗" },
            { label: "Carbohidratos", current: totals.carbs, target: targets.carbs_target, color: "bg-blue-500", icon: "🍚" },
            { label: "Grasas", current: totals.fat, target: targets.fat_target, color: "bg-amber-500", icon: "🥑" }
          ].map((macro) => (
            <div key={macro.label} className="bg-[var(--card-bg)] border border-[var(--border)] p-4 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-[120px]">
                <span className="text-lg">{macro.icon}</span>
                <span className="text-sm font-bold text-[var(--text-h)]">{macro.label}</span>
              </div>

              <div className="flex-1 bg-[var(--border)] h-1.5 rounded-full overflow-hidden hidden sm:block">
                <div className={`${macro.color} h-full rounded-full`} style={{ width: `${getPercentage(macro.current, macro.target)}%` }} />
              </div>

              <div className="text-right text-sm font-mono text-[var(--text-h)]">
                <span className="font-bold">{macro.current}g</span> <span className="text-gray-400">/ {macro.target}g</span>
              </div>
            </div>
          ))}
        </div>

        {/* HISTORIAL REAL DE LA BASE DE DATOS */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase flex items-center gap-1.5">
            <Activity className="w-4 h-4" /> Comidas Registradas Hoy
          </h3>

          <div className="space-y-2">
            {meals.length === 0 ? (
              <p className="text-sm text-gray-400 italic pl-1">Aún no has registrado alimentos hoy.</p>
            ) : (
              meals.map((meal) => (
                <div
                  key={meal.id}
                  className="bg-[var(--card-bg)] border border-[var(--border)] p-4 rounded-2xl flex justify-between items-center"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-[var(--text-h)] capitalize text-sm">{meal.dish}</p>
                    <p className="text-xs text-gray-400 font-medium">
                      P: {meal.protein}g · HC: {meal.carbs}g · G: {meal.fat}g
                    </p>
                  </div>
                  <span className="text-sm font-black text-[var(--text-h)] bg-[var(--border)] px-3 py-1 rounded-xl">
                    +{meal.calories} kcal
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}