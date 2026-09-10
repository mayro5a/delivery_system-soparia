import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '../types';

interface AddItemInput {
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  unitPrice: number;
  quantity: number;
  observation?: string;
  image?: string | null;
}

interface CartState {
  items: CartItem[];
  addItem: (input: AddItemInput) => void;
  removeItem: (key: string) => void;
  incrementItem: (key: string) => void;
  decrementItem: (key: string) => void;
  updateObservation: (key: string, observation: string) => void;
  clear: () => void;
  subtotal: () => number;
  totalQuantity: () => number;
}

function buildKey(productId: string, variantId: string | null | undefined, observation: string) {
  return `${productId}::${variantId ?? ''}::${observation.trim().toLowerCase()}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (input) => {
        const observation = input.observation?.trim() ?? '';
        const key = buildKey(input.productId, input.variantId, observation);

        set((state) => {
          const existing = state.items.find((item) => item.key === key);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.key === key ? { ...item, quantity: item.quantity + input.quantity } : item,
              ),
            };
          }
          const newItem: CartItem = {
            key,
            productId: input.productId,
            variantId: input.variantId ?? null,
            productName: input.productName,
            variantName: input.variantName ?? null,
            unitPrice: input.unitPrice,
            quantity: input.quantity,
            observation,
            image: input.image ?? null,
          };
          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (key) => set((state) => ({ items: state.items.filter((item) => item.key !== key) })),

      incrementItem: (key) =>
        set((state) => ({
          items: state.items.map((item) => (item.key === key ? { ...item, quantity: item.quantity + 1 } : item)),
        })),

      decrementItem: (key) =>
        set((state) => ({
          items: state.items
            .map((item) => (item.key === key ? { ...item, quantity: item.quantity - 1 } : item))
            .filter((item) => item.quantity > 0),
        })),

      updateObservation: (key, observation) =>
        set((state) => ({
          items: state.items.map((item) => (item.key === key ? { ...item, observation } : item)),
        })),

      clear: () => set({ items: [] }),

      subtotal: () => get().items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),

      totalQuantity: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: 'soparia:cart' },
  ),
);
