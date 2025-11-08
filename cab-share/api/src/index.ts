import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config.js';
import ridesRouter from './routes/rides.js';
import { setupEventListeners } from './eth/contracts.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Routes
app.use('/api/rides', ridesRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Root
app.get('/', (req, res) => {
  res.json({
    service: 'Decentralized Cab-Sharing API',
    version: '1.0.0',
    endpoints: {
      rides: '/api/rides',
      health: '/health'
    }
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
const start = async () => {
  try {
    // Setup blockchain event listeners
    setupEventListeners();
    
    app.listen(config.port, config.host, () => {
      console.log(`
╔══════════════════════════════════════════════════════════╗
║  Decentralized Cab-Sharing API Gateway                   ║
║  Port: ${config.port}                                         ║
║  Host: ${config.host}                                    ║
╚══════════════════════════════════════════════════════════╝
      `);
      console.log('✓ Server started successfully');
      console.log('✓ Event listeners active');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
