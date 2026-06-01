/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import apiRouter from './server/routes/api';
import { initDatabase, getDb } from './server/db';
import { sendLowStockAlertEmail } from './server/services/email';
import dotenv from 'dotenv';

dotenv.config();

async function runDailyEmailAlertCheck() {
  try {
    const db = getDb();
    const settings = db.emailSettings;
    if (!settings || !settings.active || !settings.sendDailyAlerts) {
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const lastSentStr = settings.lastAlertSentAt ? settings.lastAlertSentAt.split('T')[0] : '';

    if (todayStr !== lastSentStr) {
      console.log(`[Scheduler] Automated daily stock level scanner triggered. Today: ${todayStr}, Previous: ${lastSentStr}`);
      await sendLowStockAlertEmail(false);
    }
  } catch (err) {
    console.error('[Scheduler] Automated stock diagnostic job failing:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Boot the local disk storage databases
  await initDatabase();

  // Run initial scheduler check 15 seconds after startup, then every 1 hour
  setTimeout(() => {
    runDailyEmailAlertCheck().catch(err => console.error('[Scheduler] Startup check fail:', err));
  }, 15000);

  setInterval(() => {
    runDailyEmailAlertCheck().catch(err => console.error('[Scheduler] Periodic check fail:', err));
  }, 3600000);

  // Middleware for robust body request decoding
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Register REST endpoints
  app.use('/api', apiRouter);

  // Development vs Production file pipelines integration
  if (process.env.NODE_ENV !== 'production') {
    console.log('Mounting development Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving production compiled files from dist/ ...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`🚀 MR KIÊN ERP WAREHOUSE RUNNING ON HOST 0.0.0.0:${PORT}`);
    console.log(`===============================================`);
  });
}

// Global exception catches
process.on('uncaughtException', (err) => {
  console.error('CRITICAL UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL UNHANDLED REJECTION:', reason);
});

startServer();
