-- Novo campo obrigatório: e-mail do cliente, usado para enviar os avisos de
-- pedido confirmado e "saiu para entrega". Pedidos já existentes (dev/teste)
-- recebem um valor temporário só para satisfazer a coluna NOT NULL; nenhum
-- pedido real depende disso.

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "customerEmail" TEXT NOT NULL DEFAULT 'sememail@sopariadale.com';
ALTER TABLE "orders" ALTER COLUMN "customerEmail" DROP DEFAULT;
