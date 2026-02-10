import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process'; // <-- ADDED
import machineryRoutes from './routes/machineryRoutes.js';

const app = express();
const port = process.env.PORT || 7005; // New port for this service

app.use(cors());
app.use(express.json());

app.use('/', machineryRoutes);

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
            console.log(`[MachineryService] Port ${portInUse} is in use by PID ${pid}. Killing it...`);
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
      console.log(`🚀 [MachineryService] Running on http://localhost:${portInUse}`);
    });

  } catch (error) {
    console.error(`[MachineryService] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();