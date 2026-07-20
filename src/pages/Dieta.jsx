import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { apiService } from "../services/api";
import { ArrowLeft, Sparkles, Utensils, Scale, ChefHat, Loader2 } from "lucide-react";
import { toast } from 'sonner';
import { getGoalMeta } from '../utils/goalLabels';

export default function SmartPlanner() {
  const navigate = useNavigate();

  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Datos del día
  const [targets, setTargets] = useState(null);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Inputs del usuario
  const [promptUser, setPromptUser] = useState("");
  const [selectedMealType, setSelectedMealType] = useState("Comida");

  // Respuesta de la IA
  const [recipeResult, setRecipeResult] = useState(null);

  // 1. Cargar lo que ha comido hoy y sus objetivos
  const fetchTodayStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/auth");

      // Perfil (Objetivos)
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("calories_target, protein_target, carbs_target, fat_target, fitness_goal, weight_goal")
        .eq("user_id", user.id)
        .single();

      setTargets(profile);

      // Comidas de hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: meals } = await supabase
        .from("meals")
        .select("calories, protein, carbs, fat")
        .eq("user_id", user.id)
        .gte("created_at", today.toISOString());

      const consumed = (meals || []).reduce((acc, m) => {
        acc.calories += m.calories || 0;
        acc.protein += m.protein || 0;
        acc.carbs += m.carbs || 0;
        acc.fat += m.fat || 0;
        return acc;
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

      setTotals(consumed);
    } catch (err) {
      console.error("Error al cargar datos:", err);
      toast.error("No se pudieron obtener tus datos de hoy");
    } finally {
      setLoadingData(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchTodayStatus();
  }, [fetchTodayStatus]);

  // Calcular lo que FALTA por comer
  const remaining = {
    calories: targets ? Math.max(targets.calories_target - totals.calories, 0) : 0,
    protein: targets ? Math.max(targets.protein_target - totals.protein, 0) : 0,
    carbs: targets ? Math.max(targets.carbs_target - totals.carbs, 0) : 0,
    fat: targets ? Math.max(targets.fat_target - totals.fat, 0) : 0,
  };

  const goalMeta = getGoalMeta(targets?.fitness_goal || 'mantener');

  // 2. Generar receta con la IA
  const handleGenerateRecipe = async (e) => {
    e.preventDefault();
    if (!promptUser.trim()) {
      return toast.error("Escribe qué te apetece comer (ej: 'Pollo con arroz y verduras')");
    }

    setGenerating(true);
    setRecipeResult(null);

    try {
      const generatedRecipe = await apiService.generateDietPlan({
        prompt: promptUser,
        mealType: selectedMealType,
        remaining,
      });

      setRecipeResult(generatedRecipe);
      toast.success("¡Receta adaptada generada con éxito!");

    } catch (err) {
      console.error(err);
      toast.error("Error al comunicarse con el asistente de IA");
    } finally {
      setGenerating(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--text)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--text)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-4 py-6 md:py-10 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center bg-[var(--code-bg)] border border-[var(--border)] p-3 rounded-2xl">
          <button onClick={() => navigate("/")} className="p-2.5 border border-[var(--border)] rounded-xl bg-[var(--bg)] hover:bg-[var(--border)] transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-black tracking-tight uppercase flex items-center gap-2 text-[var(--text-h)]">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" /> Planner de dieta IA
          </span>
          <div className="flex items-center gap-2">
            <div className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border ${goalMeta.bg} ${goalMeta.border} ${goalMeta.accent}`}>
              <span>{goalMeta.short}</span>
            </div>
            {targets?.weight_goal && (
              <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]">
                <span>Meta</span>
                <span>{targets.weight_goal} kg</span>
              </div>
            )}
          </div>
        </div>

        {/* RESUMEN DE MARGEN RESTANTE DEL DÍA */}
        <div className="bg-[var(--code-bg)] border border-[var(--border)] p-5 rounded-3xl space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-[var(--text)]" /> Margen Restante para la IA
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-[var(--bg)] border border-[var(--border)] p-2.5 rounded-2xl">
              <span className="text-[10px] text-gray-400 block font-bold">KCAL</span>
              <span className="text-sm md:text-base font-black text-[var(--text-h)]">{remaining.calories}</span>
            </div>
            <div className="bg-[var(--bg)] border border-[var(--border)] p-2.5 rounded-2xl">
              <span className="text-[10px] text-rose-400 block font-bold">PROT</span>
              <span className="text-sm md:text-base font-black text-[var(--text-h)]">{remaining.protein}g</span>
            </div>
            <div className="bg-[var(--bg)] border border-[var(--border)] p-2.5 rounded-2xl">
              <span className="text-[10px] text-blue-400 block font-bold">HC</span>
              <span className="text-sm md:text-base font-black text-[var(--text-h)]">{remaining.carbs}g</span>
            </div>
            <div className="bg-[var(--bg)] border border-[var(--border)] p-2.5 rounded-2xl">
              <span className="text-[10px] text-amber-400 block font-bold">GRASA</span>
              <span className="text-sm md:text-base font-black text-[var(--text-h)]">{remaining.fat}g</span>
            </div>
          </div>
        </div>

        {/* FORMULARIO DE PETICIÓN */}
        <form onSubmit={handleGenerateRecipe} className="bg-[var(--code-bg)] border border-[var(--border)] p-5 rounded-3xl space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 block">¿QUÉ TE APETECE COMER O QUÉ TIENES EN LA NEVERA?</label>
            <textarea
              rows={3}
              placeholder="Ej: Tengo pechuga de pollo, arroz y aguacate. O sencillamente: 'Quiero cenar una tortilla de patatas saludable'."
              value={promptUser}
              onChange={(e) => setPromptUser(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] text-sm font-medium text-[var(--text)] rounded-2xl p-3 outline-none focus:border-[var(--border)] transition resize-none"
            />
          </div>

          <div className="flex gap-2">
            {["Comida", "Cena", "Snack"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedMealType(type)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${
                  selectedMealType === type
                    ? "bg-[var(--bg)] text-white border-[var(--border)]"
                    : "bg-[var(--bg)] text-gray-400 border-[var(--border)]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={generating || remaining.calories === 0}
            className="w-full bg-[var(--bg)] hover:opacity-90 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition shadow-lg"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Calculando gramos exactos...</span>
              </>
            ) : (
              <>
                <ChefHat className="w-5 h-5" />
                <span>CALCULAR PESOS CON IA</span>
              </>
            )}
          </button>
        </form>

        {/* RESULTADO GENERADO POR LA IA */}
        {recipeResult && (
          <div className="bg-[var(--bg)] border border-[var(--border)] p-6 rounded-3xl space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <span className="text-[10px] font-black tracking-widest text-[var(--text)] uppercase bg-[var(--bg)] px-2.5 py-1 rounded-lg border border-[var(--border)]">
                Receta Ajustada
              </span>
              <h2 className="text-xl font-black text-[var(--text)] mt-2">{recipeResult.title}</h2>
              <p className="text-xs text-gray-400 mt-1">{recipeResult.description}</p>
            </div>

            {/* LISTA DE INGREDIENTES CON PESOS */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-[var(--text)]" /> Ingredientes y Pesos Exactos
              </h3>
              <div className="space-y-1.5">
                {recipeResult.ingredients.map((ing, idx) => (
                  <div key={idx} className="bg-[var(--bg)] border border-[var(--border)] p-3 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-[var(--text)]">{ing.name}</p>
                      <p className="text-[10px] text-gray-500">{ing.note}</p>
                    </div>
                    <span className="font-mono font-black text-base text-[var(--text)] bg-[var(--bg)] px-2.5 py-1 rounded-xl">
                      {ing.weight}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* PASOS */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Preparación Básica</h3>
              <ul className="space-y-1 text-xs text-gray-300 list-disc list-inside">
                {recipeResult.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}