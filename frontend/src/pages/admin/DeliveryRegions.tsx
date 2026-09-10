import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  createDeliveryRegion,
  deleteDeliveryRegion,
  fetchAdminDeliveryRegions,
  updateDeliveryRegion,
} from '../../services/admin';
import { getApiErrorMessage } from '../../services/api';
import { DeliveryRegion } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/currency';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { DeliveryRegionForm, DeliveryRegionFormData } from '../../components/admin/DeliveryRegionForm';

export function AdminDeliveryRegions() {
  const [regions, setRegions] = useState<DeliveryRegion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DeliveryRegion | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  function load() {
    setIsLoading(true);
    fetchAdminDeliveryRegions()
      .then(setRegions)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(data: DeliveryRegionFormData) {
    setIsSubmitting(true);
    try {
      if (editing) {
        await updateDeliveryRegion(editing.id, data);
        showToast('Região atualizada.');
      } else {
        await createDeliveryRegion(data);
        showToast('Região criada.');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(getApiErrorMessage(err), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(region: DeliveryRegion) {
    if (!confirm(`Excluir a região "${region.name}"?`)) return;
    try {
      await deleteDeliveryRegion(region.id);
      showToast('Região excluída.');
      load();
    } catch (err) {
      showToast(getApiErrorMessage(err), 'error');
    }
  }

  async function toggleAvailable(region: DeliveryRegion) {
    try {
      await updateDeliveryRegion(region.id, { available: !region.available });
      load();
    } catch (err) {
      showToast(getApiErrorMessage(err), 'error');
    }
  }

  if (isLoading) return <Spinner label="Carregando regiões..." />;
  if (error) return <EmptyState title="Não foi possível carregar as regiões." description={error} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-broth-900">Taxas de entrega</h1>
          <p className="text-sm text-broth-700">Configure as regiões e o valor da entrega para cada uma</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={18} /> Nova região
        </Button>
      </div>

      {regions.length === 0 ? (
        <EmptyState title="Nenhuma região cadastrada ainda." />
      ) : (
        <ul className="flex flex-col gap-2">
          {regions.map((region) => (
            <li
              key={region.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card"
            >
              <div className="min-w-0">
                <p className="font-medium text-broth-900">{region.name}</p>
                <p className="text-xs text-broth-700">{formatCurrency(region.fee)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleAvailable(region)} type="button">
                  {region.available ? <Badge tone="success">Ativa</Badge> : <Badge tone="neutral">Inativa</Badge>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(region);
                    setModalOpen(true);
                  }}
                  aria-label={`Editar ${region.name}`}
                  className="rounded-lg bg-broth-800/10 p-2 text-broth-800 hover:bg-broth-800/20"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(region)}
                  aria-label={`Excluir ${region.name}`}
                  className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar região' : 'Nova região'}>
        <DeliveryRegionForm region={editing} onCancel={() => setModalOpen(false)} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </Modal>
    </div>
  );
}
