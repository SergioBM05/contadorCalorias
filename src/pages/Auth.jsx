import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { toast } from 'sonner';
import { Lock, Mail, UserPlus, LogIn, Scale, Ruler, Calendar, Activity, Target } from 'lucide-react';

export default function Auth({ onProfileCompleted }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState(1);

  // Estados Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Estados Biométricos (Paso 2)
  const [gender, setGender] = useState('masculino');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activity, setActivity] = useState('moderado');
  const [goal, setGoal] = useState('mantener');

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 1. Añadimos la función de cálculo dinámico basada en los inputs del usuario
  const calculateMacros = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);

    // TMB (Mifflin-St Jeor) diferenciando por sexo biológico
    let bmr = 10 * w + 6.25 * h - 5 * a;
    bmr = gender === 'masculino' ? bmr + 5 : bmr - 161;

    // Multiplicador por nivel de actividad (mapeado de tus opciones del select)
    const activityMultipliers = {
      sedentario: 1.2,
      ligero: 1.375,
      moderado: 1.55,
      muy_activo: 1.725
    };
    const factorActividad = activityMultipliers[activity] || 1.2;
    let tdee = bmr * factorActividad;

    // Ajuste calórico según el objetivo fitness seleccionado
    if (goal === 'perder_grasa') {
      tdee -= 400; // Déficit para definición
    } else if (goal === 'ganar_masa') {
      tdee += 350; // Superávit para volumen
    }

    const calories_target = Math.round(tdee);

    // Reparto de Macros dinámico:
    // Proteína: 2g por kg de peso
    const protein_target = Math.round(w * 2);
    // Grasas: 0.9g por kg de peso
    const fat_target = Math.round(w * 0.9);
    // Carbohidratos: El resto de las calorías (1g P/HC = 4kcal, 1g G = 9kcal)
    const carbs_target = Math.round((calories_target - (protein_target * 4) - (fat_target * 9)) / 4);

    return { calories_target, protein_target, carbs_target, fat_target };
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert('Por favor, rellena todos los campos');
    setLoading(true);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }
      if (data?.user) {
        // En lugar de dejar que App.jsx lo eche, ahora App.jsx le permite quedarse porque hasProfile es false
        setStep(2);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) navigate('/');
      else alert(error.message);
    }
    setLoading(false);
  };

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    if (!age || !weight || !height) {
      return toast.warning('Datos incompletos', {
        description: 'Por favor, rellena tus datos físicos antes de continuar.'
      });
    }
    setLoading(true);

    const targets = calculateMacros();

    const saveProfilePromise = apiService.saveProfile({
      gender,
      age: parseInt(age),
      weight_kg: parseFloat(weight),
      height_cm: parseInt(height),
      activity_level: activity,
      fitness_goal: goal,
      ...targets
    });

    toast.promise(saveProfilePromise, {
      loading: 'Calculando tus macros y guardando perfil...',
      success: () => {
        // Este bloque se ejecuta SI la promesa se resuelve con éxito
        if (onProfileCompleted) onProfileCompleted();
        navigate('/');

        return `¡Perfil configurado! Objetivo: ${targets.calories_target} kcal`;
      },
      error: (err) => {
        // Este bloque se ejecuta SI la promesa falla
        return err.message || 'Error al conectar con el servidor';
      },
    });
    try {
      await saveProfilePromise;
    } catch (err) {
      alert(err.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-[85svh] flex flex-col items-center justify-center px-6 text-left max-w-md mx-auto font-sans w-full">
      <div className="w-full bg-[var(--code-bg)] border border-[var(--border)] p-8 rounded-3xl shadow-[var(--shadow)] animate-in fade-in zoom-in-95 duration-200">

        {step === 1 ? (
          <>
            <div className="text-center mb-6">
              <div className="bg-[var(--accent-bg)] w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 text-[var(--accent)]">
                {isSignUp ? <UserPlus className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
              </div>
              <h2 className="!m-0 text-2xl font-black text-[var(--text-h)]">
                {isSignUp ? 'Crea tu cuenta' : '¡Qué pasa, Gymbro!'}
              </h2>
              <p className="text-xs text-[var(--text)] mt-1">
                {isSignUp ? 'Únete para trackear tus macros en la nube' : 'Inicia sesión para escanear tu comida de hoy'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-[var(--text-h)]">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-[var(--text)]" />
                  <input
                    type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 pl-10 pr-4 text-sm text-[var(--text-h)] focus:border-[var(--accent)] outline-none transition"
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
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 pl-10 pr-4 text-sm text-[var(--text-h)] focus:border-[var(--accent)] outline-none transition"
                    required
                  />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full bg-[var(--accent)] text-white font-bold py-3.5 rounded-xl mt-2 transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
              >
                {loading ? 'Procesando...' : isSignUp ? 'SIGUIENTE: DATOS FÍSICOS' : 'INICIAR SESIÓN'}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-[var(--border)] pt-4">
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-xs font-bold text-[var(--accent)] hover:underline">
                {isSignUp ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿No tienes cuenta aún? Regístrate gratis'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="!m-0 text-2xl font-black text-[var(--text-h)]">Configura tu Perfil</h2>
              <p className="text-xs text-[var(--text)] mt-1">Calcularemos tus calorías de forma automática.</p>
            </div>

            <form onSubmit={handleOnboardingSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-[var(--text-h)]">Sexo Biológico</label>
                <div className="grid grid-cols-2 gap-2">
                  {['masculino', 'femenino'].map((g) => (
                    <button
                      key={g} type="button" onClick={() => setGender(g)}
                      className={`py-2 rounded-xl text-xs font-bold border capitalize transition ${gender === g ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-h)]'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 text-[var(--text-h)]">Edad</label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-3 w-3.5 h-3.5 text-[var(--text)]" />
                    <input type="number" placeholder="Años" value={age} onChange={(e) => setAge(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2 pl-8 pr-2 text-xs text-[var(--text-h)] outline-none" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 text-[var(--text-h)]">Peso</label>
                  <div className="relative">
                    <Scale className="absolute left-2.5 top-3 w-3.5 h-3.5 text-[var(--text)]" />
                    <input type="number" step="0.1" placeholder="kg" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2 pl-8 pr-2 text-xs text-[var(--text-h)] outline-none" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 text-[var(--text-h)]">Altura</label>
                  <div className="relative">
                    <Ruler className="absolute left-2.5 top-3 w-3.5 h-3.5 text-[var(--text)]" />
                    <input type="number" placeholder="cm" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2 pl-8 pr-2 text-xs text-[var(--text-h)] outline-none" required />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-[var(--text-h)] flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Actividad</label>
                <select value={activity} onChange={(e) => setActivity(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2.5 px-3 text-xs text-[var(--text-h)] outline-none">
                  <option value="sedentario">Sedentario (Oficina / Poco movimiento)</option>
                  <option value="ligero">Ligero (Entreno 1-3 días / Caminas)</option>
                  <option value="moderado">Moderado (Entreno 3-5 días intensos)</option>
                  <option value="muy_activo">Muy Activo (Doble entreno o trabajo físico)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-[var(--text-h)] flex items-center gap-1"><Target className="w-3.5 h-3.5" /> Objetivo Fitness</label>
                <select value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2.5 px-3 text-xs text-[var(--text-h)] outline-none">
                  <option value="perder_grasa">Perder Grasa (Definición)</option>
                  <option value="mantener">Mantener Peso (Normocalórica)</option>
                  <option value="ganar_masa">Ganar Masa Muscular (Volumen)</option>
                </select>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl mt-2 transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'ENVIAR DATOS AL BACKEND'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}