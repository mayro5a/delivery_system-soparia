import { Router } from 'express';
import * as productController from '../controllers/product.controller';
import * as categoryController from '../controllers/category.controller';
import * as regionController from '../controllers/deliveryRegion.controller';
import * as orderController from '../controllers/order.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createProductSchema, updateAvailabilitySchema, updateProductSchema } from '../validations/product.schema';
import { createCategorySchema, updateCategorySchema } from '../validations/category.schema';
import { createDeliveryRegionSchema, updateDeliveryRegionSchema } from '../validations/deliveryRegion.schema';
import { updateOrderStatusSchema } from '../validations/order.schema';

const router = Router();

// Todas as rotas abaixo exigem um administrador autenticado.
router.use(requireAuth);

router.get('/dashboard', asyncHandler(orderController.dashboard));

router.get('/orders', asyncHandler(orderController.list));
router.get('/orders/:id', asyncHandler(orderController.getOne));
router.patch('/orders/:id/status', validate(updateOrderStatusSchema), asyncHandler(orderController.updateStatus));

router.get('/products', asyncHandler(productController.listAdmin));
router.post('/products', validate(createProductSchema), asyncHandler(productController.create));
router.put('/products/:id', validate(updateProductSchema), asyncHandler(productController.update));
router.delete('/products/:id', asyncHandler(productController.remove));
router.patch(
  '/products/:id/availability',
  validate(updateAvailabilitySchema),
  asyncHandler(productController.updateAvailability),
);

router.get('/categories', asyncHandler(categoryController.list));
router.post('/categories', validate(createCategorySchema), asyncHandler(categoryController.create));
router.put('/categories/:id', validate(updateCategorySchema), asyncHandler(categoryController.update));
router.delete('/categories/:id', asyncHandler(categoryController.remove));

router.get('/delivery-regions', asyncHandler(regionController.listAdmin));
router.post('/delivery-regions', validate(createDeliveryRegionSchema), asyncHandler(regionController.create));
router.put('/delivery-regions/:id', validate(updateDeliveryRegionSchema), asyncHandler(regionController.update));
router.delete('/delivery-regions/:id', asyncHandler(regionController.remove));

export default router;
