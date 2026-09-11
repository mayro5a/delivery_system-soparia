/**
 * Taxa de entrega fixa cobrada em todos os pedidos, independente do
 * bairro/região selecionado. Mantida em espelho com
 * `backend/src/config/constants.ts` (FIXED_DELIVERY_FEE) — o valor cobrado
 * de verdade é sempre calculado no servidor.
 */
export const FIXED_DELIVERY_FEE = 2;
