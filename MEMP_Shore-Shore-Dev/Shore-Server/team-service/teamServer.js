// Test Application/viswa-digital-backend/team-service/teamServer.js
import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process'; // <-- ADDED
import teamRoutes from './routes/teamRoutes.js';
import { connectDB } from './utils/db.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 7002; // Ensure this matches your API Gateway config

// Middleware
app.use(cors());

// NEW: Serve static files from the 'public' directory under the full API path
// This makes the path consistent with how the API Gateway will forward the request.
// So, http://localhost:7002/api/team/member_images/ will serve images from public/member_images
app.use('/api/team/member_images', express.static(path.join(__dirname, 'public', 'member_images')));

// Routes
// Note: JSON parsing for specific routes will now be handled within teamRoutes.js
// The /api/team prefix for teamRoutes.js means routes like / will be /api/team/ on this service
app.use('/api/team', teamRoutes); 

// Basic error handling middleware (if you don't have a global one)
app.use((err, req, res, next) => {
    console.error(err.stack);
    // Check if it's a Multer error
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'File size too large. Max 5MB allowed.' });
    }
    if (err.code === 'FILE_TYPE_ERROR') { // Custom error from fileFilter
        return res.status(400).json({ message: err.message });
    }
    res.status(err.status || 500).json({ message: err.message || 'An unexpected error occurred on the server.' });
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
            console.log(`[TeamService] Port ${portInUse} is in use by PID ${pid}. Killing it...`);
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

    // 🗄️ Connect to DB
    await connectDB();
    
    // 🚀 Start Express app
    app.listen(portInUse, () => {
      console.log(`🚀 Team service running on port ${portInUse}`);
    });

  } catch (error) {
    console.error(`[TeamService] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();