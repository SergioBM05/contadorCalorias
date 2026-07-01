import { useState, useRef } from 'react';
import { apiService } from '../services/api'; 
import { supabase } from '../services/supabaseClient'; 
import { Camera, Flame, Beef, Wheat, Nut, RefreshCw, Upload, Sparkles, MoveLeft, Check, Edit2, RotateCcw } from 'lucide-react';
import { useNavigate } from "react-router-dom";

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

  return (
    <div className="w-full flex-1 flex flex-col justify-between px-6 md:px-12 pb-8 text-left font-sans">

      {/* Header */}
      <header className="py-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => navigate("/")}
          className="p-3 bg-[var(--text-h)] text-[var(--bg)] hover:opacity-90 rounded-full shadow-lg transition-transform active:scale-95 flex items-center justify-center self-start"
        >
          <MoveLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="!my-0 font-black tracking-tight text-4xl sm:text-5xl bg-gradient-to-r from-[var(--text-h)] to-[var(--accent)] bg-clip-text text-transparent">
            MEALSCAN AI
          </h1>
          <p className="text-sm mt-2 text-[var(--text)]">
            Analiza tus macros al instante usando visión artificial. La IA se encarga de todo.
          </p>
        </div>

        <div className="self-start sm:self-center flex items-center gap-2 bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[var(--accent)] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Modo Inteligente 100% IA
        </div>
      </header>

      {/* Grid de Contenido */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 my-8 items-start">

        {/* Columna Izquierda: Captura */}
        <div className="w-full flex flex-col gap-4">
          <h2 className="!mb-2 font-bold text-[var(--text-h)] text-lg">1. Captura tu plato</h2>

          {!image ? (
            <div
              onClick={() => fileInputRef.current.click()}
              className="border-2 border-dashed border-[var(--border)] rounded-3xl h-80 sm:h-96 flex flex-col items-center justify-center cursor-pointer p-6 bg-[var(--code-bg)] hover:border-[var(--accent)] transition-all duration-300 shadow-[var(--shadow)] group"
            >
              <div className="bg-[var(--accent-bg)] p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                <Camera className="w-10 h-10 text-[var(--accent)]" />
              </div>
              <p className="text-base font-semibold text-[var(--text-h)] mb-1">
                Haz una foto o arrastra una imagen
              </p>
              <p className="text-xs text-[var(--text)] text-center max-w-xs">
                Soporta capturas desde la cámara de tu móvil o archivos de tu galería.
              </p>
              <button className="mt-4 flex items-center gap-2 text-xs font-bold bg-[var(--bg)] border border-[var(--border)] text-[var(--text-h)] px-4 py-2 rounded-xl shadow-sm">
                <Upload className="w-3.5 h-3.5" /> Examinar archivos
              </button>
            </div>
          ) : (
            <div className="relative rounded-3xl overflow-hidden border border-[var(--border)] bg-[var(--code-bg)] shadow-[var(--shadow)]">
              <img src={image} alt="Plato" className="w-full h-80 sm:h-96 object-cover" />
              {!hasScanned && (
                <button
                  onClick={() => setImage(null)}
                  className="absolute top-4 right-4 bg-black/80 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition"
                >
                  Cambiar imagen
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
              className="w-full bg-[var(--accent)] hover:opacity-90 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50 text-base"
            >
              {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Flame className="w-5 h-5" />}
              {loading ? "Analizando composición..." : "ANALIZAR CALORÍAS"}
            </button>
          )}
        </div>

        {/* Columna Derecha: Resultado e Interacción */}
        <div className="w-full h-full flex flex-col justify-start">
          <h2 className="!mb-2 font-bold text-[var(--text-h)] text-lg">2. Desglose Nutricional</h2>

          {!hasScanned && !loading && (
            <div className="border border-[var(--border)] rounded-3xl p-8 text-center text-[var(--text)] flex flex-col items-center justify-center h-80 sm:h-96 bg-[var(--bg)] bg-opacity-40">
              <p className="text-sm max-w-xs">
                Saca o sube una captura para ver el análisis detallado de proteínas, carbohidratos, grasas y calorías estimadas aquí.
              </p>
            </div>
          )}

          {loading && (
            <div className="border border-[var(--border)] rounded-3xl p-8 text-center flex flex-col items-center justify-center h-80 sm:h-96 bg-[var(--code-bg)] animate-pulse">
              <RefreshCw className="w-10 h-10 text-[var(--accent)] animate-spin mb-4" />
              <p className="text-base font-bold text-[var(--text-h)]">Procesando imagen de forma segura...</p>
              <p className="text-xs text-[var(--text)] mt-1">El backend está llamando a Gemini para calcular tus macros de forma visual.</p>
            </div>
          )}

          {hasScanned && !loading && (
            <div className="bg-[var(--code-bg)] border border-[var(--border)] p-6 sm:p-8 rounded-3xl shadow-[var(--shadow)] animate-in fade-in slide-in-from-bottom-4 duration-300 w-full space-y-6">
              
              {/* EDITAR SOLO EL NOMBRE DEL PLATO */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">
                  <Edit2 className="w-3 h-3" /> ¿Es correcto el nombre del plato?
                </span>
                <input 
                  type="text"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] text-xl font-black text-[var(--text-h)] rounded-xl px-3 py-2 outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* MARCADORES VISUALES DE MACROS DE LA IA */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                
                <div className="bg-[var(--bg)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
                  <Flame className="w-6 h-6 mx-auto text-red-500 mb-2" />
                  <span className="block text-2xl font-black text-[var(--text-h)]">{macros.calories}</span>
                  <span className="text-xs text-[var(--text)] font-semibold uppercase tracking-wider">Kcal</span>
                </div>

                <div className="bg-[var(--bg)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
                  <Beef className="w-6 h-6 mx-auto text-orange-400 mb-2" />
                  <span className="block text-2xl font-black text-[var(--text-h)]">{macros.protein}g</span>
                  <span className="text-xs text-[var(--text)] font-semibold uppercase tracking-wider">Proteína</span>
                </div>

                <div className="bg-[var(--bg)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
                  <Wheat className="w-6 h-6 mx-auto text-blue-400 mb-2" />
                  <span className="block text-2xl font-black text-[var(--text-h)]">{macros.carbs}g</span>
                  <span className="text-xs text-[var(--text)] font-semibold uppercase tracking-wider">Carbs</span>
                </div>

                <div className="bg-[var(--bg)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
                  <Nut className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
                  <span className="block text-2xl font-black text-[var(--text-h)]">{macros.fat}g</span>
                  <span className="text-xs text-[var(--text)] font-semibold uppercase tracking-wider">Grasa</span>
                </div>

              </div>

              {/* BOTONES DE ACCIÓN PRINCIPALES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={handleResetScan}
                  className="sm:col-span-1 border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition hover:bg-[var(--border)] shadow-sm text-sm"
                >
                  <RotateCcw className="w-4 h-4" /> VOLVER A ESCANEAR
                </button>

                <button
                  onClick={handleConfirmAndSave}
                  disabled={saving}
                  className="sm:col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50 text-sm uppercase tracking-wide"
                >
                  {saving ? <RefreshCw className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                  {saving ? "Registrando..." : "CONFIRMAR Y GUARDAR"}
                </button>
              </div>

            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center pt-4 border-t border-[var(--border)] mt-auto">
        <p className="text-xs text-[var(--text)] font-medium">
          Desarrollado por un Dev Fit 🔥
        </p>
      </footer>
    </div>
  );
}