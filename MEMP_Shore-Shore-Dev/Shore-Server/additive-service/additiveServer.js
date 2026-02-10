import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import additiveRoutes from './routes/additiveRoutes.js';
import swaggerUi from 'swagger-ui-express';
import swaggerDocs from './swagger.js';

// Use strict CORS from your shared config or standard allows
const app = express();
const port = process.env.PORT || 7012;

app.use(cors({
  origin: '*', // Allow Gateway to access
  credentials: true
}));

app.use(express.json());

// Swagger
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.use('/', additiveRoutes);

app.listen(port, () => {
  console.log(`🚀 [AdditiveService] Running on http://localhost:${port}`);
});