// auth-service/authServer.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process';
import path from 'path'; 
import { fileURLToPath } from 'url'; 
import fs from 'fs'; 
import authRoutes from './routes/authRoutes.js';
import { getPool } from './utils/db.js';

// Get the directory name for serving static files (ES Module necessity)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 7001;

// Define a list of allowed origins, including the API Gateway's URL
const allowedOrigins = [
  process.env.CLIENT_URL, // e.g., http://localhost:5173 from your .env
  'http://localhost:7000',
  'http://localhost:5173',
  'https://veemsonboardupgrade.theviswagroup.com'
];

console.log(`[AuthService] Configuring CORS for origins: ${allowedOrigins.join(', ')}`);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// --- FIX: Implement local body parsers for JSON and URL-encoded data ---
// This is necessary because the Gateway will now pass raw streams for ALL /api/auth traffic.
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// -----------------------------------------------------------------------------

// --- CRITICAL FIX: Serve static files for profile pictures ---
// DEFINE AND EXPORT THE ABSOLUTE PATH for use in authController.js
export const USER_IMAGE_DIR = path.join(__dirname, 'public', 'uploads', 'user_images');
// Create the directory if it doesn't exist
if (!fs.existsSync(USER_IMAGE_DIR)) {
    fs.mkdirSync(USER_IMAGE_DIR, { recursive: true });
}
// Expose the public directory so uploaded images can be accessed by URL
app.use('/public/uploads/user_images', express.static(USER_IMAGE_DIR));
console.log(`[AuthService] Serving static user images from: ${USER_IMAGE_DIR}`);
// ----------------------------------------------------

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'Authentication Service',
    timestamp: new Date().toISOString()
  });
});

app.use('/', authRoutes);

app.use((err, req, res, next) => {
  console.error("[AuthService Global Error Handler]", err.message, err.stack ? err.stack.substring(0, 300) : '');
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'An unexpected error occurred in Authentication Service.',
    details: process.env.NODE_ENV === 'development' && err.stack ? err.stack : undefined
  });
});

// ------------------------------
// AUTO-KILL PORT HANDLER + SERVER START
// ------------------------------
const startServer = async () => {
  const portInUse = port;

  try {
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
            console.log(`[AuthService] Port ${portInUse} is in use by PID ${pid}. Killing it...`);
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

    // 🧠 Check required DB environment variables
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_DATABASE) {
      console.error("[AuthService] FATAL ERROR: Missing essential DB environment variables.");
      process.exit(1);
    }

    // 🗄️ Initialize DB connection
    await getPool();

    // 🚀 Start Express app
    app.listen(portInUse, () => {
      console.log(`🚀 Authentication Service running at http://localhost:${portInUse}`);
      console.log(
        `Database configured: Server=${process.env.DB_HOST}${process.env.DB_INSTANCE_NAME ? '\\' + process.env.DB_INSTANCE_NAME : ''}, DB=${process.env.DB_DATABASE}`
      );
    });
  } catch (error) {
    console.error(`[AuthService] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();