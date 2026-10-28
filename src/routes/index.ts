import { Router } from 'express';
import { curlResponse } from '../middlewares/curlResponse';
import markController from '../modules/mark/mark.controller';
import studentController from '../modules/student/student.controller';
import userController from '../modules/user/user.controller';
import { sendSuccess } from '../utils/response';

/**
 * Root router, mounted at /api in app.ts.
 *
 * Express runs the handlers passed to router.use / router.get from left to right.
 * Each middleware does its job and calls next() to hand the request to the next one:
 *
 *   /api/users  ->  curlResponse --next()-->  userController (route + validateBody --next()--> handler)
 *
 * If anything throws, rejects, or calls next(err), Express skips the rest of the
 * chain and jumps to errorHandler in app.ts.
 */
const router = Router();

router.get('/health', (_req, res) => {
  sendSuccess(res, { status: 'ok', uptime: process.uptime() }, 'Server is healthy');
});

// Register each feature module here: router.use(path, ...middlewares, controller)
router.use('/users', curlResponse, userController);
router.use('/students', curlResponse, studentController);
router.use('/marks', curlResponse, markController);

/** Demo: an async handler that rejects. Proves the error is caught, not a process crash. */
router.get('/demo/async-error', async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  throw new Error('Boom! Async failure inside a route');
});

export default router;
