import { Router } from 'express';
import scannerRoutes from './scanner.routes';
import blockchainRoutes from './blockchain.routes';
import eventRoutes from './event.routes';

const router = Router();

// Mount all route modules
router.use('/scanner', scannerRoutes);
router.use('/blockchains', blockchainRoutes);
router.use('/events', eventRoutes);

export default router;
