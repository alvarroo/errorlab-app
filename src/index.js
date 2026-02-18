import express from 'express';
import fs from 'node:fs';
import path, {dirname} from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from './middleware/logger.js';
import pokemonRoutes from './routes/pokemon.js';
import boomRoutes from './routes/boom.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');

const pokemonsPath = path.join(__dirname, '../data/pokemons.json');
let pokemons = JSON.parse(fs.readFileSync(pokemonsPath, 'utf-8'));

app.use(express.json());

// Logging de requests
app.use((req, res, next) => {
  logger.low(`${req.method} ${req.path}`, {
    ip: req.ip,
    user_agent: req.get('user-agent')
  });
  next();
});

// rutas
app.use('/pokemon', pokemonRoutes);
app.use('/boom', boomRoutes);

app.get('/', (req, res) => {
  res.json({
    service: 'ErrorLab Pokemon API',
    version: '1.0.0',
    endpoints: {
      pokemon: '/api/pokemon',
      errors: '/boom',
      health: '/boom/health'
    }
  });
});

// error 404
app.use((req, res) => {
  logger.medium(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.path} does not exist`
  });
});

// Error handler global
app.use((err, req, res, next) => {
  logger.high('Unhandled error in Express', {
    error: err.message,
    stack: err.stack
  });
  
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: err.message
  });
});

// Manejo de crashes inesperados
process.on('uncaughtException', (error) => {
  logger.critical('Uncaught exception - application will crash', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.critical('Unhandled promise rejection', {
    reason: reason,
    promise: promise
  });
});

app.listen(PORT, () => {
  console.log(` Servidor corriendo en http://localhost:${PORT}`);
});
