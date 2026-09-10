import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDeliveryRegions } from '../services/catalog';
import { createOrder, rememberOrderToken } from '../services/orders';
import { getApiErrorMessage } from '../services/api';
import { DeliveryRegion } from '../types';
import { DeliveryFormValues } from '../validations/checkoutSchema';
import { useCartStore } from '../store/cartStore';
import { StepIndicator } from '../components/checkout/StepIndicator';
import { ReviewStep } from '../components/checkout/ReviewStep';
import { DeliveryForm } from '../components/checkout/DeliveryForm';
import { Spinner } from '../components/ui/Spinner';

/**
 * Checkout em 3 etapas: (1) carrinho, (2) entrega, (3) pagamento.
 * A etapa 3 acontece na página do pedido (/pedido/:id), criada assim que o
 * cliente confirma a entrega — o backend recalcula o total e é esse valor
 * que o Mercado Pago cobra.
 */
export function Checkout() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [deliveryData, setDeliveryData] = useState<DeliveryFormValues | null>(null);
  const [regions, setRegions] = useState<DeliveryRegion[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clear);

  useEffect(() => {
    fetchDeliveryRegions()
      .then(setRegions)
      .catch(() => setRegions([]))
      .finally(() => setLoadingRegions(false));
  }, []);

  async function handleDeliverySubmit(values: DeliveryFormValues) {
    setDeliveryData(values);
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createOrder({
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          observation: item.observation || undefined,
        })),
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        cep: values.cep,
        street: values.street,
        addressNumber: values.addressNumber,
        neighborhood: values.neighborhood,
        complement: values.complement || undefined,
        reference: values.reference || undefined,
        city: values.city,
        state: values.state,
        deliveryRegionId: values.deliveryRegionId,
      });

      rememberOrderToken(result.order.id, result.accessToken);
      clearCart();
      navigate(`/pedido/${result.order.id}?token=${encodeURIComponent(result.accessToken)}`, { replace: true });
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-64px)] max-w-2xl px-4 py-4 sm:py-6">
      <StepIndicator current={step} />

      {step === 1 && <ReviewStep onNext={() => setStep(2)} />}

      {step === 2 &&
        (loadingRegions ? (
          <Spinner label="Carregando regiões de entrega..." />
        ) : (
          <DeliveryForm
            deliveryRegions={regions}
            subtotal={subtotal}
            defaultValues={deliveryData ?? undefined}
            isSubmitting={isSubmitting}
            submitError={submitError}
            onBack={() => setStep(1)}
            onSubmit={handleDeliverySubmit}
          />
        ))}
    </div>
  );
}
