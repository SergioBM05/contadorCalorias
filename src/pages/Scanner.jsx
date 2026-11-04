import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Camera, Flame, Beef, Wheat, Nut, RefreshCw, Sparkles, Check, Edit2, RotateCcw, Plus, Minus,
  ImagePlus, PenLine, History, Search, Info, Loader2,
} from 'lucide-react';
import { apiService } from '../services/api';
import { compressImage } from '../utils/image';
import { inputClass } from '../utils/styles';
import { PageHeader, Card } from '../components/ui';
import MealForm from '../components/MealForm';

const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 };
const EMPTY_MACROS = { calories: 0, protein: 0, carbs: 0, fat: 0 };
const PORTIONS = [0.5, 1, 1.5, 2];
const toInt = (v) => Math.max(0, Math.round(Number(v) || 0));
const scaleMacros = (m, f) => ({
  calories: toInt(m.calories * f), protein: toInt(m.protein * f), carbs: toInt(m.carbs * f), fat: toInt(m.fat * f),
});

const TABS = [
  { id: 'scan', label: 'Escanear', icon: Camera },
  { id: 'manual', label: 'Manual', icon: PenLine },
  { id: 'recent', label: 'Recientes', icon: History },
];

const Stepper = ({ value, onChange, step = 1, label }) => (
  <div className="flex items-center bg-(--card-bg) rounded-xl border border-(--border) p-1 h-10">
    <button type="button" aria-label={`Restar ${label}`} onClick={() => onChange(Math.max(0, value - step))} className="p-1.5 text-(--text-h) active:bg-(--border) rounded-lg transition-colors">
      <Minus className="w-3.5 h-3.5" />
    </button>
    <input
      type="number" inputMode="numeric" aria-label={label} value={value}
      onChange={(e) => onChange(toInt(e.target.value))}
      onFocus={(e) => e.target.select()}
      className="w-14 text-center bg-transparent text-sm font-black text-(--text-h) outline-none"
    />
    <button type="button" aria-label={`Sumar ${label}`} onClick={() => onChange(value + step)} className="p-1.5 text-(--text-h) active:bg-(--border) rounded-lg transition-colors">
      <Plus className="w-3.5 h-3.5" />
    </button>
  </div>
);

const MacroRow = ({ icon, label, value, onChange, unit = 'g', step }) => (
  <div className="bg-(--bg) p-3 rounded-2xl border border-(--border) flex items-center justify-between gap-3 w-full">
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="p-1.5 rounded-lg bg-(--card-bg) border border-(--border)">{icon}</div>
      <span className="text-xs text-(--text-h) font-bold uppercase tracking-wider truncate">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <Stepper value={value} onChange={onChange} step={step} label={label} />
      <span className="text-xs font-bold text-(--text) w-7">{unit}</span>
    </div>
  </div>
);

export default function Scanner() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'scan';
  const setTab = (id) => setSearchParams(id === 'scan' ? {} : { tab: id }, { replace: true });

  const [saving, setSaving] = useState(false);

  const saveMeal = async (meal, successMsg = '¡Plato registrado!') => {
    setSaving(true);
    try {
      await apiService.addMeal(meal);
      toast.success(successMsg);
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Error al registrar el plato');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col px-4 py-6 text-left font-sans max-w-md mx-auto gap-5">
      <PageHeader title="Añadir comida" icon={Sparkles} />

      {/* PESTAÑAS */}
      <div className="grid grid-cols-3 gap-1 bg-(--card-bg) border border-(--border) p-1 rounded-2xl" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              tab === id ? 'bg-(--accent) text-white shadow-sm' : 'text-(--text) hover:text-(--text-h)'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'scan' && <ScanTab saving={saving} onSave={saveMeal} />}

      {tab === 'manual' && (
        <Card className="p-5 animate-fade-up">
          <p className="text-xs text-(--text) mb-4">Añade un alimento sin foto: escribe sus macros (las encontrarás en la etiqueta).</p>
          <MealForm onSubmit={(meal) => saveMeal(meal)} submitting={saving} submitLabel="Registrar comida" />
        </Card>
      )}

      {tab === 'recent' && <RecentTab saving={saving} onSave={saveMeal} />}
    </div>
  );
}

/* ------------------------------ ESCANEAR ------------------------------ */
function ScanTab({ saving, onSave }) {
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [image, setImage] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [dishName, setDishName] = useState('');
  const [contextNote, setContextNote] = useState('');
  const [aiBase, setAiBase] = useState(null); // estimación original de la IA (ración ×1)
  const [aiInfo, setAiInfo] = useState(null); // { confidence, portionNote }
  const [portion, setPortion] = useState(1);
  const [macros, setMacros] = useState(EMPTY_MACROS);
  const hasScanned = Boolean(aiBase);

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPreparing(true);
    try {
      setImage(await compressImage(file));
      setAiBase(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPreparing(false);
    }
  };

  const handleScan = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const data = await apiService.scanMeal(image, contextNote.trim());
      const base = {
        calories: toInt(data?.calories), protein: toInt(data?.protein), carbs: toInt(data?.carbs), fat: toInt(data?.fat),
      };
      setDishName(data?.dish || 'Plato escaneado');
      setAiInfo({ confidence: Number(data?.confidence) || null, portionNote: data?.portionNote || null });
      setAiBase(base);
      setPortion(1);
      setMacros(base);
    } catch (err) {
      toast.error(err.message || 'Error al analizar la imagen con la IA');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setAiBase(null);
    setAiInfo(null);
    setDishName('');
    setContextNote('');
    setMacros(EMPTY_MACROS);
  };

  const choosePortion = (f) => {
    setPortion(f);
    setMacros(scaleMacros(aiBase, f));
  };

  // Al corregir un macro, ajustamos las calorías (4/4/9 kcal por gramo)
  const updateMacro = (macro, value) => {
    setMacros((prev) => {
      if (macro === 'calories') return { ...prev, calories: value };
      const delta = (value - prev[macro]) * KCAL_PER_GRAM[macro];
      return { ...prev, [macro]: value, calories: Math.max(0, prev.calories + delta) };
    });
  };

  const confidenceTone = aiInfo?.confidence >= 75 ? 'text-emerald-500' : aiInfo?.confidence >= 50 ? 'text-amber-500' : 'text-red-500';

  return (
    <>
      <section className="flex flex-col gap-2 animate-fade-up">
        <h2 className="font-black text-(--text-h) text-xs uppercase tracking-widest opacity-60">1. Captura tu plato</h2>

        {!image ? (
          <div className="grid grid-cols-2 gap-3">
            {[
              { ref: fileInputRef, icon: Camera, label: 'Hacer foto' },
              { ref: galleryInputRef, icon: ImagePlus, label: 'Subir imagen' },
            ].map(({ ref, icon: Icon, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => ref.current?.click()}
                disabled={preparing}
                className="border-2 border-dashed border-(--border) rounded-3xl h-40 flex flex-col items-center justify-center gap-2 p-4 bg-(--card-bg) hover:border-(--accent) transition disabled:opacity-60"
              >
                <div className="bg-(--accent-bg) p-3 rounded-full">
                  {preparing ? <RefreshCw className="w-7 h-7 text-(--accent) animate-spin" /> : <Icon className="w-7 h-7 text-(--accent)" />}
                </div>
                <span className="text-sm font-bold text-(--text-h)">{label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="relative rounded-3xl overflow-hidden border border-(--border) bg-(--card-bg) shadow-(--shadow)">
            <img src={image} alt="Plato a analizar" className="w-full h-56 object-cover" />
            {loading && (
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 text-white">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-xs font-bold">Analizando... (puede tardar unos segundos)</span>
              </div>
            )}
            {!hasScanned && !loading && (
              <button type="button" onClick={() => setImage(null)} className="absolute top-3 right-3 bg-black/70 active:bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold">
                Cambiar
              </button>
            )}
          </div>
        )}

        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleCapture} className="hidden" />
        <input type="file" accept="image/*" ref={galleryInputRef} onChange={handleCapture} className="hidden" />

        {image && !hasScanned && (
          <div className="space-y-2">
            <textarea
              rows={2}
              maxLength={300}
              value={contextNote}
              onChange={(e) => setContextNote(e.target.value)}
              placeholder="Contexto opcional: ingredientes, si es una ración grande, si lleva salsa o aceite..."
              className={`${inputClass} resize-none font-medium`}
            />
            <button
              type="button"
              onClick={handleScan}
              disabled={loading}
              className="w-full bg-(--accent) text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-transform disabled:opacity-50 text-sm tracking-wide"
            >
              {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Flame className="w-4 h-4" />}
              {loading ? 'ANALIZANDO COMPOSICIÓN...' : 'ANALIZAR CALORÍAS'}
            </button>
          </div>
        )}
      </section>

      {hasScanned && !loading && (
        <section className="flex flex-col gap-2">
          <h2 className="font-black text-(--text-h) text-xs uppercase tracking-widest opacity-60">2. Revisa y ajusta</h2>
          <Card className="p-4 animate-fade-up space-y-3">
            <label className="block space-y-1">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                <Edit2 className="w-2.5 h-2.5" /> ¿Nombre correcto?
              </span>
              <input type="text" maxLength={120} value={dishName} onChange={(e) => setDishName(e.target.value)} className={`${inputClass} text-lg font-black`} />
            </label>

            {(aiInfo?.confidence || aiInfo?.portionNote) && (
              <div className="flex gap-2 items-start bg-(--bg) border border-(--border) rounded-2xl p-3 text-xs">
                <Info className="w-4 h-4 text-(--accent) shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  {aiInfo.confidence && (
                    <p className="font-bold text-(--text-h)">Confianza de la IA: <span className={confidenceTone}>{aiInfo.confidence}%</span></p>
                  )}
                  {aiInfo.portionNote && <p className="text-(--text)">{aiInfo.portionNote}</p>}
                </div>
              </div>
            )}

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-(--text)">Ración</span>
              <div className="grid grid-cols-4 gap-2 mt-1" role="radiogroup" aria-label="Tamaño de la ración">
                {PORTIONS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={portion === f}
                    onClick={() => choosePortion(f)}
                    className={`py-2 rounded-xl text-xs font-black border transition ${portion === f ? 'bg-(--accent) text-white border-(--accent)' : 'bg-(--bg) text-(--text-h) border-(--border)'}`}
                  >
                    ×{f}
                  </button>
                ))}
              </div>
            </div>

            <MacroRow icon={<Flame className="w-4 h-4 text-red-500" />} label="Calorías" unit="kcal" step={10} value={macros.calories} onChange={(v) => updateMacro('calories', v)} />
            <MacroRow icon={<Beef className="w-4 h-4 text-rose-500" />} label="Proteína" value={macros.protein} onChange={(v) => updateMacro('protein', v)} />
            <MacroRow icon={<Wheat className="w-4 h-4 text-blue-500" />} label="Carbs" value={macros.carbs} onChange={(v) => updateMacro('carbs', v)} />
            <MacroRow icon={<Nut className="w-4 h-4 text-amber-500" />} label="Grasa" value={macros.fat} onChange={(v) => updateMacro('fat', v)} />

            <p className="text-[10px] text-(--text) px-1">Al ajustar un macro, las calorías se recalculan automáticamente.</p>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => (dishName.trim() ? onSave({ dish: dishName, ...macros }) : toast.error('Ponle un nombre al plato'))}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition active:scale-[0.99] disabled:opacity-50 text-sm uppercase tracking-wide"
              >
                {saving ? <RefreshCw className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                {saving ? 'Registrando...' : 'Confirmar y guardar'}
              </button>
              <button type="button" onClick={handleReset} className="w-full border border-(--border) bg-(--bg) text-(--text-h) font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:bg-(--border) text-xs">
                <RotateCcw className="w-3.5 h-3.5" /> VOLVER A ESCANEAR
              </button>
            </div>
          </Card>
        </section>
      )}
    </>
  );
}

/* ------------------------------ RECIENTES ------------------------------ */
function RecentTab({ saving, onSave }) {
  const [meals, setMeals] = useState(null);
  const [query, setQuery] = useState('');
  const [savingKey, setSavingKey] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiService
      .getAllMealsHistory()
      .then((data) => !cancelled && setMeals(data))
      .catch((err) => { if (!cancelled) { setMeals([]); toast.error(err.message); } });
    return () => { cancelled = true; };
  }, []);

  // Platos únicos (por nombre), del más reciente al más antiguo, con nº de veces registrado
  const recents = useMemo(() => {
    const byName = new Map();
    for (const m of [...(meals || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))) {
      const key = m.dish?.trim().toLowerCase();
      if (!key) continue;
      if (byName.has(key)) byName.get(key).count += 1;
      else byName.set(key, { ...m, key, count: 1 });
    }
    const q = query.trim().toLowerCase();
    return [...byName.values()].filter((m) => !q || m.key.includes(q)).slice(0, 30);
  }, [meals, query]);

  if (meals === null) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-(--accent)" /></div>;
  }

  return (
    <div className="space-y-3 animate-fade-up">
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-(--text)" />
        <input type="search" placeholder="Buscar en tus platos..." value={query} onChange={(e) => setQuery(e.target.value)} className={`${inputClass} pl-10`} />
      </div>

      {recents.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="!text-center text-sm font-bold text-(--text-h)">{query ? 'Sin resultados' : 'Aún no tienes platos registrados'}</p>
          <p className="!text-center text-xs text-(--text) mt-1">Los platos que registres aparecerán aquí para repetirlos con un toque.</p>
        </Card>
      ) : (
        recents.map((m) => (
          <Card key={m.key} className="!rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-black text-sm text-(--text-h) first-letter:uppercase truncate">{m.dish}</p>
              <p className="text-[10px] text-(--text) font-mono">
                {m.calories} kcal · P {m.protein}g · HC {m.carbs}g · G {m.fat}g{m.count > 1 ? ` · ${m.count} veces` : ''}
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setSavingKey(m.key);
                onSave({ dish: m.dish, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat }, `"${m.dish}" añadido de nuevo`);
              }}
              aria-label={`Volver a registrar ${m.dish}`}
              className="shrink-0 bg-(--accent) text-white p-2.5 rounded-xl hover:opacity-90 active:scale-95 transition disabled:opacity-50"
            >
              {saving && savingKey === m.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </Card>
        ))
      )}
    </div>
  );
}
