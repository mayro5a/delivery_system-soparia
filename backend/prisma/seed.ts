import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

/**
 * Seed idempotente: pode ser executado várias vezes sem duplicar registros.
 * Preços iniciais vêm do cardápio da Soparia da Lê e podem ser alterados
 * depois pelo painel administrativo (o site sempre lê do banco).
 */
async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // ---- Categorias ----
  const categories = [
    { name: 'Sopas', description: 'Sopas quentinhas, feitas na hora com muito carinho', order: 1 },
    { name: 'Outros', description: 'Para acompanhar ou adoçar', order: 2 },
    { name: 'Refrigerantes', description: 'Bem geladinhos', order: 3 },
  ];

  const categoryMap: Record<string, string> = {};
  for (const category of categories) {
    const created = await prisma.category.upsert({
      where: { name: category.name },
      update: { description: category.description, order: category.order },
      create: category,
    });
    categoryMap[category.name] = created.id;
  }

  // ---- Produtos simples ----
  const products = [
    {
      name: 'Sopa de Carne',
      description: 'Caldo encorpado com carne macia, legumes e temperos da casa.',
      price: 20.0,
      category: 'Sopas',
    },
    {
      name: 'Canja',
      description: 'Canja de galinha tradicional, com arroz, frango desfiado e cheiro-verde.',
      price: 20.0,
      category: 'Sopas',
    },
    {
      name: 'Sopa de Mocotó',
      description: 'Mocotó cozido lentamente, do jeito caseiro, com feijão e legumes.',
      price: 20.0,
      category: 'Sopas',
    },
    {
      name: 'Lasanha',
      description: 'Lasanha à bolonhesa, porção individual, gratinada no forno.',
      price: 15.0,
      category: 'Outros',
    },
    {
      name: 'Salada de Frutas 300ml',
      description: 'Frutas frescas selecionadas, copo de 300ml.',
      price: 10.0,
      category: 'Outros',
    },
  ];

  for (const product of products) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } });
    if (!existing) {
      await prisma.product.create({
        data: {
          name: product.name,
          description: product.description,
          price: product.price,
          available: true,
          categoryId: categoryMap[product.category],
        },
      });
    }
  }

  // ---- Refrigerante (produto com sabores/variações) ----
  let refrigerante = await prisma.product.findFirst({ where: { name: 'Refrigerante Lata 350ml' } });
  if (!refrigerante) {
    refrigerante = await prisma.product.create({
      data: {
        name: 'Refrigerante Lata 350ml',
        description: 'Escolha o sabor. Servido bem gelado.',
        price: 6.0,
        available: true,
        hasVariants: true,
        categoryId: categoryMap['Refrigerantes'],
      },
    });
  }

  const flavors = ['Coca-Cola', 'Coca-Cola Zero', 'Guaraná Antarctica', 'Fanta Laranja'];
  for (const flavor of flavors) {
    const existingVariant = await prisma.productVariant.findFirst({
      where: { productId: refrigerante.id, name: flavor },
    });
    if (!existingVariant) {
      await prisma.productVariant.create({
        data: { name: flavor, price: 6.0, available: true, productId: refrigerante.id },
      });
    }
  }

  // ---- Regiões de entrega (bairros de Manaus, ajuste pelo painel) ----
  const regions = [
    { name: 'Centro', fee: 5.0 },
    { name: 'Adrianópolis', fee: 6.0 },
    { name: 'Aleixo', fee: 6.0 },
    { name: 'Parque 10 de Novembro', fee: 7.0 },
    { name: 'Flores', fee: 8.0 },
    { name: 'Cidade Nova', fee: 10.0 },
    { name: 'Cachoeirinha', fee: 8.0 },
    { name: 'Coroado', fee: 9.0 },
  ];
  for (const region of regions) {
    await prisma.deliveryRegion.upsert({
      where: { name: region.name },
      update: {},
      create: { name: region.name, fee: region.fee, available: true },
    });
  }

  // ---- Usuário administrador (credenciais SEMPRE via variáveis de ambiente) ----
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME ?? 'Administrador';

  if (!adminEmail || !adminPassword) {
    console.warn('⚠️  ADMIN_EMAIL/ADMIN_PASSWORD não definidos no .env — administrador NÃO foi criado.');
  } else if (process.env.NODE_ENV === 'production' && adminPassword.length < 10) {
    console.warn('⚠️  ADMIN_PASSWORD muito curta para produção (mínimo 10 caracteres) — administrador NÃO foi criado.');
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { name: adminName },
      create: { name: adminName, email: adminEmail, password: hashedPassword, role: 'ADMIN' },
    });
    console.log(`   Administrador: ${adminEmail} (senha definida em ADMIN_PASSWORD no .env)`);
  }

  console.log('✅ Seed concluído com sucesso!');
}

main()
  .catch((err) => {
    console.error('❌ Erro ao executar seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
