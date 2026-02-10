// viswa-digital-backend/bunker-service/bunkerServer.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { execSync } from 'child_process'; // <-- ADDED
import bunkerRoutes from './routes/bunkerRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.BUNKER_SERVICE_PORT || 7009;

// Middleware
app.use(cors());
app.use(express.json());

// NEW: Middleware to serve static files from the 'public' directory
app.use(express.static('public'));

// Corrected: Mount bunkerRoutes directly at the root of the service
// The API Gateway will handle the /api/bunkering prefix
app.use('/', bunkerRoutes);

// Basic route for service health check
app.get('/', (req, res) => {
  res.send('Bunker Service is up and running!');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke on the Bunker Service!');
});

// ------------------------------
// AUTO-KILL PORT HANDLER + SERVER START
// ------------------------------
const startServer = async () => {
  const portInUse = PORT;

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
            console.log(`[BunkerService] Port ${portInUse} is in use by PID ${pid}. Killing it...`);
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

    // 🚀 Start Express app
    app.listen(portInUse, () => {
      console.log(`🚀 Bunker Service running on http://localhost:${portInUse}`);
    });

  } catch (error) {
    console.error(`[BunkerService] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();