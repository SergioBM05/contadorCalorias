// Lógica nutricional compartida (registro, perfil y evolución)

export const ACTIVITY_OPTIONS = [
  { id: 'sedentario', label: 'Sedentario', desc: 'Trabajo de oficina, poco movimiento diario.', factor: 1.2 },
  { id: 'ligero', label: 'Actividad ligera', desc: 'Caminas a diario o entrenas de 1 a 3 días.', factor: 1.375 },
  { id: 'moderado', label: 'Actividad moderada', desc: 'Entrenamientos intensos de 3 a 5 días.', factor: 1.55 },
  { id: 'muy_activo', label: 'Muy activo', desc: 'Trabajo físico pesado o doble sesión de entreno.', factor: 1.725 },
];

export const GOAL_ADJUSTMENT = {
  perder_grasa: -400,
  mantener: 0,
  ganar_masa: 350,
};

// Rangos razonables para validar la entrada del usuario
export const LIMITS = {
  age: { min: 14, max: 100, label: 'La edad' },
  weight: { min: 30, max: 300, label: 'El peso' },
  height: { min: 120, max: 230, label: 'La altura' },
  weightGoal: { min: 30, max: 300, label: 'El peso objetivo' },
};

/**
 * Devuelve un mensaje de error si algún campo está vacío o fuera de rango, o null si todo es válido.
 * @param {Record<keyof LIMITS, string|number>} values
 */
export const validateBiometrics = (values) => {
  for (const [key, { min, max, label }] of Object.entries(LIMITS)) {
    if (!(key in values)) continue;
    const num = parseFloat(values[key]);
    if (Number.isNaN(num)) return `${label} es obligatorio`;
    if (num < min || num > max) return `${label} debe estar entre ${min} y ${max}`;
  }
  return null;
};

/**
 * Mifflin-St Jeor + factor de actividad + ajuste por objetivo.
 * Devuelve null si faltan datos.
 */
export const calculateTargets = ({ gender, age, weight, height, activity, goal }) => {
  const w = parseFloat(weight);
  const h = parseFloat(height);
  const a = parseInt(age, 10);
  if (!w || !h || !a) return null;

  const bmr = 10 * w + 6.25 * h - 5 * a + (gender === 'femenino' ? -161 : 5);
  const factor = ACTIVITY_OPTIONS.find((o) => o.id === activity)?.factor ?? 1.2;
  const tdee = bmr * factor + (GOAL_ADJUSTMENT[goal] ?? 0);

  // Nunca por debajo de un mínimo saludable
  const calories_target = Math.max(Math.round(tdee), gender === 'femenino' ? 1200 : 1500);
  const protein_target = Math.round(w * 2);
  const fat_target = Math.round(w * 0.9);
  const carbs_target = Math.max(
    Math.round((calories_target - protein_target * 4 - fat_target * 9) / 4),
    0
  );

  return { calories_target, protein_target, carbs_target, fat_target };
};

/** Construye el objeto listo para guardar en user_profiles. */
export const buildProfilePayload = ({ gender, age, weight, height, activity, goal, weightGoal }) => ({
  gender,
  age: parseInt(age, 10),
  weight_kg: parseFloat(weight),
  height_cm: parseInt(height, 10),
  activity_level: activity,
  fitness_goal: goal,
  weight_goal: parseFloat(weightGoal),
  ...calculateTargets({ gender, age, weight, height, activity, goal }),
});

export const PROFILE_FIELDS = [
  'gender', 'age', 'weight_kg', 'height_cm', 'activity_level', 'fitness_goal',
  'weight_goal', 'calories_target', 'protein_target', 'carbs_target', 'fat_target',
];

export const isProfileComplete = (profile) =>
  Boolean(profile) && PROFILE_FIELDS.every((f) => profile[f] != null && profile[f] !== '');

export const sumMacros = (meals = []) =>
  meals.reduce(
    (acc, m) => {
      acc.calories += Number(m.calories) || 0;
      acc.protein += Number(m.protein) || 0;
      acc.carbs += Number(m.carbs) || 0;
      acc.fat += Number(m.fat) || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

export const percentage = (consumed, target) =>
  target ? Math.min(Math.round((consumed / target) * 100), 100) : 0;

// ---- Perfil pendiente (registro con confirmación de email) ----
const PENDING_PROFILE_KEY = 'pendingProfile';

export const storePendingProfile = (email, profile) =>
  localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify({ email: email.toLowerCase(), profile }));

/** Devuelve el perfil pendiente solo si pertenece al email indicado. */
export const readPendingProfile = (email) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_PROFILE_KEY));
    return parsed?.email && parsed.email === email?.toLowerCase() ? parsed.profile : null;
  } catch {
    return null;
  }
};

export const clearPendingProfile = () => localStorage.removeItem(PENDING_PROFILE_KEY);
