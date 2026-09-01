import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { config } from './server/config/env';

// Security Middlewares
import {
  securityHeadersMiddleware,
  sanitizeInputMiddleware,
  csrfProtectionMiddleware,
  authenticateUser
} from './server/middleware/security';

// Route Imports
import projectRoutes from './server/routes/projectRoutes';
import proposalRoutes from './server/routes/proposalRoutes';
import pricingRoutes from './server/routes/pricingRoutes';
import auditRoutes from './server/routes/auditRoutes';
import integrationRoutes from './server/routes/integrationRoutes';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Basic security headers
  app.use(securityHeadersMiddleware);

  // 2. Global CORS configuration
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-user-id', 'x-user-name', 'x-user-role', 'x-user-email']
    })
  );

  // 3. API Specific Middlewares (JSON parsing, sanitization, CSRF, auth, logger)
  app.use('/api', express.json({ limit: '5mb' }));
  app.use('/api', express.urlencoded({ extended: true, limit: '5mb' }));
  app.use('/api', sanitizeInputMiddleware);
  app.use('/api', csrfProtectionMiddleware);
  app.use('/api', authenticateUser);

  // Request Logger & Execution Timing for API (PII-safe)
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.originalUrl !== '/api/health' && req.originalUrl !== '/api/status') {
        console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // Health check endpoint (Liveness probe for Cloud Run / Kubernetes / load balancers)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });

  // Safe readiness and status endpoint (Deep telemetry probe without secret leakage)
  app.get('/api/status', (_req: Request, res: Response) => {
    const memoryUsage = process.memoryUsage();
    res.status(200).json({
      status: 'ready',
      service: 'Greenscape Pro Proposal Intelligence Agent API',
      version: '1.0.0',
      environment: config.nodeEnv,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      subsystems: {
        geminiAi: {
          configured: !!config.geminiApiKey,
          model: 'gemini-3.7-flash',
          thinking: 'enabled',
          status: config.geminiApiKey ? 'OPERATIONAL' : 'HEURISTIC_FALLBACK'
        },
        database: {
          driver: 'in-memory-indexed-relational',
          status: 'CONNECTED'
        },
        integrations: {
          slackWebhookConfigured: !!config.slackWebhookUrl,
          ghlConfigured: !!config.ghlApiKey
        },
        memory: {
          rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
          heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024)
        }
      }
    });
  });

  // REST API Route Mounts
  app.use('/api/projects', projectRoutes);
  app.use('/api/proposals', proposalRoutes);
  app.use('/api/pricing', pricingRoutes);
  app.use('/api/audit-logs', auditRoutes);
  app.use('/api/integrations', integrationRoutes);

  // Global API 404 handler for unmatched /api/* routes
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `API endpoint ${req.method} ${req.originalUrl} not found`
      }
    });
  });

  // Vite Development / Production Static Server Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handling Middleware (after all routes and middlewares)
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error('[API Error]', err?.message || err);
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred'
      }
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Greenscape Pro Backend Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
