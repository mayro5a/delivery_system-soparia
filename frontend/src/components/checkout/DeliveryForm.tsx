import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2, MapPin, MessageCircle, Truck } from 'lucide-react';
import { DeliveryRegion } from '../../types';
import { deliveryFormSchema, DeliveryFormValues } from '../../validations/checkoutSchema';
import { maskPhone } from '../../utils/phone';
import { lookupCep, maskCep } from '../../utils/cep';
import { formatCurrency } from '../../utils/currency';
import { WHATSAPP_CONTACT_URL } from '../../utils/whatsapp';
import { Button } from '../ui/Button';

const inputClass =
  'w-full rounded-xl border border-broth-700/25 bg-cream-50 px-3 py-3 text-broth-900 placeholder:text-broth-700/40 focus:border-brand-500';

function Field({
  label,
  htmlFor,
  optional,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold text-broth-900">
        {label} {optional && <span className="font-normal text-broth-700/70">(opcional)</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-brand-600">{error}</p>}
    </div>
  );
}

export function DeliveryForm({
  deliveryRegions,
  subtotal,
  defaultValues,
  isSubmitting,
  submitError,
  onBack,
  onSubmit,
}: {
  deliveryRegions: DeliveryRegion[];
  subtotal: number;
  defaultValues?: Partial<DeliveryFormValues>;
  isSubmitting: boolean;
  submitError?: string | null;
  onBack: () => void;
  onSubmit: (data: DeliveryFormValues) => void;
}) {
  const availableRegions = deliveryRegions.filter((r) => r.available);
  const [cepLoading, setCepLoading] = useState(false);
  const lastLookup = useRef<string>('');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      cep: '',
      street: '',
      addressNumber: '',
      deliveryRegionId: '',
      neighborhood: '',
      complement: '',
      reference: '',
      city: 'Manaus',
      state: 'AM',
      ...defaultValues,
    },
  });

  const cep = watch('cep');
  const selectedRegionId = watch('deliveryRegionId');
  const selectedRegion = availableRegions.find((r) => r.id === selectedRegionId);
  const deliveryFee = selectedRegion?.fee ?? 0;
  const total = subtotal + deliveryFee;

  // Preenche o endereço automaticamente quando o CEP fica completo.
  useEffect(() => {
    const digits = (cep ?? '').replace(/\D/g, '');
    if (digits.length !== 8 || lastLookup.current === digits) return;
    lastLookup.current = digits;

    let active = true;
    setCepLoading(true);
    lookupCep(digits)
      .then((address) => {
        if (!active || !address) return;
        if (address.street) setValue('street', address.street, { shouldValidate: true });
        if (address.city) setValue('city', address.city, { shouldValidate: true });
        if (address.state) setValue('state', address.state, { shouldValidate: true });
        if (address.neighborhood) {
          setValue('neighborhood', address.neighborhood, { shouldValidate: true });
          // Se o bairro do CEP for uma região cadastrada, já seleciona.
          const match = availableRegions.find(
            (r) => r.name.localeCompare(address.neighborhood, 'pt-BR', { sensitivity: 'base' }) === 0,
          );
          if (match && !getValues('deliveryRegionId')) {
            setValue('deliveryRegionId', match.id, { shouldValidate: true });
          }
        }
      })
      .finally(() => {
        if (active) setCepLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cep]);

  if (availableRegions.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-bold text-broth-900">Dados de entrega</h2>
        <div className="rounded-2xl border border-gold-500/50 bg-gold-500/10 p-4 text-sm text-broth-800">
          <p className="flex items-start gap-2 font-semibold">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-gold-600" />
            Nenhuma região de entrega está ativa no momento.
          </p>
          <p className="mt-2">Fale com a gente pelo WhatsApp para combinar a entrega.</p>
          <a
            href={WHATSAPP_CONTACT_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-basil-500 px-4 py-2 font-semibold text-white hover:bg-basil-600"
          >
            <MessageCircle size={16} /> Chamar no WhatsApp
          </a>
        </div>
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div>
        <h2 className="font-display text-2xl font-bold text-broth-900">Dados de entrega</h2>
        <p className="text-sm text-broth-700">A taxa de entrega é calculada pelo bairro/região.</p>
      </div>

      <section className="grid gap-4 rounded-2xl bg-cream-50 p-4 shadow-card">
        <h3 className="font-display text-base font-semibold text-broth-800">Seus dados</h3>
        <Field label="Nome" htmlFor="customerName" error={errors.customerName?.message}>
          <input id="customerName" {...register('customerName')} autoComplete="name" className={inputClass} placeholder="Como devemos te chamar?" />
        </Field>
        <Field label="Telefone (WhatsApp)" htmlFor="customerPhone" error={errors.customerPhone?.message}>
          <Controller
            control={control}
            name="customerPhone"
            render={({ field }) => (
              <input
                id="customerPhone"
                value={field.value}
                onChange={(e) => field.onChange(maskPhone(e.target.value))}
                inputMode="tel"
                autoComplete="tel"
                placeholder="(92) 90000-0000"
                className={inputClass}
              />
            )}
          />
        </Field>
      </section>

      <section className="grid gap-4 rounded-2xl bg-cream-50 p-4 shadow-card">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold text-broth-800">
          <MapPin size={16} className="text-brand-600" /> Endereço
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <Field label="CEP" htmlFor="cep" error={errors.cep?.message}>
            <div className="relative">
              <Controller
                control={control}
                name="cep"
                render={({ field }) => (
                  <input
                    id="cep"
                    value={field.value}
                    onChange={(e) => field.onChange(maskCep(e.target.value))}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="69000-000"
                    className={inputClass}
                  />
                )}
              />
              {cepLoading && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-broth-700/60" />}
            </div>
          </Field>
          <Field label="Número" htmlFor="addressNumber" error={errors.addressNumber?.message}>
            <input id="addressNumber" {...register('addressNumber')} className={inputClass} placeholder="123" />
          </Field>
        </div>

        <Field label="Rua" htmlFor="street" error={errors.street?.message}>
          <input id="street" {...register('street')} autoComplete="address-line1" className={inputClass} placeholder="Rua, avenida, travessa..." />
        </Field>

        <Field label="Bairro/região de entrega" htmlFor="deliveryRegionId" error={errors.deliveryRegionId?.message}>
          <select
            id="deliveryRegionId"
            {...register('deliveryRegionId', {
              onChange: (e) => {
                const region = availableRegions.find((r) => r.id === e.target.value);
                if (region && !getValues('neighborhood')) {
                  setValue('neighborhood', region.name, { shouldValidate: true });
                }
              },
            })}
            className={inputClass}
          >
            <option value="">Selecione a região...</option>
            {availableRegions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name} — entrega {formatCurrency(region.fee)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-broth-700/80">
            Seu bairro não está na lista?{' '}
            <a href={WHATSAPP_CONTACT_URL} target="_blank" rel="noreferrer" className="font-semibold text-basil-600 underline">
              Fale conosco no WhatsApp
            </a>
            .
          </p>
        </Field>

        <Field label="Bairro (como consta no endereço)" htmlFor="neighborhood" error={errors.neighborhood?.message}>
          <input id="neighborhood" {...register('neighborhood')} autoComplete="address-level3" className={inputClass} />
        </Field>

        <Field label="Complemento" htmlFor="complement" optional error={errors.complement?.message}>
          <input id="complement" {...register('complement')} className={inputClass} placeholder="Apto, bloco, casa..." />
        </Field>

        <Field label="Ponto de referência" htmlFor="reference" optional error={errors.reference?.message}>
          <input id="reference" {...register('reference')} className={inputClass} placeholder="Próximo à..." />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="Cidade" htmlFor="city" error={errors.city?.message}>
              <input id="city" {...register('city')} autoComplete="address-level2" className={inputClass} />
            </Field>
          </div>
          <Field label="UF" htmlFor="state" error={errors.state?.message}>
            <input id="state" {...register('state')} maxLength={2} autoComplete="address-level1" className={`${inputClass} uppercase`} />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl bg-cream-50 p-4 shadow-card text-sm">
        <div className="flex justify-between text-broth-800">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="mt-1 flex justify-between text-broth-800">
          <span className="flex items-center gap-1.5">
            <Truck size={14} className="text-brand-600" /> Entrega
          </span>
          <span>{selectedRegion ? formatCurrency(deliveryFee) : 'selecione a região'}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-dashed border-broth-700/30 pt-2 font-display text-lg font-bold text-broth-900">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </section>

      {submitError && (
        <p className="flex items-start gap-1.5 rounded-xl border border-brand-500/30 bg-brand-50 px-3 py-2 text-sm text-brand-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {submitError}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" fullWidth onClick={onBack} disabled={isSubmitting}>
          Voltar
        </Button>
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Ir para o pagamento
        </Button>
      </div>
    </form>
  );
}
