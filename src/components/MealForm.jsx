import { useState } from 'react';
import { Calculator, Loader2, Check } from 'lucide-react';
import { inputClass } from '../utils/styles';

const toInt = (v) => Math.max(0, Math.round(Number(v) || 0));
const kcalFromMacros = ({ protein, carbs, fat }) => toInt(protein) * 4 + toInt(carbs) * 4 + toInt(fat) * 9;

const FIELDS = [
  { key: 'protein', label: 'Proteína (g)', color: 'text-rose-500' },
  { key: 'carbs', label: 'Carbs (g)', color: 'text-blue-500' },
  { key: 'fat', label: 'Grasa (g)', color: 'text-amber-500' },
];

/**
 * Formulario de nombre + macros. Se usa para añadir comida manual y para editar.
 * onSubmit recibe { dish, calories, protein, carbs, fat } ya normalizado.
 */
export default function MealForm({ initial, onSubmit, submitting, submitLabel = 'Guardar' }) {
  const [values, setValues] = useState(() => ({
    dish: initial?.dish ?? '',
    calories: initial?.calories ?? '',
    protein: initial?.protein ?? '',
    carbs: initial?.carbs ?? '',
    fat: initial?.fat ?? '',
  }));
  const [error, setError] = useState(null);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const fromMacros = kcalFromMacros(values);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!values.dish.trim()) return setError('Ponle un nombre al plato');
    const calories = values.calories === '' ? fromMacros : toInt(values.calories);
    if (calories <= 0) return setError('Indica las calorías o los macros');
    if (calories > 10000) return setError('Las calorías parecen demasiado altas');
    setError(null);
    onSubmit({
      dish: values.dish.trim(),
      calories,
      protein: toInt(values.protein),
      carbs: toInt(values.carbs),
      fat: toInt(values.fat),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-(--text)">Nombre del plato</span>
        <input type="text" maxLength={120} placeholder="Ej: Yogur griego con avena" value={values.dish} onChange={set('dish')} className={inputClass} autoFocus />
      </label>

      <div className="grid grid-cols-3 gap-2">
        {FIELDS.map(({ key, label, color }) => (
          <label key={key} className="block space-y-1">
            <span className={`text-[10px] font-black uppercase tracking-wider ${color}`}>{label}</span>
            <input type="number" inputMode="numeric" min={0} placeholder="0" value={values[key]} onChange={set(key)} className={inputClass} />
          </label>
        ))}
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-(--text)">Calorías (kcal)</span>
        <div className="flex gap-2">
          <input
            type="number" inputMode="numeric" min={0}
            placeholder={fromMacros ? `${fromMacros} (según macros)` : 'Ej: 350'}
            value={values.calories} onChange={set('calories')} className={inputClass}
          />
          <button
            type="button"
            onClick={() => setValues((v) => ({ ...v, calories: String(fromMacros) }))}
            disabled={!fromMacros}
            title="Calcular desde macros (4/4/9 kcal por gramo)"
            className="shrink-0 px-3 rounded-xl border border-(--border) bg-(--bg) text-(--text-h) hover:border-(--accent) disabled:opacity-40 transition"
          >
            <Calculator className="w-4 h-4" />
          </button>
        </div>
        <span className="text-[10px] text-(--text)">Si lo dejas vacío, se calculan a partir de los macros.</span>
      </label>

      {error && <p className="text-xs font-bold text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm uppercase tracking-wide transition"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {submitLabel}
      </button>
    </form>
  );
}
