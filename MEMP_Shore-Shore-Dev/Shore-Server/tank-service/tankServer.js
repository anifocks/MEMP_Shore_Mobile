import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process'; // <-- ADDED
import tankRoutes from './routes/tankRoutes.js';

const app = express();
const port = process.env.TANK_SERVICE_PORT || 7008;

app.use(cors());
app.use(express.json());

app.use('/', tankRoutes);

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
            console.log(`[TankService] Port ${portInUse} is in use by PID ${pid}. Killing it...`);
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
      console.log(`🚀 [TankService] Running on http://localhost:${portInUse}`);
    });

  } catch (error) {
    console.error(`[TankService] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();