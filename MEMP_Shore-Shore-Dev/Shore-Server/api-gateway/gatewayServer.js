// File: Reporting Page enhancement/viswa-digital-backend/api-gateway/gatewayServer.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import proxy from 'express-http-proxy';
import morgan from 'morgan';
import { execSync } from 'child_process'; 

const app = express();
const port = process.env.PORT || 7000;

// This is the array that defines all allowed origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5176',
  'http://172.16.21.8:8080',
  'https://veemsonboardupgrade.theviswagroup.com'
];

console.log(`[APIGateway] Configuring CORS for origins: ${allowedOrigins.join(', ')}`);

// CORRECTED: The origin option now uses a function to check against the allowedOrigins array
const corsOptions = {
  origin: function (origin, callback) {
    // Add this line to see the origin being sent
    console.log(`[APIGateway] Request origin: ${origin}`);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(morgan('dev'));

// ... (Proxy URL definitions remain here) ...

const authServiceUrl = process.env.AUTH_SERVICE_URL;
const teamServiceUrl = process.env.TEAM_SERVICE_URL;
const taskServiceUrl = process.env.TASK_SERVICE_URL;
const shipsServiceUrl = process.env.SHIPS_SERVICE_URL;
const machineryServiceUrl = process.env.MACHINERY_SERVICE_URL;
const portsServiceUrl = process.env.PORTS_SERVICE_URL;
const voyagesServiceUrl = process.env.VOYAGES_SERVICE_URL;
const tankServiceUrl = process.env.TANK_SERVICE_URL;
const bunkerServiceUrl = process.env.BUNKER_SERVICE_URL;
const reportsServiceUrl = process.env.REPORTS_SERVICE_URL;
const excelIntegrationServiceUrl = process.env.EXCEL_INTEGRATION_SERVICE_URL || 'http://localhost:7011';
const additiveServiceUrl = process.env.ADDITIVE_SERVICE_URL || 'http://localhost:7012';

// All proxy configurations should be below this line
if (excelIntegrationServiceUrl) {
    app.use('/api/excel', proxy(excelIntegrationServiceUrl, {
        parseReqBody: false,
        timeout: 300000, // 5 minutes timeout for Excel operations
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            return proxyReqOpts;
        }
    }));
    console.log(`Proxying /api/excel to ${excelIntegrationServiceUrl} (parseReqBody: false, timeout: 300s)`);}
// ✅ Auth Service: Special handling for login (JSON) and all other (file upload, etc.)
if (authServiceUrl) {
  // Login endpoint: allow JSON body parsing (works for React and Android)
  app.post('/api/auth/login', proxy(authServiceUrl, {
    proxyReqPathResolver: req => '/login'
  }));
  // All other /api/auth routes: keep parseReqBody: false for file upload compatibility
  app.use('/api/auth', proxy(authServiceUrl, {
    parseReqBody: false,
    proxyReqPathResolver: req => req.url
  }));
  console.log(`Proxying /api/auth/login to ${authServiceUrl} (JSON login)`);
  console.log(`Proxying /api/auth to ${authServiceUrl} (raw stream for uploads)`);
}

// ✅ Team Service → exposes /api/team
app.use('/api/team', proxy(teamServiceUrl, {
  proxyReqPathResolver: req => `/api/team${req.url}`,
  parseReqBody: false,
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    if (proxyRes.statusCode >= 400) {
      console.error(`[APIGateway] Proxy error: ${proxyRes.statusCode} ${proxyRes.statusMessage}`);
    }
    return proxyResData;
  }
}));

// ✅ Task Service → exposes /tasks
if (taskServiceUrl) {
  app.use('/api/tasks', proxy(taskServiceUrl, {
    proxyReqPathResolver: req => req.url, 
    parseReqBody: false,
  }));
  console.log(`Proxying /api/tasks to ${taskServiceUrl}`);
}

// NEW: Proxy for serving static task attachments from the task-service
if (taskServiceUrl) {
  app.use('/api/tasks/task_attachments', proxy(taskServiceUrl, {
    proxyReqPathResolver: req => `/task_attachments/${req.params[0]}`
  }));
}

// MODIFIED: Added proxyReqPathResolver to correctly route requests
if (shipsServiceUrl) {
    app.use('/api/ships', proxy(shipsServiceUrl, {
        parseReqBody: false, // Ensure that multipart/form-data is not parsed here
        proxyReqPathResolver: req => req.url,
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            return proxyReqOpts;
        }
    }));
    console.log(`Proxying /api/ships to ${shipsServiceUrl}`);
}

if (machineryServiceUrl) {
    app.use('/api/machinery', proxy(machineryServiceUrl, {
      proxyReqPathResolver: req => req.url,
    }));
    console.log(`Proxying /api/machinery to ${machineryServiceUrl}`);
}

if (portsServiceUrl) {
    app.use('/api/ports', proxy(portsServiceUrl, {
      proxyReqPathResolver: req => req.url,
    }));
    console.log(`Proxying /api/ports to ${portsServiceUrl}`);
}

// ✅ FIXED: Consolidated and ensured parseReqBody: false for Voyage Service
if (voyagesServiceUrl) {
    app.use('/api/voyages', proxy(voyagesServiceUrl, {
        parseReqBody: false, // <-- CRITICAL FIX: Ensures multipart/form-data works
        proxyReqPathResolver: req => req.url,
    }));
    console.log(`Proxying /api/voyages to ${voyagesServiceUrl}`);
}

// ADDED: Proxy for serving static attachment files for the voyage-service
if (voyagesServiceUrl) {
    app.use('/api/voyages/uploads/voyage_attachments', proxy(voyagesServiceUrl, {
        proxyReqPathResolver: (req) => {
            // Correctly resolve the URL to the static folder on the voyage-service
            return `/uploads/voyage_attachments/${req.params[0]}`;
        }
    }));
    console.log(`Proxying /api/voyages/uploads to ${voyagesServiceUrl}`);
}


if (tankServiceUrl) {
    app.use('/api/tanks', proxy(tankServiceUrl, {
      proxyReqPathResolver: req => req.url,
    }));
    console.log(`Proxying /api/tanks to ${tankServiceUrl}`);
}

// MODIFIED: Added proxyReqPathResolver to correctly route requests
if (bunkerServiceUrl) {
    app.use('/api/bunkering', proxy(bunkerServiceUrl, {
        parseReqBody: false,
        proxyReqPathResolver: req => req.url,
    }));
    console.log(`Proxying /api/bunkering to ${bunkerServiceUrl}`);
}

// ADDED: Proxy for handling file uploads and serving static attachments for the bunker service
if (bunkerServiceUrl) {
    app.use('/api/bunkering/uploads/bunker_attachments', proxy(bunkerServiceUrl, {
        proxyReqPathResolver: (req) => {
            // Correctly resolve the URL to the static folder on the bunker service
            return `/uploads/bunker_attachments/${req.params[0]}`;
        }
    }));
    console.log(`Proxying /api/bunkering/uploads to ${bunkerServiceUrl}`);
}

if (reportsServiceUrl) {
    app.use('/api/reporting', proxy(reportsServiceUrl, {
      proxyReqPathResolver: req => req.url,
      parseReqBody: false, // Add this to pass the raw request body
    }));
    console.log(`Proxying /api/reporting to ${reportsServiceUrl}`);
}


if (additiveServiceUrl) {
  app.use('/api/additives', proxy(additiveServiceUrl, {
    proxyReqPathResolver: req => req.url
  }));
}

if (additiveServiceUrl) {
  app.use('/api/additives/swagger', proxy(additiveServiceUrl, {
    proxyReqPathResolver: () => '/swagger'
  }));
}



app.get('/', (req, res) => {
    res.send('MEMP Reporting API Gateway is running.');
});


app.use((err, req, res, next) => {
    console.error("[APIGateway] Error:", err.stack);
    res.status(500).send('Something broke in the API Gateway!');
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
            console.log(`[APIGateway] Port ${portInUse} is in use by PID ${pid}. Killing it...`);
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

    // NOTE: DB checks are removed, as the gateway does not connect to the DB.

    // 🚀 Start Express app
    app.listen(portInUse, '0.0.0.0', () => {
      console.log(`🚀 [APIGateway] API Gateway is live on http://0.0.0.0:${portInUse}`);
    });
  } catch (error) {
    console.error(`[APIGateway] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();