import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { ArrowLeft, Scale, Zap, Info, Plus, X, Save } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts';
import { toast } from 'sonner';

// Componente Tooltip Personalizado para asegurar visibilidad absoluta delante de las barras
const CustomTooltip = ({ active, payload, label, unit = "" }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl z-50 pointer-events-none text-xs flex flex-col gap-1">
        <p className="font-bold text-gray-400 border-b border-slate-700 pb-1 mb-1">Fecha: {label}</p>
        {payload.map((item, index) => (
          <p key={index} style={{ color: item.color || 'var(--accent)' }} className="font-semibold">
            {item.name}: <span className="text-white font-black">{item.value.toLocaleString()} {unit}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Evolucion() {
  const navigate = useNavigate();
  
  // ESTADOS PRINCIPALES
  const [isLoading, setIsLoading] = useState(true);
  const [weightData, setWeightData] = useState([]);
  const [consumptionData, setConsumptionData] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  // ESTADOS PARA EL MODAL DE AGREGAR PESO
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formWeight, setFormWeight] = useState("");
  const [formFat, setFormFat] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const fetchEvolucionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/auth");

      // 1. Obtener el perfil del usuario
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (profileError) {
        console.warn("Aviso en user_profiles:", profileError.message);
      } else {
        setUserProfile(profileData);
      }

      // 2. Obtener historial de Peso
      const { data: weightLogs, error: weightError } = await supabase
        .from("weight_logs")
        .select("date, weight_kg")
        .eq("user_id", user.id)
        .order("date", { ascending: true })
        .limit(30);
      
      if (weightError) console.error("Error cargando peso:", weightError);
      
      let formattedWeight = (weightLogs || []).map(log => ({
        ...log,
        dateDisplay: log.date ? log.date.split('-')[2] + '/' + log.date.split('-')[1] : ''
      }));

      const backupWeight = profileData?.current_weight || profileData?.weight || null;
      if (formattedWeight.length === 0 && backupWeight) {
        formattedWeight = [{
          date: new Date().toISOString().split('T')[0],
          dateDisplay: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
          weight_kg: parseFloat(backupWeight),
          isProfileFallback: true
        }];
      }
      setWeightData(formattedWeight);

      // 3. Obtener Historial de Consumo (Últimos 14 días)
      const { data: mealsLogs, error: mealsError } = await supabase
        .from("meals")
        .select("calories, created_at")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

      if (mealsError) console.error("Error cargando comidas:", mealsError);

      const groupedConsumption = (mealsLogs || []).reduce((acc, meal) => {
        if (meal.created_at) {
          const date = meal.created_at.split('T')[0];
          acc[date] = (acc[date] || 0) + meal.calories;
        }
        return acc;
      }, {});

      const formattedConsumption = Object.entries(groupedConsumption).map(([date, calories]) => ({
        date,
        dateDisplay: date.split('-')[2] + '/' + date.split('-')[1],
        calories
      })).sort((a, b) => new Date(a.date) - new Date(b.date));

      setConsumptionData(formattedConsumption);

    } catch (err) {
      console.error("Error general en carga:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (isMounted) await fetchEvolucionData();
    };
    loadData();
    return () => { isMounted = false; };
  }, [navigate]);

  const handleSaveWeight = async (e) => {
    e.preventDefault();
    if (!formWeight) return toast.error("Por favor, introduce tu peso");

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/auth");

      const { error } = await supabase.from("weight_logs").insert([
        {
          user_id: user.id,
          weight_kg: parseFloat(formWeight),
          fat_percentage: formFat ? parseFloat(formFat) : null,
          notes: formNotes || null,
          date: new Date().toISOString().split('T')[0]
        }
      ]);

      if (error) throw error;

      try {
        await supabase
          .from("user_profiles")
          .update({ current_weight: parseFloat(formWeight) })
          .eq("user_id", user.id);
      } catch (e) {
        console.log("No se pudo actualizar user_profiles.",e);
      }

      toast.success("¡Peso guardado correctamente!");
      setFormWeight("");
      setFormFat("");
      setFormNotes("");
      setShowModal(false);
      
      setIsLoading(true);
      fetchEvolucionData();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo guardar el peso");
    } finally {
      setSubmitting(false);
    }
  };

  // Calcular tendencia
  const weightDataWithTendency = weightData.map((log, index) => {
    if (log.isProfileFallback) return { ...log, tendency: log.weight_kg };
    const windowSize = 3; 
    if (index < windowSize - 1) return { ...log, tendency: log.weight_kg };
    const windowLogs = weightData.slice(index - windowSize + 1, index + 1);
    const sum = windowLogs.reduce((acc, current) => acc + current.weight_kg, 0);
    return { ...log, tendency: parseFloat((sum / windowLogs.length).toFixed(1)) };
  });

  const avgWeeklyConsumption = consumptionData.length > 0
    ? (consumptionData.reduce((acc, day) => acc + day.calories, 0) / consumptionData.length).toFixed(0)
    : 0;

  const userProfileWeight = userProfile?.current_weight || userProfile?.weight || null;
  const latestWeightDisplay = weightData.length > 0 
    ? `${weightData[weightData.length - 1].weight_kg} kg` 
    : userProfileWeight 
      ? `${userProfileWeight} kg` 
      : "Sin datos";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--text)]">
        <span className="animate-pulse font-medium">Sincronizando tu evolución histórica...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-h)] px-4 py-6 md:py-10 font-sans relative">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-center bg-[var(--code-bg)] border border-[var(--border)] p-3 rounded-2xl">
          <button onClick={() => navigate("/")} className="p-2.5 border border-[var(--border)] rounded-xl bg-[var(--bg)] hover:bg-[var(--border)] transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-black tracking-tight uppercase flex items-center gap-2">EVOLUCIÓN Y METRICAS 📈</span>
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
             <Scale className="w-4 h-4 text-[var(--accent)]"/>
             <span className="text-xs font-bold">{latestWeightDisplay}</span>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* SECCIÓN PESO */}
          <div className="bg-[var(--code-bg)] border border-[var(--border)] p-5 md:p-6 rounded-3xl shadow-[var(--shadow)] flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-gray-400">Peso actual detectado</h3>
                <h2 className="text-3xl font-black text-[var(--text-h)] tracking-tighter">{latestWeightDisplay}</h2>
              </div>
              <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 bg-[var(--accent)] text-white text-xs font-bold px-3 py-2 rounded-xl hover:opacity-90 transition">
                <Plus className="w-3.5 h-3.5" /> Nuevo Registro
              </button>
            </div>

            <div className="w-full h-72 rounded-2xl p-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightDataWithTendency} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.2}/>
                  <XAxis dataKey="dateDisplay" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text)'}} />
                  <YAxis hide={false} width={40} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text)'}} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip content={<CustomTooltip unit="kg" />} wrapperStyle={{ zIndex: 100 }} />
                  <Line type="monotone" dataKey="weight_kg" stroke="var(--accent)" strokeWidth={3} dot={{ r: 5, fill: 'var(--accent)', strokeWidth: 0 }} activeDot={{ r: 7 }} name="Peso" />
                  <Line type="monotone" dataKey="tendency" stroke="orange" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Tendencia" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex items-center gap-3 bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)]">
              <Info className="w-4 h-4 text-[var(--text)] flex-shrink-0" />
              <p className="text-xs text-[var(--text)] font-medium">Los datos se actualizan dinámicamente usando tus registros.</p>
            </div>
          </div>

          {/* SECCIÓN NUTRICIONAL */}
          <div className="space-y-6">
            <div className="bg-[var(--code-bg)] border border-[var(--border)] p-5 md:p-6 rounded-3xl shadow-[var(--shadow)] grid grid-cols-2 gap-4 items-center">
              <div>
                <span className="text-xs font-bold text-gray-400">Consumo Hoy</span>
                <span className="text-2xl font-black text-[var(--text-h)] block mt-1">
                  {consumptionData.length > 0 ? `${consumptionData[consumptionData.length - 1].calories.toLocaleString()} kcal` : "0 kcal"}
                </span>
              </div>
              <div className="border-l border-[var(--border)] pl-4">
                <span className="text-xs font-bold text-gray-400">Media Semanal</span>
                <span className="text-2xl font-black text-[var(--text-h)] block mt-1">{parseInt(avgWeeklyConsumption).toLocaleString()} kcal</span>
              </div>
            </div>

            <div className="bg-[var(--code-bg)] border border-[var(--border)] p-5 md:p-6 rounded-3xl shadow-[var(--shadow)] flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-400">Calorías Diarias (Últimos 14 Días)</h3>
                <h2 className="text-2xl font-black text-[var(--text-h)] tracking-tighter">Historial Nutricional</h2>
              </div>
              
              {consumptionData.length === 0 ? (
                <div className="w-full h-64 rounded-2xl border border-dashed border-[var(--border)] flex flex-col items-center justify-center p-6 text-center gap-2 bg-[var(--bg)]/50">
                  <Zap className="w-6 h-6 text-gray-500" />
                  <p className="text-sm font-bold text-[var(--text-h)]">Sin registros de comidas</p>
                </div>
              ) : (
                <div className="w-full h-64 rounded-2xl p-1">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={consumptionData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                          <XAxis dataKey="dateDisplay" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text)'}}/>
                          <YAxis hide={false} width={40} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text)'}} domain={[0, 'dataMax + 300']} />
                          <Tooltip content={<CustomTooltip unit="kcal" />} wrapperStyle={{ zIndex: 100 }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                          {userProfile?.calories_target && Number(userProfile.calories_target) > 100 && (
                              <ReferenceLine y={Number(userProfile.calories_target)} stroke="#ff4444" strokeDasharray="4 4" strokeWidth={1.5} />
                          )}
                          <Bar dataKey="calories" fill="var(--accent)" radius={[6, 6, 0, 0]} name="Calorías" activeBar={{ fill: '#b966ff', stroke: '#ffffff', strokeWidth: 1 }}/>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveWeight} className="bg-[var(--code-bg)] border border-[var(--border)] w-full max-w-md p-6 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="font-bold text-lg text-[var(--text-h)]">Añadir Peso de Hoy</h3>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-full text-[var(--text)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 block">PESO (KG) *</label>
              <input type="number" step="0.01" placeholder="Ej: 74.2" required value={formWeight} onChange={(e) => setFormWeight(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] text-base font-bold text-[var(--text-h)] rounded-xl px-3 py-2 outline-none focus:border-[var(--accent)]"/>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 block">% GRASA CORPORAL (OPCIONAL)</label>
              <input type="number" step="0.1" placeholder="Ej: 14.5" value={formFat} onChange={(e) => setFormFat(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] text-base font-bold text-[var(--text-h)] rounded-xl px-3 py-2 outline-none focus:border-[var(--accent)]"/>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 block">NOTAS INTERNAS</label>
              <input type="text" placeholder="Ej: En ayunas" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] text-sm rounded-xl px-3 py-2 outline-none focus:border-[var(--accent)]"/>
            </div>

            <button type="submit" disabled={submitting} className="w-full bg-[var(--accent)] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {submitting ? "Guardando..." : "GUARDAR REGISTRO"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}