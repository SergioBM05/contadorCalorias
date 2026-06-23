import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, UserPlus, LogIn, Scale, Ruler, Calendar, Activity, Target } from 'lucide-react';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState(1); // Paso 1: Auth básico, Paso 2: Onboarding Biométrico
  const [userId, setUserId] = useState(null);

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

  // --- FÓRMULA FITNESS: MIFFLIN-ST JEOR + REPARTO DE MACROS ---
  const calculateMacros = () => {
    const w = parseFloat(weight);
    const h = parseInt(height);
    const a = parseInt(age);

    // Gasto Metabólico Basal (BMR)
    let bmr = (10 * w) + (6.25 * h) - (5 * a);
    bmr = gender === 'masculino' ? bmr + 5 : bmr - 161;

    // Factor de Actividad
    const activityFactors = { sedentario: 1.2, ligero: 1.375, moderado: 1.55, muy_activo: 1.725 };
    let tdee = bmr * activityFactors[activity];

    // Ajuste por Objetivo
    if (goal === 'perder_grasa') tdee -= 400; // Déficit
    if (goal === 'ganar_masa') tdee += 350;    // Superávit
    
    const calories = Math.round(tdee);

    // Reparto de Macros Inteligente
    // Proteína: 2g por kg de peso (1g Prot = 4 kcal)
    const protein = Math.round(w * 2);
    // Grasa: 1g por kg de peso (1g Grasa = 9 kcal)
    const fat = Math.round(w * 0.9);
    // Carbohidratos: El resto de las calorías sobrantes (1g Carbs = 4 kcal)
    const proteinCalories = protein * 4;
    const fatCalories = fat * 9;
    const carbs = Math.round(Math.max((calories - (proteinCalories + fatCalories)) / 4, 50));

    return { calories, protein, carbs, fat };
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert('Por favor, rellena todos los campos');
    setLoading(true);

    if (isSignUp) {
      // Registrar en Supabase Auth
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }
      if (data?.user) {
        setUserId(data.user.id);
        setStep(2); // Pasamos al Onboarding
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
    if (!age || !weight || !height) return alert('Por favor, rellena tus datos físicos');
    setLoading(true);

    const { calories, protein, carbs, fat } = calculateMacros();

    // Actualizamos la fila que el Trigger de SQL creó en user_profiles
    const { error } = await supabase
      .from('user_profiles')
      .update({
        gender,
        age: parseInt(age),
        weight_kg: parseFloat(weight),
        height_cm: parseInt(height),
        activity_level: activity,
        fitness_goal: goal,
        calories_target: calories,
        protein_target: protein,
        carbs_target: carbs,
        fat_target: fat
      })
      .eq('user_id', userId);

    if (error) {
      alert("Error guardando tu perfil: " + error.message);
    } else {
      alert(`¡Perfil configurado! Tus macros diarios objetivos serán: ${calories} kcal (P: ${protein}g, C: ${carbs}g, G: ${fat}g)`);
      // Autologin forzado redirigiendo al home ya con los datos listos
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[85svh] flex flex-col items-center justify-center px-6 text-left max-w-md mx-auto font-sans w-full">
      <div className="w-full bg-[var(--code-bg)] border border-[var(--border)] p-8 rounded-3xl shadow-[var(--shadow)] animate-in fade-in zoom-in-95 duration-200">
        
        {step === 1 ? (
          <>
            {/* ENCABEZADO PASO 1 */}
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
            {/* ENCABEZADO PASO 2: BIOMÉTRICOS */}
            <div className="text-center mb-6">
              <h2 className="!m-0 text-2xl font-black text-[var(--text-h)]">Configura tu Perfil</h2>
              <p className="text-xs text-[var(--text)] mt-1">Calcularemos tus calorías de forma automática.</p>
            </div>

            <form onSubmit={handleOnboardingSubmit} className="flex flex-col gap-4">
              {/* Género */}
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

              {/* Edad, Peso, Altura */}
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

              {/* Nivel de Actividad */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-[var(--text-h)] flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Actividad</label>
                <select value={activity} onChange={(e) => setActivity(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2.5 px-3 text-xs text-[var(--text-h)] outline-none">
                  <option value="sedentario">Sedentario (Oficina / Poco movimiento)</option>
                  <option value="ligero">Ligero (Entreno 1-3 días / Caminas)</option>
                  <option value="moderado">Moderado (Entreno 3-5 días intensos)</option>
                  <option value="muy_activo">Muy Activo (Doble entreno o trabajo físico)</option>
                </select>
              </div>

              {/* Objetivo fitness */}
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
                {loading ? 'Calculando...' : 'CALCULAR MACROS Y ENTRAR'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}