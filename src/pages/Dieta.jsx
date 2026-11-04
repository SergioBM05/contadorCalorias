import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Sparkles, Utensils, Scale, ChefHat, Loader2, Check, RotateCcw } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { apiService } from '../services/api';
import { getGoalMeta } from '../utils/goalLabels';
import { startOfDayISO } from '../utils/dates';
import { sumMacros } from '../utils/nutrition';
import { inputClass } from '../utils/styles';
import { PageHeader, Card, FullScreenLoader } from '../components/ui';

const MEAL_TYPES = ['Desayuno', 'Comida', 'Cena', 'Snack'];
const PROMPT_SUGGESTIONS = ['Pollo, arroz y verduras', 'Tortilla de patatas saludable', 'Algo rápido alto en proteína', 'Bowl de avena'];

/** La IA puede devolver los macros en distintas formas; normalizamos si existen. */
const extractMacros = (recipe) => {
  const src = recipe?.calculatedMacros || recipe?.macros || recipe?.totals || recipe?.nutrition || recipe;
  const calories = Number(src?.calories ?? src?.kcal);
  if (!Number.isFinite(calories) || calories <= 0) return null;
  return {
    calories: Math.round(calories),
    protein: Math.round(Number(src.protein) || 0),
    carbs: Math.round(Number(src.carbs) || 0),
    fat: Math.round(Number(src.fat) || 0),
  };
};

export default function Dieta() {
  const navigate = useNavigate();
  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);

  const [targets, setTargets] = useState(null);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  const [promptUser, setPromptUser] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('Comida');
  const [recipeResult, setRecipeResult] = useState(null);

  const fetchTodayStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const [profile, mealsRes] = await Promise.all([
        apiService.getProfile(),
        supabase
          .from('meals')
          .select('calories, protein, carbs, fat')
          .eq('user_id', userId)
          .gte('created_at', startOfDayISO()),
      ]);
      if (mealsRes.error) throw mealsRes.error;

      setTargets(profile);
      setTotals(sumMacros(mealsRes.data || []));
    } catch (err) {
      console.error('Error al cargar datos:', err);
      toast.error('No se pudieron obtener tus datos de hoy');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => !cancelled && fetchTodayStatus());
    return () => { cancelled = true; };
  }, [fetchTodayStatus]);

  const remaining = {
    calories: targets ? Math.max(Math.round(targets.calories_target - totals.calories), 0) : 0,
    protein: targets ? Math.max(Math.round(targets.protein_target - totals.protein), 0) : 0,
    carbs: targets ? Math.max(Math.round(targets.carbs_target - totals.carbs), 0) : 0,
    fat: targets ? Math.max(Math.round(targets.fat_target - totals.fat), 0) : 0,
  };

  const goalMeta = getGoalMeta(targets?.fitness_goal || 'mantener');
  const recipeMacros = extractMacros(recipeResult);
  const ingredients = Array.isArray(recipeResult?.ingredients) ? recipeResult.ingredients : [];
  const steps = Array.isArray(recipeResult?.steps) ? recipeResult.steps : [];

  const handleGenerateRecipe = async (e) => {
    e.preventDefault();
    if (!promptUser.trim()) return toast.error("Escribe qué te apetece comer (ej: 'Pollo con arroz y verduras')");

    setGenerating(true);
    setRecipeResult(null);
    try {
      const recipe = await apiService.generateDietPlan({
        prompt: promptUser.trim(),
        mealType: selectedMealType,
        remaining,
      });
      setRecipeResult(recipe);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error al comunicarse con el asistente de IA');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveRecipeAsMeal = async () => {
    if (!recipeMacros) return;
    setSavingMeal(true);
    try {
      await apiService.addMeal({ dish: recipeResult.title || promptUser, ...recipeMacros });
      toast.success('¡Comida registrada!');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingMeal(false);
    }
  };

  if (loadingData) return <FullScreenLoader />;

  const allDone = remaining.calories === 0;

  return (
    <div className="min-h-screen bg-(--bg) text-(--text) px-4 py-6 md:py-10 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader
          title="Planner de dieta IA"
          icon={Sparkles}
          right={
            <span className={`hidden sm:inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border ${goalMeta.bg} ${goalMeta.border} ${goalMeta.accent}`}>
              {goalMeta.short}
            </span>
          }
        />

        {/* MARGEN RESTANTE */}
        <Card className="p-5 space-y-3">
          <p className="text-xs font-bold text-(--text) uppercase tracking-wider flex items-center gap-1.5">
            <Scale className="w-4 h-4" /> Te queda por comer hoy
          </p>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              ['KCAL', remaining.calories, '', 'text-(--text)'],
              ['PROT', remaining.protein, 'g', 'text-rose-500'],
              ['HC', remaining.carbs, 'g', 'text-blue-500'],
              ['GRASA', remaining.fat, 'g', 'text-amber-500'],
            ].map(([label, value, unit, color]) => (
              <div key={label} className="bg-(--bg) border border-(--border) p-2.5 rounded-2xl">
                <span className={`text-[10px] block font-bold ${color}`}>{label}</span>
                <span className="text-sm md:text-base font-black text-(--text-h)">{value}{unit}</span>
              </div>
            ))}
          </div>
          {allDone && <p className="text-xs font-bold text-emerald-500">🎉 Has alcanzado tu objetivo calórico de hoy.</p>}
        </Card>

        {/* FORMULARIO */}
        <Card className="p-5">
          <form onSubmit={handleGenerateRecipe} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-bold text-(--text) block">¿QUÉ TE APETECE O QUÉ TIENES EN LA NEVERA?</span>
              <textarea
                rows={3}
                maxLength={500}
                placeholder="Ej: Tengo pechuga de pollo, arroz y aguacate."
                value={promptUser}
                onChange={(e) => setPromptUser(e.target.value)}
                className={`${inputClass} resize-none font-medium`}
              />
            </label>

            <div className="flex flex-wrap gap-1.5">
              {PROMPT_SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => setPromptUser(s)} className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-(--border) bg-(--bg) text-(--text) hover:border-(--accent) hover:text-(--accent) transition">
                  {s}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Tipo de comida">
              {MEAL_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={selectedMealType === type}
                  onClick={() => setSelectedMealType(type)}
                  className={`py-2 rounded-xl text-xs font-bold transition border ${
                    selectedMealType === type
                      ? 'bg-(--accent) text-white border-(--accent)'
                      : 'bg-(--bg) text-(--text) border-(--border) hover:border-(--text)'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={generating || allDone}
              className="w-full bg-(--text-h) text-(--bg) hover:opacity-90 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 transition shadow-lg"
            >
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChefHat className="w-5 h-5" />}
              {generating ? 'Calculando gramos exactos...' : 'CALCULAR PESOS CON IA'}
            </button>
          </form>
        </Card>

        {/* RESULTADO */}
        {recipeResult && (
          <Card className="p-6 space-y-5 animate-fade-up">
            <div>
              <span className="text-[10px] font-black tracking-widest text-(--accent) uppercase bg-(--accent-bg) px-2.5 py-1 rounded-lg border border-(--accent-border)">
                Receta ajustada · {selectedMealType}
              </span>
              <h2 className="text-xl font-black text-(--text-h) mt-3">{recipeResult.title || 'Tu receta'}</h2>
              {recipeResult.description && <p className="text-xs text-(--text) mt-1">{recipeResult.description}</p>}
            </div>

            {recipeMacros && (
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  ['kcal', recipeMacros.calories, ''],
                  ['Prot', recipeMacros.protein, 'g'],
                  ['HC', recipeMacros.carbs, 'g'],
                  ['Grasa', recipeMacros.fat, 'g'],
                ].map(([label, value, unit]) => (
                  <div key={label} className="bg-(--bg) border border-(--border) rounded-xl py-2">
                    <span className="text-sm font-black text-(--text-h) block">{value}{unit}</span>
                    <span className="text-[10px] text-(--text)">{label}</span>
                  </div>
                ))}
              </div>
            )}

            {ingredients.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-black text-(--text) uppercase tracking-wider flex items-center gap-1.5">
                  <Utensils className="w-4 h-4" /> Ingredientes y pesos
                </h3>
                <div className="space-y-1.5">
                  {ingredients.map((ing, idx) => (
                    <div key={`${ing.name}-${idx}`} className="bg-(--bg) border border-(--border) p-3 rounded-2xl flex justify-between items-center gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-(--text-h)">{ing.name}</p>
                        {ing.note && <p className="text-[10px] text-(--text)">{ing.note}</p>}
                      </div>
                      <span className="font-mono font-black text-sm text-(--accent) bg-(--accent-bg) px-2.5 py-1 rounded-xl whitespace-nowrap">
                        {ing.weight}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {steps.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-black text-(--text) uppercase tracking-wider">Preparación</h3>
                <ol className="space-y-1.5 text-sm text-(--text-h) list-decimal list-inside">
                  {steps.map((step, idx) => <li key={idx}>{step}</li>)}
                </ol>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {recipeMacros && (
                <button
                  type="button"
                  onClick={handleSaveRecipeAsMeal}
                  disabled={savingMeal}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-xs uppercase tracking-wide"
                >
                  {savingMeal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Me lo he comido, registrar
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerateRecipe}
                disabled={generating}
                className="flex-1 border border-(--border) bg-(--bg) text-(--text-h) font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-xs disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Otra propuesta
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
