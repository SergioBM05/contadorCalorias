import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, Loader2, Utensils } from 'lucide-react';
import { apiService } from '../services/api';
import { Modal } from './ui';
import MealForm from './MealForm';

/**
 * Botones de editar/borrar de un plato, con su modal de edición.
 * onUpdated(meal) y onDeleted(id) permiten al padre actualizar su estado sin recargar.
 */
export default function MealActions({ meal, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const updated = await apiService.updateMeal(meal.id, values);
      onUpdated?.({ ...meal, ...updated });
      toast.success('Plato actualizado');
      setEditing(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    toast(`¿Eliminar "${meal.dish}"?`, {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          setDeleting(true);
          try {
            await apiService.deleteMeal(meal.id);
            onDeleted?.(meal.id);
            toast.success('Plato eliminado');
          } catch (err) {
            toast.error(err.message);
            setDeleting(false);
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
    });
  };

  const btn = 'p-1.5 rounded-lg text-(--text) transition disabled:opacity-50';

  return (
    <>
      <div className="flex items-center gap-0.5 shrink-0">
        <button type="button" onClick={() => setEditing(true)} aria-label={`Editar ${meal.dish}`} className={`${btn} hover:text-(--accent) hover:bg-(--accent-bg)`}>
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={handleDelete} disabled={deleting} aria-label={`Eliminar ${meal.dish}`} className={`${btn} hover:text-red-500 hover:bg-red-500/10`}>
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Editar plato" icon={Utensils}>
        <MealForm initial={meal} onSubmit={handleSave} submitting={saving} submitLabel="Guardar cambios" />
      </Modal>
    </>
  );
}
