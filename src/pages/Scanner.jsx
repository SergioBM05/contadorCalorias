import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Camera, Flame, Beef, Wheat, Nut, RefreshCw, Sparkles, Check, Edit2, RotateCcw, Plus, Minus, ImagePlus } from 'lucide-react';
import { apiService } from '../services/api';
import { compressImage } from '../utils/image';
import { PageHeader, Card } from '../components/ui';
import { inputClass } from '../utils/styles';

const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 };
const EMPTY_MACROS = { calories: 0, protein: 0, carbs: 0, fat: 0 };
const toInt = (v) => Math.max(0, Math.round(Number(v) || 0));

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
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [image, setImage] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dishName, setDishName] = useState('');
  const [contextNote, setContextNote] = useState('');
  const [macros, setMacros] = useState(EMPTY_MACROS);
  const [hasScanned, setHasScanned] = useState(false);

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;

    setPreparing(true);
    try {
      setImage(await compressImage(file));
      setHasScanned(false);
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
      setDishName(data?.dish || 'Plato escaneado');
      setMacros({
        calories: toInt(data?.calories),
        protein: toInt(data?.protein),
        carbs: toInt(data?.carbs),
        fat: toInt(data?.fat),
      });
      setHasScanned(true);
    } catch (err) {
      toast.error(err.message || 'Error al analizar la imagen con la IA');
    } finally {
      setLoading(false);
    }
  };

  const handleResetScan = () => {
    setImage(null);
    setHasScanned(false);
    setDishName('');
    setContextNote('');
    setMacros(EMPTY_MACROS);
  };

  // Al corregir un macro, ajustamos las calorías en proporción (4/4/9 kcal por gramo)
  const updateMacro = (macro, value) => {
    setMacros((prev) => {
      if (macro === 'calories') return { ...prev, calories: value };
      const delta = (value - prev[macro]) * KCAL_PER_GRAM[macro];
      return { ...prev, [macro]: value, calories: Math.max(0, prev.calories + delta) };
    });
  };

  const handleConfirmAndSave = async () => {
    if (!dishName.trim()) return toast.error('Ponle un nombre al plato');
    setSaving(true);
    try {
      await apiService.addMeal({ dish: dishName, ...macros });
      toast.success('¡Plato registrado con éxito!');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Error al registrar el plato');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col px-4 py-6 text-left font-sans max-w-md mx-auto gap-5">
      <PageHeader
        title="MealScan AI"
        icon={Sparkles}
        right={
          <span className="bg-(--accent-bg) border border-(--accent-border) text-(--accent) px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
            IA
          </span>
        }
      />

      <p className="text-xs text-(--text) px-1 -mt-2">Haz una foto a tu plato y la IA estimará sus calorías y macros. Podrás corregirlos antes de guardar.</p>

      {/* 1. CAPTURA */}
      <section className="flex flex-col gap-2">
        <h2 className="font-black text-(--text-h) text-xs uppercase tracking-widest opacity-60">1. Captura tu plato</h2>

        {!image ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={preparing}
              className="border-2 border-dashed border-(--border) rounded-3xl h-44 flex flex-col items-center justify-center gap-2 p-4 bg-(--card-bg) hover:border-(--accent) transition disabled:opacity-60"
            >
              <div className="bg-(--accent-bg) p-3 rounded-full">
                {preparing ? <RefreshCw className="w-7 h-7 text-(--accent) animate-spin" /> : <Camera className="w-7 h-7 text-(--accent)" />}
              </div>
              <span className="text-sm font-bold text-(--text-h)">Hacer foto</span>
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={preparing}
              className="border-2 border-dashed border-(--border) rounded-3xl h-44 flex flex-col items-center justify-center gap-2 p-4 bg-(--card-bg) hover:border-(--accent) transition disabled:opacity-60"
            >
              <div className="bg-(--accent-bg) p-3 rounded-full">
                <ImagePlus className="w-7 h-7 text-(--accent)" />
              </div>
              <span className="text-sm font-bold text-(--text-h)">Subir imagen</span>
            </button>
          </div>
        ) : (
          <div className="relative rounded-3xl overflow-hidden border border-(--border) bg-(--card-bg) shadow-(--shadow)">
            <img src={image} alt="Plato a analizar" className="w-full h-56 object-cover" />
            {!hasScanned && !loading && (
              <button
                type="button"
                onClick={() => setImage(null)}
                className="absolute top-3 right-3 bg-black/70 active:bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition"
              >
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

      {/* 2. RESULTADOS */}
      <section className="flex flex-col gap-2">
        <h2 className="font-black text-(--text-h) text-xs uppercase tracking-widest opacity-60">2. Desglose nutricional</h2>

        {!hasScanned && !loading && (
          <div className="border border-dashed border-(--border) rounded-3xl p-6 flex items-center justify-center h-32">
            <p className="!text-center text-xs text-(--text) opacity-70 max-w-xs">El análisis detallado aparecerá aquí.</p>
          </div>
        )}

        {loading && (
          <Card className="p-6 flex flex-col items-center justify-center h-40 animate-pulse">
            <RefreshCw className="w-8 h-8 text-(--accent) animate-spin mb-2" />
            <p className="text-xs font-bold text-(--text-h)">Calculando tus macros con la IA...</p>
          </Card>
        )}

        {hasScanned && !loading && (
          <Card className="p-4 animate-fade-up space-y-3">
            <label className="block space-y-1">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                <Edit2 className="w-2.5 h-2.5" /> ¿Nombre correcto?
              </span>
              <input
                type="text" maxLength={120} value={dishName} onChange={(e) => setDishName(e.target.value)}
                className={`${inputClass} text-lg font-black`}
              />
            </label>

            <MacroRow icon={<Flame className="w-4 h-4 text-red-500" />} label="Calorías" unit="kcal" step={10} value={macros.calories} onChange={(v) => updateMacro('calories', v)} />
            <MacroRow icon={<Beef className="w-4 h-4 text-rose-500" />} label="Proteína" value={macros.protein} onChange={(v) => updateMacro('protein', v)} />
            <MacroRow icon={<Wheat className="w-4 h-4 text-blue-500" />} label="Carbs" value={macros.carbs} onChange={(v) => updateMacro('carbs', v)} />
            <MacroRow icon={<Nut className="w-4 h-4 text-amber-500" />} label="Grasa" value={macros.fat} onChange={(v) => updateMacro('fat', v)} />

            <p className="text-[10px] text-(--text) px-1">Al ajustar un macro, las calorías se recalculan automáticamente.</p>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmAndSave}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition active:scale-[0.99] disabled:opacity-50 text-sm uppercase tracking-wide"
              >
                {saving ? <RefreshCw className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                {saving ? 'Registrando...' : 'Confirmar y guardar'}
              </button>
              <button
                type="button"
                onClick={handleResetScan}
                className="w-full border border-(--border) bg-(--bg) text-(--text-h) font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:bg-(--border) text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" /> VOLVER A ESCANEAR
              </button>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
