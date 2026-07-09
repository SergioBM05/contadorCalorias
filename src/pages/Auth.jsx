import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { toast } from 'sonner';
import {
  Lock, Mail, UserPlus, LogIn,
  ArrowRight, ArrowLeft, Flame, Dumbbell, Utensils
} from 'lucide-react';

export default function Auth({ onProfileCompleted }) {
  const [isSignUp, setIsSignUp] = useState(false); // Foco principal en registro dinámico

  const [step, setStep] = useState(1);

  // Estados Biométricos
  const [gender, setGender] = useState('masculino');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activity, setActivity] = useState('moderado');
  const [goal, setGoal] = useState('mantener');

  // Estados Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const calculateMacros = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);

    let bmr = 10 * w + 6.25 * h - 5 * a;
    bmr = gender === 'masculino' ? bmr + 5 : bmr - 161;

    const activityMultipliers = {
      sedentario: 1.2,
      ligero: 1.375,
      moderado: 1.55,
      muy_activo: 1.725
    };
    const factorActividad = activityMultipliers[activity] || 1.2;
    let tdee = bmr * factorActividad;

    if (goal === 'perder_grasa') tdee -= 400;
    else if (goal === 'ganar_masa') tdee += 350;

    const calories_target = Math.round(tdee);
    const protein_target = Math.round(w * 2);
    const fat_target = Math.round(w * 0.9);
    const carbs_target = Math.round((calories_target - (protein_target * 4) - (fat_target * 9)) / 4);

    return { calories_target, protein_target, carbs_target, fat_target };
  };

  // Login directo para usuarios que YA tienen cuenta
  const handleDirectLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Por favor, rellena todos los campos');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      toast.success('¡Bienvenido de vuelta!');
      navigate('/');
    } else {
      toast.error(error.message);
    }
    setLoading(false);
  };

  // Registro final + Guardado de Perfil para NUEVOS usuarios
  const handleFinalSignUp = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Introduce tu email y contraseña');
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      toast.error(signUpError.message);
      setLoading(false);
      return;
    }

    if (data?.user) {
      const targets = calculateMacros();
      try {
        await apiService.saveProfile({
          gender,
          age: parseInt(age),
          weight_kg: parseFloat(weight),
          height_cm: parseInt(height),
          activity_level: activity,
          fitness_goal: goal,
          ...targets
        });

        if (onProfileCompleted) onProfileCompleted();
        toast.success(`¡Cuenta creada! Objetivo: ${targets.calories_target} kcal`);
        navigate('/');
      } catch (profileError) {
        toast.error(profileError.message || 'Error al guardar tus métricas');
      }
    }
    setLoading(false);
  };

  const renderProgressBar = () => {
    // Si el usuario va a iniciar sesión directo, no mostramos barra de progreso de test
    if (!isSignUp && step === 1) return null;

    const progressPercentage = (step / 5) * 100;
    return (
      <div className="w-full bg-[var(--border)] h-1.5 rounded-full mb-8 overflow-hidden">
        <div
          className="bg-[var(--accent)] h-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    );
  };

  return (
    <div className="min-h-[85svh] flex flex-col items-center justify-center px-4 py-8 text-left max-w-md mx-auto font-sans w-full">

      {renderProgressBar()}

      <div className="w-full bg-[var(--code-bg)] border border-[var(--border)] p-6 sm:p-8 rounded-3xl shadow-[var(--shadow)] transition-all duration-300">

        {/* PASO 1: ADAPTATIVO (TEST DE GÉNERO O LOGIN DIRECTO) */}
        {step === 1 && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            {isSignUp ? (
              /* FLUJO NUEVO USUARIO: EMPIEZA EL TEST */
              <>
                <h2 className="text-2xl font-black text-[var(--text-h)] mb-1 tracking-tight">¿Cuál es tu sexo biológico?</h2>
                <p className="text-sm text-[var(--text)] mb-6">Lo usamos para ajustar tu tasa metabólica base de forma exacta.</p>

                <div className="flex flex-col gap-3 mb-6">
                  {['masculino', 'femenino'].map((g) => (
                    <button
                      key={g} type="button" onClick={() => setGender(g)}
                      className={`p-4 rounded-2xl text-sm font-bold border capitalize transition-all flex items-center justify-between ${gender === g
                        ? 'bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--accent)] shadow-sm'
                        : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-h)] hover:border-[var(--text)]'
                        }`}
                    >
                      <span>{g}</span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${gender === g ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border)]'}`}>
                        {gender === g && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-[var(--text-h)] text-[var(--bg)] font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition hover:opacity-90 mb-4"
                >
                  Siguiente <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center border-t border-[var(--border)] pt-4">
                  <button type="button" onClick={() => setIsSignUp(false)} className="text-xs font-bold text-[var(--accent)] hover:underline">
                    ¿Ya tienes cuenta? Inicia sesión directo
                  </button>
                </div>
              </>
            ) : (
              /* FLUJO USUARIO EXISTENTE: INICIO DE SESIÓN EXPRES */
              <>
                <div className="text-center mb-6">
                  <div className="bg-[var(--accent-bg)] w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 text-[var(--accent)]">
                    <LogIn className="w-6 h-6" />
                  </div>
                  <h2 className="!m-0 text-2xl font-black text-[var(--text-h)] tracking-tight">¡Qué pasa, Gymbro!</h2>
                  <p className="text-sm text-[var(--text)] mt-1">Inicia sesión para escanear tu comida de hoy</p>
                </div>

                <form onSubmit={handleDirectLogin} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1 text-[var(--text-h)]">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 w-4 h-4 text-[var(--text)]" />
                      <input
                        type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 pl-10 pr-4 text-sm text-[var(--text-h)] focus:border-[var(--accent)] outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase mb-1 text-[var(--text-h)]">Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 w-4 h-4 text-[var(--text)]" />
                      <input
                        type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 pl-10 pr-4 text-sm text-[var(--text-h)] focus:border-[var(--accent)] outline-none"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit" disabled={loading}
                    className="w-full bg-[var(--accent)] text-white font-bold py-3.5 rounded-xl mt-2 transition hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? 'Entrando...' : 'INICIAR SESIÓN'}
                  </button>
                </form>

                <div className="mt-6 text-center border-t border-[var(--border)] pt-4">
                  <button type="button" onClick={() => setIsSignUp(true)} className="text-xs font-bold text-[var(--accent)] hover:underline">
                    ¿No tienes cuenta? Haz el test de macros
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* PASO 2: DATOS MÉTRICOS */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-200">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-xs font-semibold text-[var(--text)] mb-4 hover:text-[var(--text-h)]">
              <ArrowLeft className="w-3.5 h-3.5" /> Atrás
            </button>
            <h2 className="text-2xl font-black text-[var(--text-h)] mb-1 tracking-tight">Tus métricas corporales</h2>
            <p className="text-sm text-[var(--text)] mb-6">Datos clave para descifrar tu gasto energético.</p>

            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-[var(--text-h)]">Edad</label>
                <input type="number" placeholder="Años" value={age} onChange={(e) => setAge(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 px-4 text-sm text-[var(--text-h)] outline-none focus:border-[var(--accent)]" required />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-[var(--text-h)]">Peso Corporal</label>
                <input type="number" step="0.1" placeholder="En kilogramos (kg)" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 px-4 text-sm text-[var(--text-h)] outline-none focus:border-[var(--accent)]" required />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-[var(--text-h)]">Estatura</label>
                <input type="number" placeholder="En centímetros (cm)" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 px-4 text-sm text-[var(--text-h)] outline-none focus:border-[var(--accent)]" required />
              </div>
            </div>

            <button
              onClick={() => {
                if (!age || !weight || !height) return toast.warning('Por favor, rellena todos los campos');
                setStep(3);
              }}
              className="w-full bg-[var(--text-h)] text-[var(--bg)] font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition hover:opacity-90"
            >
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* PASO 3: NIVEL DE ACTIVIDAD */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-200">
            <button onClick={() => setStep(2)} className="flex items-center gap-1 text-xs font-semibold text-[var(--text)] mb-4 hover:text-[var(--text-h)]">
              <ArrowLeft className="w-3.5 h-3.5" /> Atrás
            </button>
            <h2 className="text-2xl font-black text-[var(--text-h)] mb-1 tracking-tight">¿Cómo es tu día a día?</h2>
            <p className="text-sm text-[var(--text)] mb-6">Tu gasto calórico depende de tu movimiento diario.</p>

            <div className="flex flex-col gap-2.5 mb-6">
              {[
                { id: 'sedentario', label: 'Sedentario', desc: 'Trabajo de oficina, poco movimiento diario.' },
                { id: 'ligero', label: 'Actividad Ligera', desc: 'Caminas a diario o entrenas de 1 a 3 días.' },
                { id: 'moderado', label: 'Actividad Moderada', desc: 'Entrenamientos intensos de 3 a 5 días.' },
                { id: 'muy_activo', label: 'Muy Activo', desc: 'Trabajo físico pesado o doble sesión de entreno.' },
              ].map((act) => (
                <button
                  key={act.id} type="button" onClick={() => setActivity(act.id)}
                  className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col ${activity === act.id ? 'bg-[var(--accent-bg)] border-[var(--accent)] shadow-sm' : 'bg-[var(--bg)] border-[var(--border)] hover:border-[var(--text)]'
                    }`}
                >
                  <span className={`text-sm font-black ${activity === act.id ? 'text-[var(--accent)]' : 'text-[var(--text-h)]'}`}>{act.label}</span>
                  <span className="text-xs text-[var(--text)] mt-0.5">{act.desc}</span>
                </button>
              ))}
            </div>

            <button onClick={() => setStep(4)} className="w-full bg-[var(--text-h)] text-[var(--bg)] font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition">
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* PASO 4: OBJETIVO FITNESS */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-200">
            <button onClick={() => setStep(3)} className="flex items-center gap-1 text-xs font-semibold text-[var(--text)] mb-4 hover:text-[var(--text-h)]">
              <ArrowLeft className="w-3.5 h-3.5" /> Atrás
            </button>
            <h2 className="text-2xl font-black text-[var(--text-h)] mb-1 tracking-tight">¿Cuál es tu meta real?</h2>
            <p className="text-sm text-[var(--text)] mb-6">Ajustaremos la IA para priorizar tus macros objetivo.</p>

            <div className="grid grid-cols-1 gap-3 mb-6">
              {[
                { id: 'perder_grasa', label: 'Perder Grasa', icon: Flame, color: 'text-red-500' },
                { id: 'mantener', label: 'Mantener Peso', icon: Utensils, color: 'text-blue-500' },
                { id: 'ganar_masa', label: 'Ganar Masa Muscular', icon: Dumbbell, color: 'text-amber-500' },
              ].map((obj) => {
                const IconComponent = obj.icon;
                return (
                  <button
                    key={obj.id} type="button" onClick={() => setGoal(obj.id)}
                    className={`p-4 rounded-2xl text-left border transition-all flex items-center gap-4 ${goal === obj.id ? 'bg-[var(--accent-bg)] border-[var(--accent)] shadow-md' : 'bg-[var(--bg)] border-[var(--border)] hover:border-[var(--text)]'
                      }`}
                  >
                    <div className={`p-2.5 rounded-xl bg-[var(--code-bg)] ${obj.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className={`text-sm font-black ${goal === obj.id ? 'text-[var(--accent)]' : 'text-[var(--text-h)]'}`}>{obj.label}</span>
                  </button>
                );
              })}
            </div>

            <button onClick={() => setStep(5)} className="w-full bg-[var(--text-h)] text-[var(--bg)] font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition">
              Calcular mis Macros ✨ <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* PASO 5: REGISTRO FINAL DE CUENTA */}
        {step === 5 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-200">
            <button onClick={() => setStep(4)} className="flex items-center gap-1 text-xs font-semibold text-[var(--text)] mb-4 hover:text-[var(--text-h)]">
              <ArrowLeft className="w-3.5 h-3.5" /> Atrás
            </button>

            <div className="text-center mb-6">
              <div className="bg-[var(--accent-bg)] w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 text-[var(--accent)]">
                <UserPlus className="w-6 h-6" />
              </div>
              <h2 className="!m-0 text-2xl font-black text-[var(--text-h)] tracking-tight">Guarda tus resultados</h2>
              <p className="text-xs text-[var(--text)] mt-1">Crea tu cuenta para guardar tu configuración física.</p>
            </div>

            <form onSubmit={handleFinalSignUp} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-[var(--text-h)]">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-[var(--text)]" />
                  <input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 pl-10 pr-4 text-sm text-[var(--text-h)] focus:border-[var(--accent)] outline-none" required />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-[var(--text-h)]">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-4 h-4 text-[var(--text)]" />
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 pl-10 pr-4 text-sm text-[var(--text-h)] focus:border-[var(--accent)] outline-none" required />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl mt-2 transition hover:bg-emerald-500 disabled:opacity-50 uppercase text-xs tracking-wider">
                {loading ? 'Sincronizando...' : 'CREAR MI PERFIL Y ENTRAR 🚀'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}