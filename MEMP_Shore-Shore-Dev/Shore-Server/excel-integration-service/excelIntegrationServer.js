// excel-integration-service/excelIntegrationServer.js

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import excelRoutes from './routes/excelRoutes.js';
import { authenticateWithToken } from './middleware/tokenAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '../.env' }); 

const app = express();
const PORT = process.env.EXCEL_SERVICE_PORT || 7011;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Apply token authentication middleware globally
// This will check for X-Upload-Token header on all requests
// If no token, request continues to next middleware (e.g., JWT auth in API Gateway)
app.use(authenticateWithToken);

// Serve static files for Office Add-in
app.use('/office-addin', express.static(path.join(__dirname, 'public', 'office-addin')));

// Routes
app.use('/', excelRoutes);

// Health check route
app.get('/', (req, res) => {
    res.send('Excel Integration Service is running.');
});

// ------------------------------
// AUTO-KILL PORT HANDLER + SERVER START
// ------------------------------
const startServer = async () => {
  const portInUse = PORT;

  try {
    // Kill any process using this port
    if (process.platform === 'win32') {
      try {
        const findCmd = `netstat -ano | findstr :${portInUse}`;
        const result = execSync(findCmd).toString();
        const lines = result.trim().split('\n');

        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(pid)) {
            console.log(`[ExcelService] Port ${portInUse} is in use by PID ${pid}. Killing it...`);
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

    // Start HTTP server for internal API Gateway communication
    http.createServer(app).listen(portInUse, async () => {
      console.log(`🚀 Excel Integration Service running on HTTP port ${portInUse}`);
    });

    // Start HTTPS server for Office Add-in on a different port
    const certPath = path.join(__dirname, 'server-cert.pem');
    const keyPath = path.join(__dirname, 'server-key.pem');
    
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      const httpsPort = 7013; // HTTPS on different port
      const httpsOptions = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
      };
      
      https.createServer(httpsOptions, app).listen(httpsPort, async () => {
        console.log(`🔒 Excel Integration Service (HTTPS) running on port ${httpsPort}`);
        console.log(`📋 Office Add-in manifest: https://localhost:${httpsPort}/office-addin/manifest.xml`);
      });
    } else {
      console.log(`⚠️  Warning: HTTPS certificates not found. Office Add-in will not work.`);
      console.log(`   Run: npm run setup:cert`);
    }

  } catch (error) {
    console.error(`[ExcelService] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
