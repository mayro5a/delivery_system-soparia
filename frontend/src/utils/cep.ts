/** Aplica a máscara 00000-000 enquanto o usuário digita. */
export function maskCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export interface CepAddress {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

/**
 * Consulta o CEP no ViaCEP (serviço público e gratuito) para preencher o
 * endereço automaticamente. Falhas são silenciosas: o cliente pode digitar
 * o endereço à mão.
 */
export async function lookupCep(cep: string): Promise<CepAddress | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return null;

    const data = (await response.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) return null;

    return {
      street: data.logradouro ?? '',
      neighborhood: data.bairro ?? '',
      city: data.localidade ?? '',
      state: data.uf ?? '',
    };
  } catch {
    return null;
  }
}
