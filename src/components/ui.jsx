import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, X } from 'lucide-react';

export function FullScreenLoader({ message }) {
  return (
    <div className="min-h-screen bg-(--bg) flex flex-col items-center justify-center gap-4" role="status">
      <Loader2 className="w-8 h-8 animate-spin text-(--accent)" />
      {message && <p className="text-sm text-(--text) animate-pulse">{message}</p>}
    </div>
  );
}

/** Cabecera común de las páginas secundarias */
export function PageHeader({ title, icon: Icon, right, backTo = '/' }) {
  const navigate = useNavigate();
  return (
    <header className="flex justify-between items-center gap-2 bg-(--card-bg) border border-(--border) p-3 rounded-2xl shadow-(--shadow)">
      <button
        type="button"
        onClick={() => navigate(backTo)}
        aria-label="Volver"
        className="p-2.5 border border-(--border) rounded-xl bg-(--bg) text-(--text-h) hover:bg-(--border) transition"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <h1 className="text-sm font-black tracking-tight uppercase flex items-center gap-2 text-(--text-h) truncate">
        {Icon && <Icon className="w-4 h-4 text-(--accent) shrink-0" />}
        {title}
      </h1>
      <div className="flex items-center gap-2 min-w-10 justify-end">{right}</div>
    </header>
  );
}

export function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`bg-(--card-bg) border border-(--border) rounded-3xl shadow-(--shadow) ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/** Modal accesible: cierra con Escape o clic fuera */
export function Modal({ open, onClose, title, icon: Icon, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-[60]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-(--card-bg) border border-(--border) w-full max-w-md p-6 rounded-3xl space-y-4 shadow-2xl animate-fade-up">
        <div className="flex justify-between items-center border-b border-(--border) pb-3">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-(--accent)" />}
            <h2 className="font-bold text-lg text-(--text-h)">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 bg-(--bg) border border-(--border) rounded-full text-(--text) hover:bg-(--border)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
