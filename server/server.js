import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase, getDbType } from './config/database.js';
import errorHandler from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import scholarshipRoutes from './routes/scholarshipRoutes.js';
import fellowshipRoutes from './routes/fellowshipRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import instituteRoutes from './routes/instituteRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

export async function createApp() {
  const app = express();

  // Initialize database
  await initDatabase();

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static uploads directory
  const uploadsDir = path.resolve(process.cwd(), 'server/uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Serve static client assets (CSS, JS)
  const clientDir = path.resolve(process.cwd(), 'client');
  app.use(express.static(clientDir));

  // Health check & System info endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      system: 'TribalScholar AI API',
      database: getDbType(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // REST API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/scholarships', scholarshipRoutes);
  app.use('/api/fellowships', fellowshipRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/institute', instituteRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/ai', aiRoutes);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp;
