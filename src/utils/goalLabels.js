export const GOAL_OPTIONS = {
  perder_grasa: {
    label: 'Perder grasa',
    short: 'Definición',
    accent: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  mantener: {
    label: 'Mantener peso',
    short: 'Mantenimiento',
    accent: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  ganar_masa: {
    label: 'Ganar masa',
    short: 'Volumen',
    accent: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
};

export const getGoalMeta = (goal) => GOAL_OPTIONS[goal] || GOAL_OPTIONS.mantener;
