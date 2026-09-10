import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema } from '../validations/auth.schema';

const router = Router();

router.post('/login', validate(loginSchema), asyncHandler(authController.login));

export default router;
