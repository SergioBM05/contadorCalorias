// Modo demo: se activa con «?demo» en la dirección y se recuerda mientras dure la pestaña.
// Es 100 % local: no se crea el cliente de Supabase, no se llama al servidor ni a la IA y los datos
// se guardan en este navegador con un prefijo propio. Nunca toca cuentas ni datos reales.

function detectar() {
  try {
    if (new URLSearchParams(window.location.search).has('demo')) sessionStorage.setItem('mealscan-modo-demo', '1');
    return sessionStorage.getItem('mealscan-modo-demo') === '1';
  } catch {
    return false;
  }
}

export const MODO_DEMO = detectar();

const PREFIJO = 'mealscan-demo:';
const USER_ID = 'demo-user';
const SESION = { access_token: 'demo', user: { id: USER_ID, email: 'demo@mealscan.app' } };

const borrarDatos = () => {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIJO)).forEach((k) => localStorage.removeItem(k));
  } catch { /* sin almacenamiento */ }
};

export const reiniciarDemo = () => { borrarDatos(); window.location.reload(); };
export const salirDeDemo = () => {
  borrarDatos();
  try { sessionStorage.removeItem('mealscan-modo-demo'); } catch { /* sin almacenamiento */ }
  window.location.assign(window.location.pathname);
};

// ---------- Datos de ejemplo (relativos a hoy) ----------
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const diaClave = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hace = (dias, hora, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, min, 0, 0);
  return d;
};

const COMIDAS = [
  [8, 'Tostada integral con aguacate y huevo', 380, 18, 34, 19],
  [14, 'Pollo a la plancha con arroz y verduras', 620, 48, 62, 16],
  [17, 'Yogur griego con nueces y miel', 290, 20, 22, 14],
  [21, 'Salmón al horno con patata', 560, 38, 40, 26],
];

function semilla() {
  const meals = [];
  for (let dia = 0; dia < 14; dia++) {
    COMIDAS.forEach(([h, dish, calories, protein, carbs, fat], i) => {
      const fecha = hace(dia, h, 10 * i);
      if (fecha > new Date()) return; // lo de hoy que aún no ha "pasado"
      meals.push({ id: uid(), user_id: USER_ID, dish, calories, protein, carbs, fat, created_at: fecha.toISOString() });
    });
  }
  const weight_logs = [84.6, 84.1, 83.7, 83.2, 82.9, 82.4, 82.0, 81.6].map((kg, i) => ({
    id: uid(), user_id: USER_ID, weight_kg: kg, fat_percentage: Math.round((18.5 - i * 0.2) * 10) / 10, notes: null, date: diaClave(hace((7 - i) * 4, 9)),
  }));
  const workouts = [1, 3, 4, 6, 8].map((d) => ({ id: uid(), user_id: USER_ID, calories_burned: 320 + d * 15, created_at: hace(d, 19).toISOString() }));
  const user_profiles = [{
    user_id: USER_ID, gender: 'masculino', age: 29, weight_kg: 81.6, height_cm: 178, activity_level: 'moderado', fitness_goal: 'perder_grasa',
    weight_goal: 77, calories_target: 2250, protein_target: 163, carbs_target: 233, fat_target: 73,
  }];
  return { meals, weight_logs, workouts, user_profiles };
}

function cargar(tabla) {
  try {
    const raw = localStorage.getItem(PREFIJO + tabla);
    if (raw) return JSON.parse(raw);
    // Primera vez: se siembran todas las tablas juntas
    const datos = semilla();
    Object.entries(datos).forEach(([t, filas]) => localStorage.setItem(PREFIJO + t, JSON.stringify(filas)));
    return datos[tabla] || [];
  } catch {
    return [];
  }
}
const guardar = (tabla, filas) => {
  try { localStorage.setItem(PREFIJO + tabla, JSON.stringify(filas)); } catch { /* lleno */ }
};

// ---------- Cliente de Supabase simulado (solo lo que usa la app) ----------
function consulta(tabla) {
  const q = { op: 'select', filtros: [], orden: null, limite: null, valores: null, devolver: false, unico: null, conflicto: null };
  const run = () => {
    const filas = cargar(tabla);
    const coincide = (f) => q.filtros.every(([tipo, col, val]) => (tipo === 'eq' ? f[col] === val : String(f[col]) >= String(val)));
    let resultado;
    if (q.op === 'insert') {
      const nuevas = q.valores.map((v) => ({ id: uid(), created_at: new Date().toISOString(), ...v }));
      guardar(tabla, [...filas, ...nuevas]);
      resultado = nuevas;
    } else if (q.op === 'upsert') {
      const clave = q.conflicto || 'id';
      const v = q.valores[0];
      const existe = filas.find((f) => f[clave] === v[clave]);
      const fila = { ...(existe || {}), ...v };
      guardar(tabla, existe ? filas.map((f) => (f === existe ? fila : f)) : [...filas, fila]);
      resultado = [fila];
    } else if (q.op === 'update') {
      resultado = [];
      guardar(tabla, filas.map((f) => {
        if (!coincide(f)) return f;
        const nueva = { ...f, ...q.valores };
        resultado.push(nueva);
        return nueva;
      }));
    } else if (q.op === 'delete') {
      resultado = filas.filter(coincide);
      guardar(tabla, filas.filter((f) => !coincide(f)));
    } else {
      resultado = filas.filter(coincide);
      if (q.orden) {
        const { col, asc } = q.orden;
        resultado = [...resultado].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1));
      }
      if (q.limite) resultado = resultado.slice(0, q.limite);
    }
    if (q.op !== 'select' && !q.devolver) return { data: null, error: null };
    if (q.unico === 'single') return resultado[0] ? { data: resultado[0], error: null } : { data: null, error: { message: 'Sin resultados' } };
    if (q.unico === 'maybe') return { data: resultado[0] ?? null, error: null };
    return { data: resultado, error: null };
  };
  const b = {
    select() { if (q.op !== 'select') q.devolver = true; return b; },
    insert(v) { q.op = 'insert'; q.valores = v; return b; },
    update(v) { q.op = 'update'; q.valores = v; return b; },
    upsert(v, o) { q.op = 'upsert'; q.valores = [v]; q.conflicto = o?.onConflict; return b; },
    delete() { q.op = 'delete'; return b; },
    eq(c, v) { q.filtros.push(['eq', c, v]); return b; },
    gte(c, v) { q.filtros.push(['gte', c, v]); return b; },
    order(c, o) { q.orden = { col: c, asc: o?.ascending !== false }; return b; },
    limit(n) { q.limite = n; return b; },
    single() { q.unico = 'single'; return b; },
    maybeSingle() { q.unico = 'maybe'; return b; },
    then(ok, ko) { return Promise.resolve().then(run).then(ok, ko); },
  };
  return b;
}

export function crearSupabaseDemo() {
  const noDisponible = async () => ({ data: null, error: { message: 'No disponible en la demo. Pulsa «Salir» para volver.' } });
  return {
    auth: {
      getSession: async () => ({ data: { session: SESION } }),
      onAuthStateChange: (cb) => {
        setTimeout(() => cb('INITIAL_SESSION', SESION), 0);
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signOut: async () => { salirDeDemo(); return { error: null }; },
      signInWithPassword: noDisponible,
      signUp: noDisponible,
    },
    from: consulta,
  };
}

// ---------- IA simulada (no sale ninguna petición) ----------
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export async function peticionDemo(ruta, { body } = {}) {
  if (ruta === '/meals/scan') {
    await esperar(1800);
    return { dish: 'Bowl de pollo con arroz y verduras', calories: 540, protein: 42, carbs: 56, fat: 14, confidence: 0.86, portionNote: 'Ración media, unos 350 g (resultado de ejemplo).' };
  }
  if (ruta === '/meals/plan') {
    await esperar(1800);
    const rest = body?.remaining || {};
    return {
      title: body?.prompt ? `${body.prompt.slice(0, 40)} (ejemplo)` : 'Pollo con arroz y verduras (ejemplo)',
      description: 'Receta de ejemplo ajustada a los macros que te quedan hoy.',
      calculatedMacros: {
        calories: Math.min(Number(rest.calories) || 600, 650),
        protein: Math.min(Number(rest.protein) || 45, 50),
        carbs: Math.min(Number(rest.carbs) || 60, 65),
        fat: Math.min(Number(rest.fat) || 15, 18),
      },
      ingredients: [
        { name: 'Pechuga de pollo', weight: '180 g', note: 'a la plancha' },
        { name: 'Arroz integral', weight: '70 g', note: 'peso en seco' },
        { name: 'Verduras salteadas', weight: '150 g' },
        { name: 'Aceite de oliva', weight: '10 g' },
      ],
      steps: ['Cuece el arroz según el paquete.', 'Marca el pollo a la plancha con sal y pimienta.', 'Saltea las verduras con el aceite y sirve todo junto.'],
    };
  }
  const meals = cargar('meals').sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  if (ruta === '/meals/today') {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    return meals.filter((m) => m.created_at >= inicio.toISOString());
  }
  return meals;
}
