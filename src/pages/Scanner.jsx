import { useState, useRef } from 'react';
import { apiService } from '../services/api'; 
import { supabase } from '../services/supabaseClient'; 
import { Camera, Flame, Beef, Wheat, Nut, RefreshCw,  Sparkles, MoveLeft, Check, Edit2, RotateCcw, Plus, Minus } from 'lucide-react';
import { useNavigate } from "react-router-dom";

// Componente optimizado en fila horizontal compacta para móviles
const MacroInput = ({ icon, label, value, onChange }) => (
  <div className="bg-[var(--bg)] p-3.5 rounded-2xl border border-[var(--border)] shadow-sm flex items-center justify-between gap-4 w-full">
    {/* Izquierda: Icono y Nombre */}
    <div className="flex items-center gap-2.5 min-w-[100px]">
      <div className="p-1.5 rounded-lg bg-[var(--code-bg)]">
        {icon}
      </div>
      <span className="text-xs text-[var(--text-h)] font-bold uppercase tracking-wider">{label}</span>
    </div>
    
    {/* Derecha: Controles y gramos */}
    <div className="flex items-center gap-3">
      <div className="flex items-center bg-[var(--code-bg)] rounded-xl border border-[var(--border)] p-1 h-10">
        <button 
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="p-1 text-[var(--text-h)] active:bg-[var(--border)] rounded-lg transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <input 
          type="number" 
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="w-12 text-center bg-transparent text-sm font-black text-[var(--text-h)] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button 
          type="button"
          onClick={() => onChange(value + 1)}
          className="p-1 text-[var(--text-h)] active:bg-[var(--border)] rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <span className="text-xl font-black text-[var(--text-h)] min-w-[50px] text-right">{value}g</span>
    </div>
  </div>
);

export default function Scanner() {
  const navigate = useNavigate();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Guardamos los datos devueltos por la IA
  const [dishName, setDishName] = useState("");
  const [macros, setMacros] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [hasScanned, setHasScanned] = useState(false); 

  const handleCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        setHasScanned(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const data = await apiService.scanMeal(image);
      
      setDishName(data.dish || "Plato Escaneado");
      setMacros({
        calories: parseInt(data.calories) || 0,
        protein: parseInt(data.protein) || 0,
        carbs: parseInt(data.carbs) || 0,
        fat: parseInt(data.fat) || 0
      });
      setHasScanned(true);
    } catch (err) {
      alert(err.message || "Error al analizar la imagen con la IA");
    } finally {
      setLoading(false);
    }
  };

  // Función para resetear todo y volver a escanear otra foto
  const handleResetScan = () => {
    setImage(null);
    setHasScanned(false);
    setDishName("");
    setMacros({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const handleConfirmAndSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("No se encontró sesión de usuario");

      // Guardamos en Supabase el nombre (que puede haber editado) junto con los macros reales calculados por la IA
      const { error } = await supabase.from("meals").insert([
        {
          user_id: user.id,
          dish: dishName,
          calories: macros.calories,
          protein: macros.protein,
          carbs: macros.carbs,
          fat: macros.fat
        }
      ]);

      if (error) throw error;

      alert("¡Plato registrado con éxito!");
      navigate("/"); 
    } catch (err) {
      alert(err.message || "Error al registrar el plato");
    } finally {
      setSaving(false);
    }
  };

  // Función para actualizar macros individuales
  const updateMacro = (macro, value) => {
    setMacros(prev => ({ ...prev, [macro]: value }));
  };

  return (
    <div className="w-full min-h-screen flex flex-col px-4 pb-6 text-left font-sans max-w-md mx-auto">

      {/* Header (Simplificado para móvil) */}
      <header className="py-4 border-b border-[var(--border)] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="p-2.5 bg-[var(--text-h)] text-[var(--bg)] hover:opacity-90 rounded-full shadow-md transition-transform active:scale-95 flex items-center justify-center"
          >
            <MoveLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[var(--accent)] px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            IA 100%
          </div>
        </div>
        <div>
          <h1 className="!my-0 font-black tracking-tight text-2xl bg-gradient-to-r from-[var(--text-h)] to-[var(--accent)] bg-clip-text text-transparent">
            MEALSCAN AI
          </h1>
          <p className="text-xs text-[var(--text)] opacity-80">
            Analiza tus macros al instante usando visión artificial.
          </p>
        </div>
      </header>

      {/* Contenido (Diseño de Stack Vertical para móvil) */}
      <main className="flex-1 flex flex-col gap-5 my-4">

        {/* 1. Captura */}
        <div className="w-full flex flex-col gap-2">
          <h2 className="font-black text-[var(--text-h)] text-xs uppercase tracking-widest opacity-60">1. Captura tu plato</h2>

          {!image ? (
            <div
              onClick={() => fileInputRef.current.click()}
              className="border-2 border-dashed border-[var(--border)] rounded-3xl h-56 flex flex-col items-center justify-center cursor-pointer p-5 bg-[var(--code-bg)] hover:border-[var(--accent)] transition-all duration-300 shadow-[var(--shadow)]"
            >
              <div className="bg-[var(--accent-bg)] p-3 rounded-full mb-2">
                <Camera className="w-8 h-8 text-[var(--accent)]" />
              </div>
              <p className="text-sm font-bold text-[var(--text-h)] mb-0.5">
                Haz una foto o sube una imagen
              </p>
            </div>
          ) : (
            <div className="relative rounded-3xl overflow-hidden border border-[var(--border)] bg-[var(--code-bg)] shadow-[var(--shadow)]">
              <img src={image} alt="Plato" className="w-full h-56 object-cover" />
              {!hasScanned && (
                <button
                  onClick={() => setImage(null)}
                  className="absolute top-3 right-3 bg-black/70 active:bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition"
                >
                  Cambiar
                </button>
              )}
            </div>
          )}

          <input
            type="file" accept="image/*" capture="environment"
            ref={fileInputRef} onChange={handleCapture} className="hidden"
          />

          {image && !hasScanned && (
            <button
              onClick={handleScan}
              disabled={loading}
              className="w-full bg-[var(--accent)] text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-transform disabled:opacity-50 text-sm tracking-wide"
            >
              {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Flame className="w-4 h-4" />}
              {loading ? "ANALIZANDO COMPOSICIÓN..." : "ANALIZAR CALORÍAS"}
            </button>
          )}
        </div>

        {/* 2. Resultados */}
        <div className="w-full flex flex-col gap-2">
          <h2 className="font-black text-[var(--text-h)] text-xs uppercase tracking-widest opacity-60">2. Desglose Nutricional</h2>

          {!hasScanned && !loading && (
            <div className="border border-[var(--border)] rounded-3xl p-6 text-center text-[var(--text)] flex flex-col items-center justify-center h-48 bg-[var(--bg)] bg-opacity-40">
              <p className="text-xs max-w-xs opacity-70">
                Saca una captura para ver el análisis detallado aquí.
              </p>
            </div>
          )}

          {loading && (
            <div className="border border-[var(--border)] rounded-3xl p-6 text-center flex flex-col items-center justify-center h-48 bg-[var(--code-bg)] animate-pulse">
              <RefreshCw className="w-8 h-8 text-[var(--accent)] animate-spin mb-2" />
              <p className="text-xs font-bold text-[var(--text-h)]">Calculando tus macros con la IA...</p>
            </div>
          )}

          {hasScanned && !loading && (
            <div className="bg-[var(--code-bg)] border border-[var(--border)] p-4 rounded-3xl shadow-[var(--shadow)] animate-in fade-in slide-in-from-bottom-4 duration-300 w-full space-y-4">
              
              {/* Nombre del plato */}
              <div className="space-y-1">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                  <Edit2 className="w-2.5 h-2.5" /> ¿Nombre correcto?
                </span>
                <input 
                  type="text"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] text-lg font-black text-[var(--text-h)] rounded-xl px-3 py-2 outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* TILE DE CALORÍAS PRINCIPAL */}
              <div className="bg-[var(--bg)] p-3.5 rounded-2xl border border-[var(--border)] shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-500" />
                  <span className="text-xs text-[var(--text)] font-bold uppercase tracking-wider">Calorías Totales</span>
                </div>
                <span className="text-2xl font-black text-[var(--text-h)]">{macros.calories} <span className="text-xs font-medium text-gray-400">kcal</span></span>
              </div>

              {/* LISTA COMPACTA DE MACROS */}
              <div className="flex flex-col gap-2">
                <MacroInput 
                  icon={<Beef className="w-4 h-4 text-orange-400" />} 
                  label="Proteína" 
                  value={macros.protein} 
                  onChange={(val) => updateMacro('protein', val)} 
                />
                <MacroInput 
                  icon={<Wheat className="w-4 h-4 text-blue-400" />} 
                  label="Carbs" 
                  value={macros.carbs} 
                  onChange={(val) => updateMacro('carbs', val)} 
                />
                <MacroInput 
                  icon={<Nut className="w-4 h-4 text-yellow-500" />} 
                  label="Grasa" 
                  value={macros.fat} 
                  onChange={(val) => updateMacro('fat', val)} 
                />
              </div>

              {/* Botones de acción principales */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={handleConfirmAndSave}
                  disabled={saving}
                  className="w-full bg-emerald-600 active:bg-emerald-700 text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-transform active:scale-[0.99] disabled:opacity-50 text-sm uppercase tracking-wide"
                >
                  {saving ? <RefreshCw className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                  {saving ? "Registrando..." : "CONFIRMAR Y GUARDAR"}
                </button>
                <button
                  onClick={handleResetScan}
                  className="w-full border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm active:bg-[var(--border)] text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> VOLVER A ESCANEAR
                </button>
              </div>

            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center pt-3 border-t border-[var(--border)] mt-auto">
        <p className="text-[10px] text-[var(--text)] opacity-60 font-medium">
          MealScan AI 🔥
        </p>
      </footer>
    </div>
  );
}