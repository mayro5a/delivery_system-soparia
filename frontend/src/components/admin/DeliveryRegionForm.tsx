import { useState } from 'react';
import { DeliveryRegion } from '../../types';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';

export interface DeliveryRegionFormData {
  name: string;
  fee: number;
  available: boolean;
}

export function DeliveryRegionForm({
  region,
  onCancel,
  onSubmit,
  isSubmitting,
}: {
  region: DeliveryRegion | null;
  onCancel: () => void;
  onSubmit: (data: DeliveryRegionFormData) => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(region?.name ?? '');
  const [fee, setFee] = useState(region?.fee?.toString() ?? '');
  const [available, setAvailable] = useState(region?.available ?? true);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const feeNumber = Number(fee);
    if (!name.trim() || name.trim().length < 2) return setError('Informe o nome do bairro/região.');
    if (Number.isNaN(feeNumber) || feeNumber < 0) return setError('Informe uma taxa válida.');
    setError(null);
    onSubmit({ name: name.trim(), fee: feeNumber, available });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <label htmlFor="regionName" className="mb-1 block text-sm font-semibold text-broth-900">
          Nome do bairro/região
        </label>
        <input
          id="regionName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-broth-800/20 px-3 py-2 focus:border-brand-500"
        />
      </div>
      <div>
        <label htmlFor="regionFee" className="mb-1 block text-sm font-semibold text-broth-900">
          Taxa de entrega
        </label>
        <input
          id="regionFee"
          type="number"
          step="0.01"
          min={0}
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className="w-full rounded-xl border border-broth-800/20 px-3 py-2 focus:border-brand-500"
        />
      </div>
      <div className="flex items-center justify-between rounded-xl bg-broth-800/5 px-3 py-2">
        <span className="text-sm font-semibold text-broth-900">Ativa</span>
        <Switch checked={available} onChange={setAvailable} label="Região ativa" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" fullWidth onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
