import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Scale, Zap, Plus, Save, TrendingDown, TrendingUp, Target, LineChart as LineIcon, Loader2, Trash2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine,
} from 'recharts';
import { supabase } from '../services/supabaseClient';
import { apiService } from '../services/api';
import { localDateKey, startOfDayISO, sumByDay, lastNDays, shortDate } from '../utils/dates';
import { calculateTargets } from '../utils/nutrition';
import { inputClass } from '../utils/styles';
import { PageHeader, Card, Modal, FullScreenLoader } from '../components/ui';

const CONSUMPTION_DAYS = 14;
const WEIGHT_LOGS_LIMIT = 60;

const ChartTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-(--card-bg) border border-(--border) p-3 rounded-xl shadow-2xl text-xs flex flex-col gap-1">
      <p className="font-bold text-(--text) border-b border-(--border) pb-1 mb-1">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} style={{ color: item.color }} className="font-semibold">
          {item.name}: <span className="text-(--text-h) font-black">{Number(item.value).toLocaleString('es-ES')} {unit}</span>
        </p>
      ))}
    </div>
  );
};

const Stat = ({ label, value, sub, icon: Icon, tone = 'text-(--text-h)' }) => (
  <div className="bg-(--bg) border border-(--border) rounded-2xl p-3">
    <span className="text-[10px] font-black uppercase tracking-wider text-(--text) flex items-center gap-1">
      {Icon && <Icon className="w-3 h-3" />} {label}
    </span>
    <span className={`text-lg font-black block mt-0.5 ${tone}`}>{value}</span>
    {sub && <span className="text-[10px] text-(--text)">{sub}</span>}
  </div>
);

export default function Evolucion() {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [weightLogs, setWeightLogs] = useState([]);
  const [caloriesByDay, setCaloriesByDay] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formWeight, setFormWeight] = useState('');
  const [formFat, setFormFat] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const [profileData, weightData, mealsRes] = await Promise.all([
        apiService.getProfile(),
        apiService.getWeightLogs(WEIGHT_LOGS_LIMIT).catch((err) => {
          console.error('Error cargando peso:', err);
          return [];
        }),
        supabase
          .from('meals')
          .select('calories, created_at')
          .eq('user_id', userId)
          .gte('created_at', startOfDayISO(CONSUMPTION_DAYS - 1)),
      ]);

      if (mealsRes.error) console.error('Error cargando comidas:', mealsRes.error);

      setProfile(profileData);
      // Pedimos los más recientes y los ordenamos cronológicamente para la gráfica
      setWeightLogs(weightData.slice().reverse());
      setCaloriesByDay(sumByDay(mealsRes.data || [], 'calories'));
    } catch (err) {
      console.error('Error general en carga:', err);
      toast.error('No se pudo cargar tu evolución');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => !cancelled && loadData());
    return () => { cancelled = true; };
  }, [loadData]);

  // Serie de peso con media móvil de 3 registros
  const weightSeries = useMemo(() => {
    const logs = weightLogs.length
      ? weightLogs.map((l) => ({ date: l.date, weight_kg: Number(l.weight_kg) }))
      : profile?.weight_kg
        ? [{ date: localDateKey(), weight_kg: Number(profile.weight_kg) }]
        : [];

    return logs.map((log, i) => {
      const window = logs.slice(Math.max(0, i - 2), i + 1);
      const avg = window.reduce((s, l) => s + l.weight_kg, 0) / window.length;
      return { ...log, dateDisplay: shortDate(log.date), tendency: Number(avg.toFixed(1)) };
    });
  }, [weightLogs, profile]);

  // Últimos 14 días, incluyendo los días sin registros (0 kcal)
  const consumptionSeries = useMemo(
    () => lastNDays(CONSUMPTION_DAYS).map((key) => ({
      date: key,
      dateDisplay: shortDate(key),
      calories: Math.round(caloriesByDay[key] || 0),
    })),
    [caloriesByDay]
  );

  const daysWithData = consumptionSeries.filter((d) => d.calories > 0);
  const avgConsumption = daysWithData.length
    ? Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length)
    : 0;
  const todayCalories = caloriesByDay[localDateKey()] || 0;

  const latestWeight = weightSeries.at(-1)?.weight_kg ?? null;
  const firstWeight = weightSeries[0]?.weight_kg ?? null;
  const weightChange = latestWeight != null && firstWeight != null && weightSeries.length > 1
    ? Number((latestWeight - firstWeight).toFixed(1))
    : null;
  const goalWeight = profile?.weight_goal != null ? Number(profile.weight_goal) : null;
  const toGoal = latestWeight != null && goalWeight != null ? Number((goalWeight - latestWeight).toFixed(1)) : null;
  const caloriesTarget = Number(profile?.calories_target) || null;

  // Ritmo medio en kg/semana entre el primer y el último registro (mín. 7 días de diferencia)
  const spanDays = weightSeries.length > 1
    ? (new Date(weightSeries.at(-1).date) - new Date(weightSeries[0].date)) / 864e5
    : 0;
  const weeklyRate = spanDays >= 7 && weightChange != null ? Number(((weightChange / spanDays) * 7).toFixed(2)) : null;
  const weeksToGoal = weeklyRate && toGoal && Math.sign(weeklyRate) === Math.sign(toGoal)
    ? Math.ceil(Math.abs(toGoal / weeklyRate))
    : null;

  const handleDeleteLog = (log) => {
    toast(`¿Eliminar el registro del ${shortDate(log.date)} (${log.weight_kg} kg)?`, {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await apiService.deleteWeightLog(log.id);
            setWeightLogs((prev) => prev.filter((l) => l.id !== log.id));
            toast.success('Registro eliminado');
          } catch (err) {
            toast.error(err.message);
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
    });
  };

  const handleSaveWeight = async (e) => {
    e.preventDefault();
    const weight = parseFloat(formWeight);
    if (!weight || weight < 30 || weight > 300) return toast.error('Introduce un peso entre 30 y 300 kg');
    const fat = formFat ? parseFloat(formFat) : null;
    if (fat != null && (fat < 2 || fat > 70)) return toast.error('El % de grasa debe estar entre 2 y 70');

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('No hay una sesión activa');

      const { error } = await supabase.from('weight_logs').insert([{
        user_id: userId,
        weight_kg: weight,
        fat_percentage: fat,
        notes: formNotes.trim() || null,
        date: localDateKey(), // fecha LOCAL, no UTC
      }]);
      if (error) throw error;

      // Mantenemos el perfil sincronizado con el último peso y recalculamos los objetivos
      if (profile) {
        const targets = calculateTargets({
          gender: profile.gender,
          age: profile.age,
          weight,
          height: profile.height_cm,
          activity: profile.activity_level,
          goal: profile.fitness_goal,
        });
        try {
          await apiService.updateProfile({ weight_kg: weight, ...(targets || {}) });
        } catch (err) {
          console.warn('No se pudo actualizar el perfil con el nuevo peso.', err);
        }
      }

      toast.success('¡Peso guardado! Tus objetivos se han ajustado a tu nuevo peso');
      setFormWeight('');
      setFormFat('');
      setFormNotes('');
      setShowModal(false);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudo guardar el peso');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <FullScreenLoader message="Sincronizando tu evolución..." />;

  return (
    <div className="min-h-screen bg-(--bg) text-(--text-h) px-4 py-6 md:py-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="Evolución"
          icon={LineIcon}
          right={
            <button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-1.5 bg-(--accent) text-white text-xs font-bold px-3 py-2 rounded-xl hover:opacity-90 transition">
              <Plus className="w-3.5 h-3.5" /> Peso
            </button>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Peso actual" icon={Scale} value={latestWeight != null ? `${latestWeight} kg` : 'Sin datos'} />
          <Stat label="Meta" icon={Target} value={goalWeight != null ? `${goalWeight} kg` : 'Sin meta'}
            sub={toGoal != null ? (toGoal === 0 ? '¡Objetivo alcanzado! 🎉' : `${toGoal > 0 ? '+' : ''}${toGoal} kg para llegar`) : null} />
          <Stat
            label="Cambio"
            icon={weightChange != null && weightChange > 0 ? TrendingUp : TrendingDown}
            value={weightChange != null ? `${weightChange > 0 ? '+' : ''}${weightChange} kg` : '—'}
            sub={weeklyRate != null ? `${weeklyRate > 0 ? '+' : ''}${weeklyRate} kg/semana${weeksToGoal ? ` · meta en ~${weeksToGoal} sem` : ''}` : weightChange != null ? `desde ${shortDate(weightSeries[0].date)}` : 'Registra más pesos'}
          />
          <Stat label="Consumo hoy" icon={Zap} value={`${Math.round(todayCalories).toLocaleString('es-ES')} kcal`}
            sub={caloriesTarget ? `de ${caloriesTarget.toLocaleString('es-ES')} kcal` : null} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* PESO */}
          <Card className="p-5 md:p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-bold text-(--text)">Evolución del peso</h2>
              <p className="text-xs text-(--text) opacity-70">Línea discontinua: media móvil de 3 registros</p>
            </div>

            {weightSeries.length === 0 ? (
              <div className="h-64 rounded-2xl border border-dashed border-(--border) flex flex-col items-center justify-center gap-2">
                <Scale className="w-6 h-6 text-(--text)" />
                <p className="text-sm font-bold">Aún no hay registros de peso</p>
              </div>
            ) : (
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightSeries} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="dateDisplay" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text)' }} />
                    <YAxis width={40} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text)' }}
                      domain={[(min) => Math.floor(Math.min(min, goalWeight ?? min) - 1), (max) => Math.ceil(Math.max(max, goalWeight ?? max) + 1)]} />
                    <Tooltip content={<ChartTooltip unit="kg" />} />
                    {goalWeight != null && (
                      <ReferenceLine y={goalWeight} stroke="#10b981" strokeDasharray="4 4"
                        label={{ value: 'Meta', position: 'insideTopRight', fill: '#10b981', fontSize: 10 }} />
                    )}
                    <Line type="monotone" dataKey="weight_kg" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }} activeDot={{ r: 6 }} name="Peso" />
                    <Line type="monotone" dataKey="tendency" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Tendencia" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {weightLogs.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-(--text)">Últimos registros</h3>
                <ul className="divide-y divide-(--border) border border-(--border) rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                  {[...weightLogs].reverse().slice(0, 15).map((log, i, arr) => {
                    const prev = arr[i + 1];
                    const diff = prev ? Number((log.weight_kg - prev.weight_kg).toFixed(1)) : null;
                    return (
                      <li key={log.id ?? log.date} className="flex items-center justify-between gap-3 px-3 py-2 bg-(--bg) text-xs">
                        <div className="min-w-0">
                          <span className="font-bold text-(--text-h)">{shortDate(log.date)}</span>
                          {log.notes && <span className="text-(--text) ml-2 truncate">· {log.notes}</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {log.fat_percentage != null && <span className="text-(--text)">{log.fat_percentage}% grasa</span>}
                          {diff != null && diff !== 0 && (
                            <span className={`font-bold ${diff < 0 ? 'text-emerald-500' : 'text-orange-500'}`}>{diff > 0 ? '+' : ''}{diff}</span>
                          )}
                          <span className="font-black text-(--text-h)">{log.weight_kg} kg</span>
                          {log.id && (
                            <button type="button" onClick={() => handleDeleteLog(log)} aria-label={`Eliminar registro del ${shortDate(log.date)}`} className="p-1 rounded-md text-(--text) hover:text-red-500 hover:bg-red-500/10">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Card>

          {/* CONSUMO */}
          <Card className="p-5 md:p-6 flex flex-col gap-4">
            <div className="flex justify-between items-start gap-3">
              <div>
                <h2 className="text-sm font-bold text-(--text)">Calorías diarias (últimos {CONSUMPTION_DAYS} días)</h2>
                <p className="text-xs text-(--text) opacity-70">Línea roja: tu objetivo diario</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase text-(--text) block">Media</span>
                <span className="text-sm font-black">{avgConsumption.toLocaleString('es-ES')} kcal</span>
              </div>
            </div>

            {daysWithData.length === 0 ? (
              <div className="h-64 rounded-2xl border border-dashed border-(--border) flex flex-col items-center justify-center gap-2">
                <Zap className="w-6 h-6 text-(--text)" />
                <p className="text-sm font-bold">Sin registros de comidas</p>
              </div>
            ) : (
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consumptionSeries} margin={{ top: 15, right: 15, left: -8, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="dateDisplay" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text)' }} interval="preserveStartEnd" />
                    <YAxis width={44} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1).replace(".0", "")}k` : v)} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text)' }}
                      domain={[0, (max) => Math.ceil(Math.max(max, caloriesTarget || 0) * 1.1)]} />
                    <Tooltip content={<ChartTooltip unit="kcal" />} cursor={{ fill: 'var(--accent-bg)' }} />
                    {caloriesTarget > 100 && <ReferenceLine y={caloriesTarget} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} />}
                    <Bar dataKey="calories" fill="var(--accent)" radius={[6, 6, 0, 0]} name="Calorías" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Añadir peso de hoy" icon={Scale}>
        <form onSubmit={handleSaveWeight} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-(--text) block">PESO (KG) *</span>
            <input type="number" inputMode="decimal" step="0.01" placeholder="Ej: 74.2" required autoFocus value={formWeight} onChange={(e) => setFormWeight(e.target.value)} className={`${inputClass} text-base`} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-(--text) block">% GRASA CORPORAL (OPCIONAL)</span>
            <input type="number" inputMode="decimal" step="0.1" placeholder="Ej: 14.5" value={formFat} onChange={(e) => setFormFat(e.target.value)} className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-(--text) block">NOTAS</span>
            <input type="text" maxLength={200} placeholder="Ej: En ayunas" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className={inputClass} />
          </label>
          <button type="submit" disabled={submitting} className="w-full bg-(--accent) text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {submitting ? 'Guardando...' : 'GUARDAR REGISTRO'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
