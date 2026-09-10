import { CupSoda, IceCream2, LucideIcon, Salad, Soup, UtensilsCrossed } from 'lucide-react';

/**
 * Ícone por categoria — usado nas abas e no espaço reservado dos cards de
 * produto sem foto. O admin pode criar novas categorias; as desconhecidas
 * caem no ícone genérico.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Sopas: Soup,
  Outros: Salad,
  Acompanhamentos: Salad,
  Sobremesas: IceCream2,
  Refrigerantes: CupSoda,
  Bebidas: CupSoda,
};

export function getCategoryIcon(categoryName: string): LucideIcon {
  return CATEGORY_ICONS[categoryName] ?? UtensilsCrossed;
}
