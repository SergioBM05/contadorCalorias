import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { apiService } from "../services/api";
import { toast } from 'sonner';
import { 
  ArrowLeft, Save, LogOut, Scale, Ruler, Calendar, 
  Flame, Dumbbell, Utensils, Zap
} from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estados biométricos a editar
  const [gender, setGender] = useState("masculino");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [weightGoal, setWeightGoal] = useState("");
  const [activity, setActivity] = useState("moderado");
  const [goal, setGoal] = useState("mantener");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate("/auth");

        const { data } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (data) {
          setGender(data.gender || "masculino");
          setAge(data.age || "");
          setWeight(data.weight_kg || "");
          setHeight(data.height_cm || "");
          setWeightGoal(data.weight_goal ?? "");
          setActivity(data.activity_level || "moderado");
          setGoal(data.fitness_goal || "mantener");
        }
      } catch (err) {
        console.error("Error al cargar perfil:", err.message);
        toast.error("No se pudieron cargar tus datos de perfil");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  // Fórmula matemática para recalcular dinámicamente
  const calculateMacros = () => {
    const w = parseFloat(weight) || 0;
    const h = parseFloat(height) || 0;
    const a = parseInt(age) || 0;

    if (!w || !h || !a) return { calories_target: 0 };

    let bmr = 10 * w + 6.25 * h - 5 * a;
    bmr = gender === "masculino" ? bmr + 5 : bmr - 161;

    const activityMultipliers = {
      sedentario: 1.2,
      ligero: 1.375,
      moderado: 1.55,
      muy_activo: 1.725
    };
    const factor = activityMultipliers[activity] || 1.2;
    let tdee = bmr * factor;

    if (goal === "perder_grasa") tdee -= 400;
    else if (goal === "ganar_masa") tdee += 350;

    const calories_target = Math.round(tdee);
    const protein_target = Math.round(w * 2); 
    const fat_target = Math.round(w * 0.9);    
    const carbs_target = Math.round((calories_target - (protein_target * 4) - (fat_target * 9)) / 4);

    return { calories_target, protein_target, carbs_target, fat_target };
  };

  const currentCalories = calculateMacros().calories_target;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!age || !weight || !height || !weightGoal) return toast.warning("Rellena todos los campos físicos y tu peso objetivo");
    setSaving(true);

    const updatePromise = async () => {
      const targets = calculateMacros();
      return await apiService.saveProfile({
        gender,
        age: parseInt(age),
        weight_kg: parseFloat(weight), 
        height_cm: parseInt(height),
        activity_level: activity,
        fitness_goal: goal,
        weight_goal: parseFloat(weightGoal),
        ...targets 
      });
    };

    toast.promise(updatePromise(), {
      loading: 'Actualizando tus parámetros en el servidor...',
      success: () => {
        setSaving(false);
        setTimeout(() => navigate("/"), 800);
        return '¡Perfil y macros actualizados correctamente! 🚀';
      },
      error: (err) => {
        setSaving(false);
        return err.message || 'Error al actualizar el perfil';
      }
    });
  };

  const handleLogout = () => {
    toast('¿Seguro que quieres cerrar sesión?', {
      action: {
        label: 'Cerrar Sesión',
        onClick: async () => {
          await supabase.auth.signOut();
          toast.success("Sesión cerrada");
          navigate("/auth");
        }
      },
      cancel: { label: 'Cancelar', onClick: () => {} }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--text)]">
        <span className="animate-pulse font-medium">Cargando tus datos de atleta...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-h)] px-4 py-6 md:py-10 font-sans">
      <div className="max-w-md mx-auto space-y-5">
        
        {/* HEADER PREMIUM */}
        <div className="flex justify-between items-center bg-[var(--code-bg)] border border-[var(--border)] p-3 rounded-2xl">
          <button onClick={() => navigate("/")} className="p-2.5 border border-[var(--border)] rounded-xl bg-[var(--bg)] hover:bg-[var(--border)] transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-black tracking-tight uppercase">Tu Perfil Cal AI</span>
          <button type="button" onClick={handleLogout} className="p-2.5 border border-red-500/20 text-red-400 rounded-xl bg-red-500/5 hover:bg-red-500/10 transition">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <form onSubmit={handleSave} className="bg-[var(--code-bg)] border border-[var(--border)] p-5 sm:p-6 rounded-3xl shadow-[var(--shadow)] flex flex-col gap-5 text-left">
          
          {/* SEXO BIOLÓGICO */}
          <div>
            <label className="block text-xs font-black uppercase mb-2 text-[var(--text)] tracking-wider">Sexo Biológico</label>
            <div className="grid grid-cols-2 gap-2 bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)]">
              {["masculino", "femenino"].map((g) => (
                <button
                  key={g} type="button" onClick={() => setGender(g)}
                  className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                    gender === g 
                      ? "bg-[var(--accent)] text-white shadow-sm font-black" 
                      : "text-[var(--text)] hover:text-[var(--text-h)]"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* MÉTRICAS NUMÉRICAS */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-black uppercase mb-1 text-[var(--text)] tracking-wider">Edad</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-3.5 h-3.5 text-[var(--text)]" />
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2.5 pl-9 pr-2 text-xs font-bold text-[var(--text-h)] outline-none focus:border-[var(--accent)]" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-1 text-[var(--text)] tracking-wider">Peso (kg)</label>
              <div className="relative">
                <Scale className="absolute left-3 top-3 w-3.5 h-3.5 text-[var(--text)]" />
                <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2.5 pl-9 pr-2 text-xs font-bold text-[var(--text-h)] outline-none focus:border-[var(--accent)]" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-1 text-[var(--text)] tracking-wider">Altura (cm)</label>
              <div className="relative">
                <Ruler className="absolute left-3 top-3 w-3.5 h-3.5 text-[var(--text)]" />
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2.5 pl-9 pr-2 text-xs font-bold text-[var(--text-h)] outline-none focus:border-[var(--accent)]" required />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <label className="block text-xs font-black uppercase mb-2 text-[var(--text)] tracking-wider">Peso Objetivo (kg)</label>
            <div className="relative">
              <Scale className="absolute left-3 top-3 w-3.5 h-3.5 text-[var(--text)]" />
              <input type="number" step="0.1" value={weightGoal} onChange={(e) => setWeightGoal(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2.5 pl-9 pr-2 text-xs font-bold text-[var(--text-h)] outline-none focus:border-[var(--accent)]" required />
            </div>
            <p className="text-[10px] text-[var(--text)] mt-2">Tu meta de peso se usará en el dashboard, la evolución y el planner de dieta.</p>
          </div>

          {/* NIVEL DE ACTIVIDAD */}
          <div>
            <label className="block text-xs font-black uppercase mb-2 text-[var(--text)] tracking-wider">Nivel de Actividad Diaria</label>
            <div className="flex flex-col gap-2">
              {[
                { id: 'sedentario', name: 'Sedentario', desc: 'Poco o ningún ejercicio' },
                { id: 'ligero', name: 'Ligero', desc: 'Ejercicio 1-3 días a la semana' },
                { id: 'moderado', name: 'Moderado', desc: 'Entrenamientos duros 3-5 días' },
                { id: 'muy_activo', name: 'Muy Activo', desc: 'Atleta o trabajo físico pesado' },
              ].map((act) => (
                <button
                  key={act.id} type="button" onClick={() => setActivity(act.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex justify-between items-center ${
                    activity === act.id 
                      ? "bg-[var(--accent-bg)] border-[var(--accent)]" 
                      : "bg-[var(--bg)] border-[var(--border)] hover:border-[var(--text)]"
                  }`}
                >
                  <div>
                    <span className={`text-xs block font-black ${activity === act.id ? "text-[var(--accent)]" : "text-[var(--text-h)]"}`}>{act.name}</span>
                    <span className="text-[10px] text-[var(--text)]">{act.desc}</span>
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${activity === act.id ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border)]"}`}>
                    {activity === act.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* OBJETIVO FITNESS */}
          <div>
            <label className="block text-xs font-black uppercase mb-2 text-[var(--text)] tracking-wider">Objetivo Actual</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'perder_grasa', label: 'Perder Grasa (Definición)', icon: Flame, color: 'text-red-500 bg-red-500/10' },
                { id: 'mantener', label: 'Mantener Peso (Mantenimiento)', icon: Utensils, color: 'text-blue-500 bg-blue-500/10' },
                { id: 'ganar_masa', label: 'Ganar Masa (Volumen)', icon: Dumbbell, color: 'text-amber-500 bg-amber-500/10' },
              ].map((obj) => {
                const Icon = obj.icon;
                return (
                  <button
                    key={obj.id} type="button" onClick={() => setGoal(obj.id)}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      goal === obj.id 
                        ? "bg-[var(--accent-bg)] border-[var(--accent)] shadow-sm" 
                        : "bg-[var(--bg)] border-[var(--border)] hover:border-[var(--text)]"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${obj.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-xs font-black ${goal === obj.id ? "text-[var(--accent)]" : "text-[var(--text-h)]"}`}>
                      {obj.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LIVE PREVIEW DE CALORÍAS (ESTILO CAL AI) */}
          {currentCalories > 0 && (
            <div className="bg-[var(--bg)] border border-dashed border-[var(--border)] p-3 rounded-xl flex items-center justify-between mt-1 animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-[var(--text)]">Tu nuevo objetivo estimado:</span>
              </div>
              <span className="text-sm font-black text-[var(--accent)]">{currentCalories} kcal</span>
            </div>
          )}

          {/* BOTÓN DE GUARDADO */}
          <button 
            type="submit" disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl mt-2 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg uppercase text-xs tracking-wider"
          >
            <Save className="w-4 h-4" /> {saving ? "Guardando cambios..." : "Guardar y Actualizar Macros"}
          </button>
        </form>

      </div>
    </div>
  );
}