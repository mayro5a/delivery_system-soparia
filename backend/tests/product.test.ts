import { beforeEach, describe, expect, it } from 'vitest';
import { updateAvailability, listPublicProducts, updateProduct } from '../src/services/product.service';
import { resetDatabase, createTestCategory, createTestProduct } from './helpers';

describe('product.service - disponibilidade e edição', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('marca produto como esgotado e reflete na listagem pública (RF07)', async () => {
    const category = await createTestCategory();
    const product = await createTestProduct(category.id, { name: 'Canja', available: true });

    await updateAvailability(product.id, false);

    const products = await listPublicProducts();
    const canja = products.find((p) => p.id === product.id);
    expect(canja?.available).toBe(false);
  });

  it('altera o preço do produto e reflete na listagem pública (RF08)', async () => {
    const category = await createTestCategory();
    const product = await createTestProduct(category.id, { name: 'Lasanha', price: 15 });

    await updateProduct(product.id, { price: 18.5 });

    const products = await listPublicProducts();
    const lasanha = products.find((p) => p.id === product.id);
    expect(lasanha?.price).toBe(18.5);
  });
});
