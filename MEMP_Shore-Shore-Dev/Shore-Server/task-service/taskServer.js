import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { execSync } from 'child_process';
import taskRoutes from './routes/taskRoutes.js';
import { getPool, ensureTaskUploadsDirectoryExists, taskUploadsDir, closeDbPool } from './utils/db.js';
import path from 'path';

const app = express();
const port = process.env.PORT || 7003;

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:5001';

console.log(`[TaskService] Configuring CORS for origins: ${clientUrl}, ${gatewayUrl}`);
const corsOptions = {
  origin: [clientUrl, gatewayUrl],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(morgan('dev'));

// NEW: No longer need to parse JSON here for routes with file uploads.
// The `multer` middleware will handle the body parsing.
// The routes file will now handle parsing with multer middleware.
// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/task_attachments', express.static(taskUploadsDir));
console.log(`[TaskService] Serving task attachments from: ${taskUploadsDir}`);
console.log(`[TaskService] Attachments will be available at route /task_attachments`);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'Task Service', timestamp: new Date().toISOString() });
});

// CORRECTED: This is the only line that needed to change from your original file.
// The routes are now mounted at the root ('/'), which is the correct pattern
// for a microservice that sits behind an API Gateway.
app.use('/', taskRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error("[TaskService Global Error Handler]", err.message, err.stack ? err.stack.substring(0,600) : '');
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
        error: err.message || 'An unexpected error occurred in Task Service.',
        details: process.env.NODE_ENV === 'development' && err.stack ? err.stack : (err.details || undefined)
    });
});

let serverInstance;

// Your original startServer and gracefulShutdown logic remains unchanged
const startServer = async () => {
  const portInUse = port; // <-- ADDED for port killer

    try {
        // ------------------------------
        // AUTO-KILL PORT HANDLER
        // ------------------------------
        // 🧩 Kill any process using this port (cross-platform)
        if (process.platform === 'win32') {
          try {
            const findCmd = `netstat -ano | findstr :${portInUse}`;
            const result = execSync(findCmd).toString();
            const lines = result.trim().split('\n');
    
            for (const line of lines) {
              const parts = line.trim().split(/\s+/);
              const pid = parts[parts.length - 1];
              if (pid && !isNaN(pid)) {
                console.log(`[TaskService] Port ${portInUse} is in use by PID ${pid}. Killing it...`);
                execSync(`taskkill /PID ${pid} /F`);
              }
            }
          } catch {
            // No process found using port
          }
        } else {
          try {
            execSync(`fuser -k ${portInUse}/tcp`);
          } catch {
            // Ignore if nothing found
          }
        }
        // ------------------------------
        // END AUTO-KILL PORT HANDLER
        // ------------------------------

        if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_DATABASE) {
            console.error("[TaskService] FATAL ERROR: One or more essential database configuration variables are missing from .env file. Please check DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE.");
            process.exit(1);
        }
        ensureTaskUploadsDirectoryExists();
        await getPool();

        serverInstance = app.listen(portInUse, () => { // <-- Use portInUse
            console.log(`🚀 Task Service running at http://localhost:${portInUse}`); // <-- Use portInUse
            console.log(`   DB: ${process.env.DB_HOST}${process.env.DB_INSTANCE_NAME ? '\\' + process.env.DB_INSTANCE_NAME : ''} -> ${process.env.DB_DATABASE}`);
        });

    } catch (error) {
        console.error(`[TaskService] Failed to start server during initial setup:`, error.message, error.stack);
        process.exit(1);
    }
};

const gracefulShutdown = async (signal) => {
    console.log(`[TaskService] Received ${signal}. Attempting graceful shutdown...`);
    if (serverInstance) {
        serverInstance.close(async () => {
            await closeDbPool();
            process.exit(0);
        });
    } else {
        await closeDbPool();
        process.exit(0);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
  // <-- The stray '.' was here
  console.error('[TaskService] Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('[TaskService] Uncaught Exception:', error);
  gracefulShutdown('uncaughtException').then(() => process.exit(1));
});

startServer();