/** Formata um número como moeda brasileira, ex: 72 -> "R$ 72,00". */
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
