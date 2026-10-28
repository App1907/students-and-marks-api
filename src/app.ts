import express from 'express';
import { setupSwagger } from './docs/swagger';
import { errorHandler } from './middlewares/errorHandler';
import { notFoundHandler } from './middlewares/notFound';
import { rejectDangerousPayload } from './middlewares/rejectDangerousPayload';
import { requestLogger } from './middlewares/requestLogger';
import routes from './routes';

/**
 * Request lifecycle:
 *   requestLogger → express.json → rejectDangerousPayload → /api → notFound → errorHandler
 */
const app = express();

app.use(requestLogger);
app.use(express.json({ limit: '100kb' }));
app.use(rejectDangerousPayload);

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Students & Marks API',
    data: {
      health: '/api/health',
      docs: '/api/docs',
      students: '/api/students',
      marksAverages: '/api/marks/averages?className=7',
    },
  });
});

setupSwagger(app);
app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
