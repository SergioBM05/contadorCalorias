import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { apiService } from '../services/api';
import { toast } from 'sonner';
import {
  Lock, Mail, UserPlus, LogIn, LogOut, ArrowRight, ArrowLeft,
  Flame, Dumbbell, Utensils, Eye, EyeOff, MailCheck, Loader2,
} from 'lucide-react';
import {
  ACTIVITY_OPTIONS, buildProfilePayload, validateBiometrics, storePendingProfile, LIMITS,
} from '../utils/nutrition';
import { inputClass } from '../utils/styles';

const TOTAL_STEPS = 5;

const GOALS = [
  { id: 'perder_grasa', label: 'Perder grasa', icon: Flame, color: 'text-red-500' },
  { id: 'mantener', label: 'Mantener peso', icon: Utensils, color: 'text-blue-500' },
  { id: 'ganar_masa', label: 'Ganar masa muscular', icon: Dumbbell, color: 'text-amber-500' },
];

const translateAuthError = (message = '') => {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Email o contraseña incorrectos';
  if (m.includes('email not confirmed')) return 'Confirma tu email antes de iniciar sesión (revisa tu bandeja de entrada)';
  if (m.includes('already registered')) return 'Ya existe una cuenta con este email. Inicia sesión.';
  if (m.includes('password should be')) return 'La contraseña debe tener al menos 6 caracteres';
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
  return message || 'Ha ocurrido un error inesperado';
};

const PrimaryButton = ({ children, className = '', ...props }) => (
  <button
    type="button"
    className={`w-full bg-(--text-h) text-(--bg) font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-50 ${className}`}
    {...props}
  >
    {children}
  </button>
);

const BackButton = ({ onClick }) => (
  <button type="button" onClick={onClick} className="flex items-center gap-1 text-xs font-semibold text-(--text) mb-4 hover:text-(--text-h)">
    <ArrowLeft className="w-3.5 h-3.5" /> Atrás
  </button>
);

const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-bold uppercase mb-1 text-(--text-h)">{label}</span>
    {children}
  </label>
);

export default function Auth({ session, onProfileCompleted }) {
  // Con sesión pero sin perfil → el usuario solo tiene que completar el test
  const completingProfile = Boolean(session);
  const [isSignUp, setIsSignUp] = useState(completingProfile);
  const [step, setStep] = useState(1);

  const [gender, setGender] = useState('masculino');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [weightGoal, setWeightGoal] = useState('');
  const [activity, setActivity] = useState('moderado');
  const [goal, setGoal] = useState('mantener');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const profilePayload = () => buildProfilePayload({ gender, age, weight, height, activity, goal, weightGoal });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success('¡Bienvenido de vuelta!');
    // App redirige automáticamente al detectar la sesión
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres');
    setLoading(true);

    const cleanEmail = email.trim();
    const profile = profilePayload();
    // Se guarda antes del signUp: App lo sincroniza en cuanto exista sesión
    storePendingProfile(cleanEmail, profile);

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);

    if (error) return toast.error(translateAuthError(error.message));

    if (!data.session) {
      // Supabase con confirmación de email activada
      setAwaitingConfirmation(true);
      return;
    }
    toast.success(`¡Cuenta creada! Objetivo: ${profile.calories_target} kcal`);
  };

  const handleCompleteProfile = async () => {
    setLoading(true);
    try {
      const profile = profilePayload();
      await apiService.saveProfile(profile);
      toast.success(`¡Perfil listo! Objetivo: ${profile.calories_target} kcal`);
      onProfileCompleted?.();
    } catch (err) {
      toast.error(err.message || 'Error al guardar tus métricas');
    } finally {
      setLoading(false);
    }
  };

  const goToStep3 = () => {
    const error = validateBiometrics({ age, weight, height, weightGoal });
    if (error) return toast.warning(error);
    setStep(3);
  };

  const preview = step === TOTAL_STEPS ? profilePayload() : null;

  if (awaitingConfirmation) {
    return (
      <div className="min-h-[85svh] flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto w-full">
        <div className="w-full bg-(--card-bg) border border-(--border) p-8 rounded-3xl shadow-(--shadow) text-center animate-fade-up">
          <div className="bg-(--accent-bg) w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-(--accent)">
            <MailCheck className="w-7 h-7" />
          </div>
          <h2 className="!text-center text-2xl font-black text-(--text-h) tracking-tight">Revisa tu correo</h2>
          <p className="!text-center text-sm text-(--text) mt-2">
            Te hemos enviado un enlace de confirmación a <b className="text-(--text-h)">{email}</b>.
            Al confirmarlo e iniciar sesión, tu perfil y tus macros se guardarán automáticamente.
          </p>
          <button
            type="button"
            onClick={() => { setAwaitingConfirmation(false); setIsSignUp(false); setStep(1); setPassword(''); }}
            className="mt-6 text-xs font-bold text-(--accent) hover:underline"
          >
            Ya lo he confirmado, iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85svh] flex flex-col items-center justify-center px-4 py-8 text-left max-w-md mx-auto font-sans w-full">
      {isSignUp && (
        <div
          className="w-full bg-(--border) h-1.5 rounded-full mb-8 overflow-hidden"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step}
        >
          <div className="bg-(--accent) h-full transition-all duration-300 ease-out" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>
      )}

      <div className="w-full bg-(--card-bg) border border-(--border) p-6 sm:p-8 rounded-3xl shadow-(--shadow)">

        {/* PASO 1: LOGIN o SEXO BIOLÓGICO */}
        {step === 1 && (
          <div key="s1" className="animate-fade-up">
            {isSignUp ? (
              <>
                {completingProfile && (
                  <p className="text-xs font-bold text-(--accent) mb-3">Completa tu perfil para empezar</p>
                )}
                <h2 className="text-2xl font-black text-(--text-h) mb-1 tracking-tight">¿Cuál es tu sexo biológico?</h2>
                <p className="text-sm text-(--text) mb-6">Lo usamos para ajustar tu tasa metabólica basal.</p>

                <div className="flex flex-col gap-3 mb-6" role="radiogroup">
                  {['masculino', 'femenino'].map((g) => (
                    <button
                      key={g} type="button" role="radio" aria-checked={gender === g} onClick={() => setGender(g)}
                      className={`p-4 rounded-2xl text-sm font-bold border capitalize transition-all flex items-center justify-between ${gender === g
                        ? 'bg-(--accent-bg) border-(--accent) text-(--accent) shadow-sm'
                        : 'bg-(--bg) border-(--border) text-(--text-h) hover:border-(--text)'
                      }`}
                    >
                      <span>{g}</span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${gender === g ? 'border-(--accent) bg-(--accent)' : 'border-(--border)'}`}>
                        {gender === g && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </button>
                  ))}
                </div>

                <PrimaryButton onClick={() => setStep(2)} className="mb-4">
                  Siguiente <ArrowRight className="w-4 h-4" />
                </PrimaryButton>

                <div className="text-center border-t border-(--border) pt-4">
                  {completingProfile ? (
                    <button type="button" onClick={() => supabase.auth.signOut()} className="text-xs font-bold text-(--text) hover:text-(--text-h) inline-flex items-center gap-1">
                      <LogOut className="w-3.5 h-3.5" /> Usar otra cuenta
                    </button>
                  ) : (
                    <button type="button" onClick={() => setIsSignUp(false)} className="text-xs font-bold text-(--accent) hover:underline">
                      ¿Ya tienes cuenta? Inicia sesión
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="bg-(--accent-bg) w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 text-(--accent)">
                    <LogIn className="w-6 h-6" />
                  </div>
                  <h2 className="!text-center text-2xl font-black text-(--text-h) tracking-tight">¡Qué pasa, Gymbro!</h2>
                  <p className="!text-center text-sm text-(--text) mt-1">Inicia sesión para escanear tu comida de hoy</p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <CredentialsFields {...{ email, setEmail, password, setPassword, showPassword, setShowPassword }} autoComplete="current-password" />
                  <button
                    type="submit" disabled={loading}
                    className="w-full bg-(--accent) text-white font-bold py-3.5 rounded-xl mt-2 transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? 'Entrando...' : 'INICIAR SESIÓN'}
                  </button>
                </form>

                <div className="mt-6 text-center border-t border-(--border) pt-4">
                  <button type="button" onClick={() => setIsSignUp(true)} className="text-xs font-bold text-(--accent) hover:underline">
                    ¿No tienes cuenta? Haz el test de macros
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* PASO 2: MÉTRICAS */}
        {step === 2 && (
          <form key="s2" className="animate-fade-up" onSubmit={(e) => { e.preventDefault(); goToStep3(); }}>
            <BackButton onClick={() => setStep(1)} />
            <h2 className="text-2xl font-black text-(--text-h) mb-1 tracking-tight">Tus métricas corporales</h2>
            <p className="text-sm text-(--text) mb-6">Datos clave para calcular tu gasto energético.</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <Field label="Edad">
                <input type="number" inputMode="numeric" min={LIMITS.age.min} max={LIMITS.age.max} placeholder="Años" value={age} onChange={(e) => setAge(e.target.value)} className={inputClass} required />
              </Field>
              <Field label="Estatura (cm)">
                <input type="number" inputMode="numeric" placeholder="175" value={height} onChange={(e) => setHeight(e.target.value)} className={inputClass} required />
              </Field>
              <Field label="Peso actual (kg)">
                <input type="number" inputMode="decimal" step="0.1" placeholder="78.5" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputClass} required />
              </Field>
              <Field label="Peso objetivo (kg)">
                <input type="number" inputMode="decimal" step="0.1" placeholder="72.5" value={weightGoal} onChange={(e) => setWeightGoal(e.target.value)} className={inputClass} required />
              </Field>
            </div>

            <PrimaryButton type="submit">Siguiente <ArrowRight className="w-4 h-4" /></PrimaryButton>
          </form>
        )}

        {/* PASO 3: ACTIVIDAD */}
        {step === 3 && (
          <div key="s3" className="animate-fade-up">
            <BackButton onClick={() => setStep(2)} />
            <h2 className="text-2xl font-black text-(--text-h) mb-1 tracking-tight">¿Cómo es tu día a día?</h2>
            <p className="text-sm text-(--text) mb-6">Tu gasto calórico depende de tu movimiento diario.</p>

            <div className="flex flex-col gap-2.5 mb-6" role="radiogroup">
              {ACTIVITY_OPTIONS.map((act) => (
                <button
                  key={act.id} type="button" role="radio" aria-checked={activity === act.id} onClick={() => setActivity(act.id)}
                  className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col ${activity === act.id ? 'bg-(--accent-bg) border-(--accent) shadow-sm' : 'bg-(--bg) border-(--border) hover:border-(--text)'}`}
                >
                  <span className={`text-sm font-black ${activity === act.id ? 'text-(--accent)' : 'text-(--text-h)'}`}>{act.label}</span>
                  <span className="text-xs text-(--text) mt-0.5">{act.desc}</span>
                </button>
              ))}
            </div>

            <PrimaryButton onClick={() => setStep(4)}>Siguiente <ArrowRight className="w-4 h-4" /></PrimaryButton>
          </div>
        )}

        {/* PASO 4: OBJETIVO */}
        {step === 4 && (
          <div key="s4" className="animate-fade-up">
            <BackButton onClick={() => setStep(3)} />
            <h2 className="text-2xl font-black text-(--text-h) mb-1 tracking-tight">¿Cuál es tu meta real?</h2>
            <p className="text-sm text-(--text) mb-6">Ajustaremos tus calorías y macros a tu objetivo.</p>

            <div className="grid grid-cols-1 gap-3 mb-6" role="radiogroup">
              {GOALS.map(({ id, label, icon: Icon, color }) => (
                <button
                  key={id} type="button" role="radio" aria-checked={goal === id} onClick={() => setGoal(id)}
                  className={`p-4 rounded-2xl text-left border transition-all flex items-center gap-4 ${goal === id ? 'bg-(--accent-bg) border-(--accent) shadow-md' : 'bg-(--bg) border-(--border) hover:border-(--text)'}`}
                >
                  <div className={`p-2.5 rounded-xl bg-(--card-bg) border border-(--border) ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-sm font-black ${goal === id ? 'text-(--accent)' : 'text-(--text-h)'}`}>{label}</span>
                </button>
              ))}
            </div>

            <PrimaryButton onClick={() => setStep(5)}>Calcular mis macros ✨ <ArrowRight className="w-4 h-4" /></PrimaryButton>
          </div>
        )}

        {/* PASO 5: RESULTADO + CUENTA */}
        {step === 5 && preview && (
          <div key="s5" className="animate-fade-up">
            <BackButton onClick={() => setStep(4)} />

            <div className="bg-(--accent-bg) border border-(--accent-border) rounded-2xl p-4 mb-6">
              <p className="text-[10px] font-black uppercase tracking-wider text-(--accent)">Tu objetivo diario</p>
              <p className="text-3xl font-black text-(--text-h) tracking-tight">{preview.calories_target} <span className="text-sm font-medium text-(--text)">kcal</span></p>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                {[
                  ['Proteína', preview.protein_target, 'text-rose-500'],
                  ['Carbs', preview.carbs_target, 'text-blue-500'],
                  ['Grasa', preview.fat_target, 'text-amber-500'],
                ].map(([label, value, color]) => (
                  <div key={label} className="bg-(--card-bg) border border-(--border) rounded-xl py-2">
                    <p className={`text-sm font-black ${color} !text-center`}>{value}g</p>
                    <p className="text-[10px] text-(--text) !text-center">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {completingProfile ? (
              <PrimaryButton onClick={handleCompleteProfile} disabled={loading} className="!bg-emerald-600 !text-white uppercase text-xs tracking-wider">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {loading ? 'Guardando...' : 'Guardar mi perfil y entrar 🚀'}
              </PrimaryButton>
            ) : (
              <>
                <h2 className="text-lg font-black text-(--text-h) tracking-tight mb-1">Guarda tus resultados</h2>
                <p className="text-xs text-(--text) mb-4">Crea tu cuenta para guardar tu configuración.</p>
                <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                  <CredentialsFields {...{ email, setEmail, password, setPassword, showPassword, setShowPassword }} autoComplete="new-password" />
                  <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl mt-2 transition hover:bg-emerald-500 disabled:opacity-50 uppercase text-xs tracking-wider flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? 'Creando cuenta...' : 'Crear mi perfil y entrar 🚀'}
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CredentialsFields({ email, setEmail, password, setPassword, showPassword, setShowPassword, autoComplete }) {
  return (
    <>
      <Field label="Email">
        <div className="relative">
          <Mail className="absolute left-3 top-3 w-4 h-4 text-(--text)" />
          <input
            type="email" autoComplete="email" placeholder="tu@email.com" value={email}
            onChange={(e) => setEmail(e.target.value)} className={`${inputClass} pl-10`} required
          />
        </div>
      </Field>
      <Field label="Contraseña">
        <div className="relative">
          <Lock className="absolute left-3 top-3 w-4 h-4 text-(--text)" />
          <input
            type={showPassword ? 'text' : 'password'} autoComplete={autoComplete} placeholder="••••••••" minLength={6}
            value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pl-10 pr-10`} required
          />
          <button
            type="button" onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3 top-2.5 p-0.5 text-(--text) hover:text-(--text-h)"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </Field>
    </>
  );
}
