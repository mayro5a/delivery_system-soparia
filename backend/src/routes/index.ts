import { Router } from 'express';
import authRoutes from './auth.routes';
import publicRoutes from './public.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/', publicRoutes);

export default router;
