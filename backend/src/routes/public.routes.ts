import { Router } from 'express';
import * as productController from '../controllers/product.controller';
import * as categoryController from '../controllers/category.controller';
import * as regionController from '../controllers/deliveryRegion.controller';
import * as orderController from '../controllers/order.controller';
import * as paymentController from '../controllers/payment.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middlewares/validate.middleware';
import { createOrderSchema, getOrderSchema } from '../validations/order.schema';
import { createPaymentSchema, getPaymentSchema } from '../validations/payment.schema';

const router = Router();

// Cardápio público — sempre reflete o que está no banco.
router.get('/products', asyncHandler(productController.listPublic));
router.get('/categories', asyncHandler(categoryController.list));
router.get('/delivery-regions', asyncHandler(regionController.listPublic));

// Pedido — o backend recalcula todos os valores antes de gravar.
router.post('/orders', validate(createOrderSchema), asyncHandler(orderController.create));
router.get('/orders/:id', validate(getOrderSchema), asyncHandler(orderController.getOneForCustomer));

// Pagamento (Mercado Pago)
router.get('/payments/config', asyncHandler(paymentController.config));
router.post('/payments', validate(createPaymentSchema), asyncHandler(paymentController.create));
router.post('/payments/webhook', asyncHandler(paymentController.webhook));
router.get('/payments/:id', validate(getPaymentSchema), asyncHandler(paymentController.getOne));

export default router;
