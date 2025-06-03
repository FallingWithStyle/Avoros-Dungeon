
import express from 'express';
import { initializeDatabase } from './init-db';
import { setupVite } from './vite';
import { setupRoutes } from './routes';
import { setupAuth } from './replitAuth';

const app = express();
const port = process.env.PORT || 5000;

async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Setup authentication
    await setupAuth(app);
    
    // Setup API routes
    setupRoutes(app);
    
    // Setup Vite for development or serve static files for production
    if (process.env.NODE_ENV === 'development') {
      await setupVite(app);
    } else {
      app.use(express.static('dist/public'));
    }
    
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
