import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors, { CorsOptions } from 'cors';
import productRoutes from './routes/productRoutes';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

// CORS
const allowedEnv = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = allowedEnv
  ? allowedEnv.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'];

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[CORS] Allowing (dev):', origin);
      return callback(null, true);
    }
    console.warn('[CORS] Blocked origin:', origin);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));
// Handle preflight generically
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json());

// Routes
app.use('/api/products', productRoutes);

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Cloth Cruiser Cart API Server is running!' });
});

app.get('/api/health', (_req: Request, res: Response) => {
  const state = mongoose.connection.readyState; // 0=disconnected,1=connected
  res.json({ status: state === 1 ? 'ok' : 'degraded', dbState: state });
});

export let ready: Promise<void> | null = null;

async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI is not set');
      if (process.env.NODE_ENV === 'test') throw new Error('Missing MONGODB_URI');
      process.exit(1);
    }
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
    }
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    if (process.env.NODE_ENV === 'test') {
      throw err;
    }
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});
mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Closing gracefully...`);
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Error middleware (after routes)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

ready = connectDB();

export default app;
