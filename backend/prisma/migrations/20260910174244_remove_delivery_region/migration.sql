-- Taxa de entrega passou a ser fixa e o bairro virou texto livre (sem
-- restrição a uma lista cadastrada), então a região de entrega deixou de
-- ser usada em qualquer lugar do sistema.

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_deliveryRegionId_fkey";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "deliveryRegionId";

-- DropTable
DROP TABLE "delivery_regions";
