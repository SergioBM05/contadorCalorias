import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, LogOut, Scale, Ruler, Calendar, Flame, Dumbbell, Utensils, Zap, User, Loader2, Target } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { apiService } from '../services/api';
import { ACTIVITY_OPTIONS, buildProfilePayload, calculateTargets, validateBiometrics } from '../utils/nutrition';
import { PageHeader, Card, FullScreenLoader } from '../components/ui';

const GOALS = [
  { id: 'perder_grasa', label: 'Perder grasa (definición)', icon: Flame, color: 'text-red-500 bg-red-500/10' },
  { id: 'mantener', label: 'Mantener peso (mantenimiento)', icon: Utensils, color: 'text-blue-500 bg-blue-500/10' },
  { id: 'ganar_masa', label: 'Ganar masa (volumen)', icon: Dumbbell, color: 'text-amber-500 bg-amber-500/10' },
];

const fieldClass = 'w-full bg-(--bg) border border-(--border) rounded-xl py-2.5 pl-9 pr-2 text-sm font-bold text-(--text-h) outline-none focus:border-(--accent)';

const IconInput = ({ label, icon: Icon, ...props }) => (
  <label className="block">
    <span className="block text-[10px] font-black uppercase mb-1 text-(--text) tracking-wider">{label}</span>
    <span className="relative block">
      <Icon className="absolute left-3 top-3 w-3.5 h-3.5 text-(--text)" />
      <input type="number" className={fieldClass} required {...props} />
    </span>
  </label>
);

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');

  const [gender, setGender] = useState('masculino');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [weightGoal, setWeightGoal] = useState('');
  const [activity, setActivity] = useState('moderado');
  const [goal, setGoal] = useState('mantener');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data: { session } }, data] = await Promise.all([supabase.auth.getSession(), apiService.getProfile()]);
        if (cancelled) return;
        setEmail(session?.user?.email || '');
        if (data) {
          setGender(data.gender || 'masculino');
          setAge(data.age ?? '');
          setWeight(data.weight_kg ?? '');
          setHeight(data.height_cm ?? '');
          setWeightGoal(data.weight_goal ?? '');
          setActivity(data.activity_level || 'moderado');
          setGoal(data.fitness_goal || 'mantener');
        }
      } catch (err) {
        console.error('Error al cargar perfil:', err);
        toast.error('No se pudieron cargar tus datos de perfil');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const preview = calculateTargets({ gender, age, weight, height, activity, goal });

  const handleSave = async (e) => {
    e.preventDefault();
    const error = validateBiometrics({ age, weight, height, weightGoal });
    if (error) return toast.warning(error);

    setSaving(true);
    try {
      await apiService.saveProfile(buildProfilePayload({ gender, age, weight, height, activity, goal, weightGoal }));
      toast.success('¡Perfil y macros actualizados! 🚀');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    toast('¿Seguro que quieres cerrar sesión?', {
      action: {
        label: 'Cerrar sesión',
        onClick: async () => {
          await supabase.auth.signOut();
          toast.success('Sesión cerrada');
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
    });
  };

  if (loading) return <FullScreenLoader message="Cargando tus datos de atleta..." />;

  return (
    <div className="min-h-screen bg-(--bg) text-(--text-h) px-4 py-6 md:py-10 font-sans">
      <div className="max-w-md mx-auto space-y-5">
        <PageHeader
          title="Tu perfil"
          icon={User}
          right={
            <button type="button" onClick={handleLogout} aria-label="Cerrar sesión" className="p-2.5 border border-red-500/20 text-red-500 rounded-xl bg-red-500/5 hover:bg-red-500/10 transition">
              <LogOut className="w-4 h-4" />
            </button>
          }
        />

        {email && <p className="text-xs text-(--text) px-1 -mt-2 truncate">Sesión iniciada como <b className="text-(--text-h)">{email}</b></p>}

        <Card className="p-5 sm:p-6">
          <form onSubmit={handleSave} className="flex flex-col gap-5 text-left">
            {/* SEXO */}
            <div>
              <span className="block text-xs font-black uppercase mb-2 text-(--text) tracking-wider">Sexo biológico</span>
              <div className="grid grid-cols-2 gap-2 bg-(--bg) p-1 rounded-xl border border-(--border)" role="radiogroup">
                {['masculino', 'femenino'].map((g) => (
                  <button
                    key={g} type="button" role="radio" aria-checked={gender === g} onClick={() => setGender(g)}
                    className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${gender === g ? 'bg-(--accent) text-white shadow-sm font-black' : 'text-(--text) hover:text-(--text-h)'}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* MÉTRICAS */}
            <div className="grid grid-cols-2 gap-3">
              <IconInput label="Edad" icon={Calendar} inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
              <IconInput label="Altura (cm)" icon={Ruler} inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} />
              <IconInput label="Peso (kg)" icon={Scale} inputMode="decimal" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
              <IconInput label="Peso objetivo (kg)" icon={Target} inputMode="decimal" step="0.1" value={weightGoal} onChange={(e) => setWeightGoal(e.target.value)} />
            </div>

            {/* ACTIVIDAD */}
            <div>
              <span className="block text-xs font-black uppercase mb-2 text-(--text) tracking-wider">Nivel de actividad diaria</span>
              <div className="flex flex-col gap-2" role="radiogroup">
                {ACTIVITY_OPTIONS.map((act) => (
                  <button
                    key={act.id} type="button" role="radio" aria-checked={activity === act.id} onClick={() => setActivity(act.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex justify-between items-center ${activity === act.id ? 'bg-(--accent-bg) border-(--accent)' : 'bg-(--bg) border-(--border) hover:border-(--text)'}`}
                  >
                    <div>
                      <span className={`text-xs block font-black ${activity === act.id ? 'text-(--accent)' : 'text-(--text-h)'}`}>{act.label}</span>
                      <span className="text-[10px] text-(--text)">{act.desc}</span>
                    </div>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${activity === act.id ? 'border-(--accent) bg-(--accent)' : 'border-(--border)'}`}>
                      {activity === act.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* OBJETIVO */}
            <div>
              <span className="block text-xs font-black uppercase mb-2 text-(--text) tracking-wider">Objetivo actual</span>
              <div className="grid grid-cols-1 gap-2" role="radiogroup">
                {GOALS.map(({ id, label, icon: Icon, color }) => (
                  <button
                    key={id} type="button" role="radio" aria-checked={goal === id} onClick={() => setGoal(id)}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${goal === id ? 'bg-(--accent-bg) border-(--accent) shadow-sm' : 'bg-(--bg) border-(--border) hover:border-(--text)'}`}
                  >
                    <div className={`p-2 rounded-lg ${color}`}><Icon className="w-4 h-4" /></div>
                    <span className={`text-xs font-black ${goal === id ? 'text-(--accent)' : 'text-(--text-h)'}`}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* PREVIEW EN VIVO */}
            {preview && (
              <div className="bg-(--bg) border border-dashed border-(--border) p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-(--text) flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Tu nuevo objetivo</span>
                  <span className="text-sm font-black text-(--accent)">{preview.calories_target} kcal</span>
                </div>
                <div className="flex justify-between text-[11px] font-mono text-(--text)">
                  <span>P <b className="text-(--text-h)">{preview.protein_target}g</b></span>
                  <span>HC <b className="text-(--text-h)">{preview.carbs_target}g</b></span>
                  <span>G <b className="text-(--text-h)">{preview.fat_target}g</b></span>
                </div>
              </div>
            )}

            <button
              type="submit" disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg uppercase text-xs tracking-wider"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Guardando cambios...' : 'Guardar y actualizar macros'}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
