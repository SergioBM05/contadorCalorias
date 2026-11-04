/** Anillo de progreso de calorías (SVG). Se vuelve naranja/rojo al pasarse del objetivo. */
export default function CalorieRing({ consumed, target, size = 168, stroke = 14, animate = true }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = target ? consumed / target : 0;
  const shown = Math.min(ratio, 1);
  const offset = circumference * (1 - (animate ? shown : 0));
  const remaining = Math.round(target - consumed);
  const over = remaining < 0;
  const color = ratio > 1.1 ? '#ef4444' : over ? '#f97316' : 'var(--accent)';

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${Math.round(consumed)} de ${target} kcal`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-black uppercase tracking-wider text-(--text)">{over ? 'Te pasas' : 'Te quedan'}</span>
        <span className={`text-3xl font-black tracking-tighter ${over ? 'text-orange-500' : 'text-(--text-h)'}`}>
          {Math.abs(remaining).toLocaleString('es-ES')}
        </span>
        <span className="text-[10px] font-bold text-(--text)">kcal</span>
      </div>
    </div>
  );
}
