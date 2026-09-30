import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/server.js';

async function startServer() {
  const app = await createApp();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const clientDir = path.resolve(process.cwd(), 'client');

  // Explicit HTML page routes
  const pageRoutes = [
    { path: '/', file: 'index.html' },
    { path: '/login', file: 'login.html' },
    { path: '/login.html', file: 'login.html' },
    { path: '/register', file: 'register.html' },
    { path: '/register.html', file: 'register.html' },
    { path: '/dashboard', file: 'dashboard.html' },
    { path: '/dashboard.html', file: 'dashboard.html' },
    { path: '/profile', file: 'profile.html' },
    { path: '/profile.html', file: 'profile.html' },
    { path: '/scholarships', file: 'scholarships.html' },
    { path: '/scholarships.html', file: 'scholarships.html' },
    { path: '/scholarship-details', file: 'scholarship-details.html' },
    { path: '/scholarship-details.html', file: 'scholarship-details.html' },
    { path: '/applications', file: 'applications.html' },
    { path: '/applications.html', file: 'applications.html' },
    { path: '/application-details', file: 'application-details.html' },
    { path: '/application-details.html', file: 'application-details.html' },
    { path: '/notifications', file: 'notifications.html' },
    { path: '/notifications.html', file: 'notifications.html' },
    { path: '/institute', file: 'institute/dashboard.html' },
    { path: '/institute/dashboard', file: 'institute/dashboard.html' },
    { path: '/institute/dashboard.html', file: 'institute/dashboard.html' },
    { path: '/admin', file: 'admin/dashboard.html' },
    { path: '/admin/dashboard', file: 'admin/dashboard.html' },
    { path: '/admin/dashboard.html', file: 'admin/dashboard.html' },
    { path: '/admin/students', file: 'admin/students.html' },
    { path: '/admin/students.html', file: 'admin/students.html' },
    { path: '/admin/scholarships', file: 'admin/scholarships.html' },
    { path: '/admin/scholarships.html', file: 'admin/scholarships.html' },
    { path: '/admin/applications', file: 'admin/applications.html' },
    { path: '/admin/applications.html', file: 'admin/applications.html' },
    { path: '/admin/analytics', file: 'admin/analytics.html' },
    { path: '/admin/analytics.html', file: 'admin/analytics.html' },
    { path: '/admin/audit-logs', file: 'admin/audit-logs.html' },
    { path: '/admin/audit-logs.html', file: 'admin/audit-logs.html' },
  ];

  pageRoutes.forEach((route) => {
    app.get(route.path, (req, res, next) => {
      const targetPath = path.join(clientDir, route.file);
      if (fs.existsSync(targetPath)) {
        res.sendFile(targetPath);
      } else {
        next();
      }
    });
  });

  // Mount Vite development middlewares
  if (process.env.NODE_ENV !== 'production') {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
        appType: 'custom',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('[Server] Vite middleware initialization note:', e);
    }
  }

  // Fallback for static client files or SPA routing
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      const possibleFile = path.join(clientDir, req.path);
      if (fs.existsSync(possibleFile) && fs.statSync(possibleFile).isFile()) {
        return res.sendFile(possibleFile);
      }
      return res.sendFile(path.join(clientDir, 'index.html'));
    }
    next();
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TribalScholar AI] Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[TribalScholar AI] Fatal server error:', err);
  process.exit(1);
});
