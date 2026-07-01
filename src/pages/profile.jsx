import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { apiService } from "../services/api";
import { ArrowLeft, Save, LogOut, Scale, Ruler, Calendar, Activity, Target } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estados biométricos a editar
  const [gender, setGender] = useState("masculino");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [activity, setActivity] = useState("moderado");
  const [goal, setGoal] = useState("mantener");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate("/auth");

        const { data} = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (data) {
          setGender(data.gender || "masculino");
          setAge(data.age || "");
          setWeight(data.weight_kg || "");
          setHeight(data.height_cm || "");
          setActivity(data.activity_level || "moderado");
          setGoal(data.fitness_goal || "mantener");
        }
      } catch (err) {
        console.error("Error al cargar perfil:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  // Misma fórmula matemática para recalcular dinámicamente al guardar
  const calculateMacros = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);

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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const targets = calculateMacros();

      // Enviamos la actualización a tu backend de Node.js
      await apiService.saveProfile({
        gender,
        age: parseInt(age),
        weight_kg: parseFloat(weight), 
        height_cm: parseInt(height),
        activity_level: activity,
        fitness_goal: goal,
        ...targets 
      });

      alert("¡Perfil y objetivos actualizados con éxito!");
      navigate("/");
    } catch (err) {
      alert(err.message || "Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("¿Seguro que quieres cerrar sesión?")) {
      await supabase.auth.signOut();
      navigate("/auth");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-gray-400">
        Cargando tus datos...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-h)] px-4 py-8 md:py-12">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* CABECERA DE PERFIL */}
        <div className="flex justify-between items-center">
          <button onClick={() => navigate("/")} className="p-2 border border-[var(--border)] rounded-full bg-[var(--card-bg)] hover:scale-95 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black tracking-tight !m-0">Ajustes de Perfil</h1>
          <button onClick={handleLogout} className="p-2 border border-red-500/20 text-red-500 rounded-full bg-red-500/10 hover:scale-95 transition">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* FORMULARIO EDITABLE */}
        <form onSubmit={handleSave} className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-3xl shadow-[var(--shadow)] flex flex-col gap-5 text-left">
          
          <div>
            <label className="block text-xs font-bold uppercase mb-1 text-gray-400">Sexo Biológico</label>
            <div className="grid grid-cols-2 gap-2">
              {["masculino", "femenino"].map((g) => (
                <button
                  key={g} type="button" onClick={() => setGender(g)}
                  className={`py-2.5 rounded-xl text-xs font-bold border capitalize transition ${gender === g ? "bg-[var(--text-h)] text-[var(--bg)] border-[var(--text-h)]" : "bg-[var(--bg)] border-[var(--border)] text-[var(--text-h)]"}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold uppercase mb-1 text-gray-400">Edad</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-3 w-3.5 h-3.5 text-gray-400" />
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2 pl-8 pr-2 text-xs font-bold outline-none" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1 text-gray-400">Peso (kg)</label>
              <div className="relative">
                <Scale className="absolute left-2.5 top-3 w-3.5 h-3.5 text-gray-400" />
                <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2 pl-8 pr-2 text-xs font-bold outline-none" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1 text-gray-400">Altura</label>
              <div className="relative">
                <Ruler className="absolute left-2.5 top-3 w-3.5 h-3.5 text-gray-400" />
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2 pl-8 pr-2 text-xs font-bold outline-none" required />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1 text-gray-400 flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Actividad</label>
            <select value={activity} onChange={(e) => setActivity(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2.5 px-3 text-xs font-bold text-[var(--text-h)] outline-none">
              <option value="sedentario">Sedentario (Oficina / Poco movimiento)</option>
              <option value="ligero">Ligero (Entreno 1-3 días / Caminas)</option>
              <option value="moderado">Moderado (Entreno 3-5 días intensos)</option>
              <option value="muy_activo">Muy Activo (Trabajo físico duro)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1 text-gray-400 flex items-center gap-1"><Target className="w-3.5 h-3.5" /> Objetivo Fitness</label>
            <select value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2.5 px-3 text-xs font-bold text-[var(--text-h)] outline-none">
              <option value="perder_grasa">Perder Grasa (Definición)</option>
              <option value="mantener">Mantener Peso (Normocalórica)</option>
              <option value="ganar_masa">Ganar Masa Muscular (Volumen)</option>
            </select>
          </div>

          <button 
            type="submit" disabled={saving}
            className="w-full bg-[var(--accent)] text-white font-bold py-3.5 rounded-xl mt-2 transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
          >
            <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar y Recalcular"}
          </button>
        </form>

      </div>
    </div>
  );
}