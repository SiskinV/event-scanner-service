import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { connectDB } from './config/database';
import routes from './routes';
import { globalErrorHandler, notFoundHandler } from './common/middleware/error-handler.middleware';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LiFi Fee Collection API',
      version: '1.0.0',
    },
  },
  apis: ['./src/routes/*.ts', './src/dtos/**/*.ts'], // Path to route files
};

const specs = swaggerJSDoc(swaggerOptions);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/api', routes);

app.use(notFoundHandler);

app.use(globalErrorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);

  // Close server gracefully
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);

  // Close server gracefully
  process.exit(1);
});

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API Documentation: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('Shutdown complete');
  process.exit(0);
});

// Start the application
startServer();

export default app;
