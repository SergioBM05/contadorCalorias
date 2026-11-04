import { sumMacros } from './nutrition.js';

const pad = (n) => String(n).padStart(2, '0');

/** Clave YYYY-MM-DD en la zona horaria LOCAL del usuario (no UTC). */
export const localDateKey = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Convierte una clave YYYY-MM-DD en Date local (mediodía para evitar saltos de horario). */
export const dateFromKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

/** Inicio del día local hace `days` días, en ISO (para filtrar en Supabase). */
export const startOfDayISO = (daysAgo = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

export const shortDate = (key) => {
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
};

export const buildDayGroup = (key, meals = []) => {
  const date = dateFromKey(key);
  const totals = sumMacros(meals);
  return {
    id: key,
    isToday: key === localDateKey(),
    dayName: date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', ''),
    dayNum: date.toLocaleDateString('es-ES', { day: '2-digit' }),
    monthName: date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''),
    dateLabel: date.toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }),
    meals: [...meals].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    totalCalories: totals.calories,
    totalProtein: totals.protein,
    totalCarbs: totals.carbs,
    totalFat: totals.fat,
  };
};

/**
 * Agrupa comidas por día local, del más reciente al más antiguo.
 * Con `includeToday` siempre aparece el día de hoy aunque no tenga comidas.
 */
export const groupMealsByDay = (meals = [], { includeToday = false } = {}) => {
  const byDay = {};
  for (const meal of meals) {
    if (!meal?.created_at) continue;
    const key = localDateKey(meal.created_at);
    (byDay[key] ||= []).push(meal);
  }
  if (includeToday) byDay[localDateKey()] ||= [];

  return Object.keys(byDay)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => buildDayGroup(key, byDay[key]));
};

/** Suma un campo numérico agrupado por día local → { 'YYYY-MM-DD': total } */
export const sumByDay = (rows = [], field, dateField = 'created_at') =>
  rows.reduce((acc, row) => {
    const raw = row?.[dateField];
    if (!raw) return acc;
    // Si ya es una fecha "YYYY-MM-DD" (columna date) no la convertimos para no desplazarla
    const key = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : localDateKey(raw);
    acc[key] = (acc[key] || 0) + (Number(row[field]) || 0);
    return acc;
  }, {});

/** Lista de las últimas `n` claves de día, de la más antigua a la más reciente. */
export const lastNDays = (n) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return localDateKey(d);
  });

// ---- Franjas del día (no hay columna de tipo de comida: se deduce por la hora) ----
export const MEAL_SLOTS = [
  { id: 'desayuno', label: 'Desayuno', icon: '🌅', until: 11 },
  { id: 'comida', label: 'Comida', icon: '🍽️', until: 16 },
  { id: 'merienda', label: 'Merienda', icon: '🥪', until: 20 },
  { id: 'cena', label: 'Cena', icon: '🌙', until: 24 },
];

export const slotForDate = (date) => {
  const h = new Date(date).getHours();
  return MEAL_SLOTS.find((s) => h < s.until) || MEAL_SLOTS.at(-1);
};

/** Agrupa las comidas de un día por franja, omitiendo las vacías. */
export const groupBySlot = (meals = []) =>
  MEAL_SLOTS.map((slot) => {
    const items = meals.filter((m) => slotForDate(m.created_at).id === slot.id);
    return { ...slot, meals: items, calories: items.reduce((s, m) => s + (Number(m.calories) || 0), 0) };
  }).filter((s) => s.meals.length > 0);

/**
 * Días consecutivos con al menos una comida registrada.
 * Si hoy aún no hay registros, la racha cuenta hasta ayer (no se rompe a primera hora).
 */
export const calculateStreak = (meals = []) => {
  const days = new Set(meals.filter((m) => m?.created_at).map((m) => localDateKey(m.created_at)));
  const cursor = new Date();
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};
