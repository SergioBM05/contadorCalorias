import { useState, useRef } from 'react';
import { analyzeMealImage } from '../services/aiService'; // Asegúrate de que la ruta suba bien una carpeta
import { Camera, Flame, Beef, Wheat, Nut, RefreshCw, Upload, Sparkles } from 'lucide-react';

export default function Scanner() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const data = await analyzeMealImage(image);
      setResult(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between px-6 md:px-12 pb-8 text-left font-sans">
      
      {/* Header */}
      <header className="py-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="!my-0 font-black tracking-tight text-4xl sm:text-5xl bg-gradient-to-r from-[var(--text-h)] to-[var(--accent)] bg-clip-text text-transparent">
            MEALSCAN AI
          </h1>
          <p className="text-sm mt-2 text-[var(--text)]">
            Analiza tus macros al instante usando visión artificial.
          </p>
        </div>
        
        <div className="self-start sm:self-center flex items-center gap-2 bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[var(--accent)] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Modo DevFit v1.0
        </div>
      </header>

      {/* Grid de Contenido */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 my-8 items-start">
        
        {/* Columna Izquierda */}
        <div className="w-full flex flex-col gap-4">
          <h2 className="!mb-2 font-bold text-[var(--text-h)]">1. Captura tu plato</h2>
          
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
                Soporta capturas directas desde la cámara de tu móvil o archivos de PC.
              </p>
              <button className="mt-4 flex items-center gap-2 text-xs font-bold bg-[var(--bg)] border border-[var(--border)] text-[var(--text-h)] px-4 py-2 rounded-xl shadow-sm">
                <Upload className="w-3.5 h-3.5" /> Examinar archivos
              </button>
            </div>
          ) : (
            <div className="relative rounded-3xl overflow-hidden border border-[var(--border)] bg-[var(--code-bg)] shadow-[var(--shadow)]">
              <img src={image} alt="Plato" className="w-full h-80 sm:h-96 object-cover" />
              <button 
                onClick={() => { setImage(null); setResult(null); }}
                className="absolute top-4 right-4 bg-black/80 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition"
              >
                Cambiar imagen
              </button>
            </div>
          )}

          <input 
            type="file" accept="image/*" capture="environment" 
            ref={fileInputRef} onChange={handleCapture} className="hidden" 
          />

          {image && !result && (
            <button
              onClick={handleScan}
              disabled={loading}
              className="w-full bg-[var(--accent)] hover:opacity-90 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50 text-base"
            >
              {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Flame className="w-5 h-5" />}
              {loading ? "Calculando macros con IA..." : "ANALIZAR CALORÍAS"}
            </button>
          )}
        </div>

        {/* Columna Derecha */}
        <div className="w-full h-full flex flex-col justify-start">
          <h2 className="!mb-2 font-bold text-[var(--text-h)]">2. Desglose Nutricional</h2>
          
          {!result && !loading && (
            <div className="border border-[var(--border)] rounded-3xl p-8 text-center text-[var(--text)] flex flex-col items-center justify-center h-80 sm:h-96 bg-[var(--bg)] bg-opacity-40">
              <p className="text-sm max-w-xs">
                Saca o sube una captura para ver el análisis detallado de proteínas, carbohidratos, grasas y calorías estimadas aquí.
              </p>
            </div>
          )}

          {loading && (
            <div className="border border-[var(--border)] rounded-3xl p-8 text-center flex flex-col items-center justify-center h-80 sm:h-96 bg-[var(--code-bg)] animate-pulse">
              <RefreshCw className="w-10 h-10 text-[var(--accent)] animate-spin mb-4" />
              <p className="text-base font-bold text-[var(--text-h)]">Procesando imagen...</p>
              <p className="text-xs text-[var(--text)] mt-1">La IA está estimando los pesos y volúmenes de los alimentos.</p>
            </div>
          )}

          {result && (
            <div className="bg-[var(--code-bg)] border border-[var(--border)] p-6 sm:p-8 rounded-3xl shadow-[var(--shadow)] animate-in fade-in slide-in-from-bottom-4 duration-300 w-full">
              <div className="flex justify-between items-start border-b border-[var(--border)] pb-4 mb-6">
                <div>
                  <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest block mb-1">
                    Plato Identificado
                  </span>
                  <h2 className="!my-0 text-2xl font-black text-[var(--text-h)]">
                    {result.dish}
                  </h2>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-[var(--bg)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
                  <Flame className="w-6 h-6 mx-auto text-red-500 mb-2" />
                  <span className="block text-2xl font-black text-[var(--text-h)]">{result.calories}</span>
                  <span className="text-xs text-[var(--text)] font-semibold uppercase tracking-wider">Kcal</span>
                </div>
                
                <div className="bg-[var(--bg)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
                  <Beef className="w-6 h-6 mx-auto text-orange-400 mb-2" />
                  <span className="block text-2xl font-black text-[var(--text-h)]">{result.protein}g</span>
                  <span className="text-xs text-[var(--text)] font-semibold uppercase tracking-wider">Proteína</span>
                </div>
                
                <div className="bg-[var(--bg)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
                  <Wheat className="w-6 h-6 mx-auto text-blue-400 mb-2" />
                  <span className="block text-2xl font-black text-[var(--text-h)]">{result.carbs}g</span>
                  <span className="text-xs text-[var(--text)] font-semibold uppercase tracking-wider">Carbs</span>
                </div>
                
                <div className="bg-[var(--bg)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
                  <Nut className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
                  <span className="block text-2xl font-black text-[var(--text-h)]">{result.fat}g</span>
                  <span className="text-xs text-[var(--text)] font-semibold uppercase tracking-wider">Grasa</span>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-bg)] text-xs text-[var(--text-h)] text-center font-medium">
                💡 Los valores son estimaciones basadas en volumen visual. Ajusta las porciones si lo consideras necesario.
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="text-center pt-4 border-t border-[var(--border)] mt-auto">
        <p className="text-xs text-[var(--text)] font-medium">
          Desarrollado por un Dev Fit 🔥 — Conectado a Gemini Vision
        </p>
      </footer>
    </div>
  );
}