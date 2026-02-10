import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Additive Service API',
      version: '1.0.0',
      description: 'API for managing fuel additives, dosing events, and blending operations',
    },
    servers: [
      {
        url: 'http://localhost:8092',
        description: 'Additive Service Local',
      },
    ],
  },
  // This tells Swagger to look for documentation comments in your routes folder
  apis: ['./routes/*.js'], 
};

const swaggerDocs = swaggerJsdoc(options);

export default swaggerDocs;