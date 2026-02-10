// viswa-digital-backend/ships-service/shipsServer.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path'; // Import path module
import { fileURLToPath } from 'url'; // Import fileURLToPath
import shipsRoutes from './routes/shipsRoutes.js';

const app = express();
const port = process.env.PORT || 7004;

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the directory for uploaded images
const vesselImagesDir = path.join(__dirname, 'public', 'uploads', 'vessel_images');

app.use(cors());
app.use(express.json());

// Serve static images from the `vessel_images` directory
// This allows the front-end to request images by their filename
app.use('/uploads/vessel_images', express.static(vesselImagesDir));

// Main route for this service
app.use('/', shipsRoutes);

app.listen(port, () => {
  console.log(`🚀 [ShipsService] Running on http://localhost:${port}`);
  console.log(`Serving vessel images from: ${vesselImagesDir}`);
});