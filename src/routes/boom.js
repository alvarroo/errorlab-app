import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';
import { fileURLToPath } from 'node:url';
import logger from '../middleware/logger.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. APPLICATION_EXCEPTION - Error de null pointer
router.get('/exception', (req, res) => {
  logger.low('Attempting to process pokemon with null data');
  
  try {
    const pokemon = null;
    // Esto CRASHEA
    const power = pokemon.stats.attack; 
  } catch (error) {
    logger.high('Unhandled exception caught', {
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'APPLICATION_EXCEPTION',
      message: error.message,
      stack: error.stack.split('\n').slice(0, 5)
    });
  }
});

// 2. INPUT_VALIDATION - Validación real
router.get('/validation', (req, res) => {
  const id = req.query.id;
  
  logger.low('Validating pokemon ID', { id });
  
  if (!id) {
    logger.high('Validation failed: ID parameter missing');
    return res.status(400).json({
      error: 'INPUT_VALIDATION',
      message: 'Query parameter "id" is required'
    });
  }
  
  const numId = Number.parseInt(id);
  
  if (Number.isNaN(numId)) {
    logger.high('Validation failed: ID is not a number', { id });
    return res.status(400).json({
      error: 'INPUT_VALIDATION',
      message: 'ID must be a valid number'
    });
  }
  
  if (numId < 1 || numId > 151) {
    logger.high('Validation failed: ID out of range', { id: numId, range: '1-151' });
    return res.status(400).json({
      error: 'INPUT_VALIDATION',
      message: `Pokemon ID must be between 1-151. Received: ${numId}`
    });
  }
  
  res.json({ message: 'Validation passed', id: numId });
});

// 3. DEPENDENCY_FAILURE - Llamada real a API inexistente
router.get('/dependency', async (req, res) => {
  logger.low('Calling external Pokemon API...');
  
  try {
    // Intentar fetch a URL inexistente
    const response = await fetch('http://localhost:9999/api/pokemon');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    logger.high('External API call failed', {
      error: error.message,
      code: error.code,
      url: 'http://localhost:9999/api/pokemon'
    });
    
    res.status(503).json({
      error: 'DEPENDENCY_FAILURE',
      message: 'External Pokemon API is unavailable',
      details: error.message
    });
  }
});

// 4. TIMEOUT - Timeout real con AbortController
router.get('/timeout', async (req, res) => {
  const timeoutMs = parseInt(req.query.ms) || 5000;
  
  logger.low('Starting long operation with timeout', { timeout_ms: timeoutMs });
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    // Operación que nunca termina
    await new Promise((resolve, reject) => {
      controller.signal.addEventListener('abort', () => {
        reject(new Error('Operation timeout'));
      });
      // Nunca hace resolve
    });
  } catch (error) {
    clearTimeout(timeoutId);
    logger.high('Operation timeout', { timeout_ms: timeoutMs, error: error.message });
    
    return res.status(504).json({
      error: 'TIMEOUT',
      message: `Operation did not complete within ${timeoutMs}ms`
    });
  }
});

// 5. DATABASE - Lectura de archivo inexistente
router.get('/database', (req, res) => {
  logger.low('Attempting to read pokemon database file');
  
  try {
    // Intentar leer archivo que NO existe 
    const data = fs.readFileSync(path.join(__dirname, '../../data/pokemon-db-backup.json'));
    res.json(JSON.parse(data));
  } catch (error) {
    logger.high('Database file read error', {
      error: error.message,
      code: error.code,
      path: error.path
    });
    
    res.status(500).json({
      error: 'DATABASE',
      message: 'Failed to read pokemon database',
      details: error.message
    });
  }
});

// 6. CONFIGURATION - Variable de entorno faltante
router.get('/config', (req, res) => {
  logger.low('Checking application configuration');
  
  const requiredEnvVars = ['POKEAPI_BASE_URL', 'DB_CONNECTION_STRING', 'API_KEY'];
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    logger.high('Configuration error: missing environment variables', { missing });
    
    return res.status(500).json({
      error: 'CONFIGURATION',
      message: 'Application misconfiguration detected',
      missing_variables: missing
    });
  }
  
  res.json({ message: 'Configuration OK' });
});

// 7. AUTH_AUTHZ - Verificación real de token
router.get('/auth', (req, res) => {
  const token = req.headers.authorization;
  
  logger.low('Validating authentication token');
  
  if (!token) {
    logger.high('Authentication failed: No token provided');
    return res.status(401).json({
      error: 'AUTH_AUTHZ',
      message: 'Authorization header missing'
    });
  }
  
  if (!token.startsWith('Bearer ')) {
    logger.high('Authentication failed: Invalid token format', { token: token.substring(0, 20) });
    return res.status(401).json({
      error: 'AUTH_AUTHZ',
      message: 'Invalid token format. Expected: Bearer <token>'
    });
  }
  
  const tokenValue = token.split(' ')[1];
  
  // Validación simple 
  if (tokenValue !== 'valid-secret-token') {
    logger.high('Authentication failed: Invalid token', { token: tokenValue.substring(0, 10) });
    return res.status(401).json({
      error: 'AUTH_AUTHZ',
      message: 'Invalid or expired token'
    });
  }
  
  res.json({ message: 'Authentication successful' });
});

// 8. RESOURCE_CPU - Carga real de CPU
router.get('/cpu', (req, res) => {
  const iterations = Number.parseInt(req.query.iterations) || 10000000;
  
  logger.medium('Starting CPU-intensive operation', { iterations });
  
  const startTime = Date.now();
  const startCpu = process.cpuUsage();
  
  // Operación que consume CPU
  let result = 0;
  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
  }
  
  const duration = Date.now() - startTime;
  const cpuUsage = process.cpuUsage(startCpu);
  
  logger.medium('CPU operation completed', {
    duration_ms: duration,
    cpu_user_ms: (cpuUsage.user / 1000).toFixed(2),
    cpu_system_ms: (cpuUsage.system / 1000).toFixed(2)
  });
  
  if (duration > 2000) {
    logger.high('SLA violation: Response time exceeded threshold', {
      duration_ms: duration,
      threshold_ms: 2000
    });
  }
  
  res.json({
    status: 'completed',
    iterations,
    duration_ms: duration,
    cpu_usage: {
      user_ms: (cpuUsage.user / 1000).toFixed(2),
      system_ms: (cpuUsage.system / 1000).toFixed(2)
    }
  });
});

// 9. RESOURCE_MEMORY_OOM - Consumo real de memoria
router.get('/memory', (req, res) => {
  const sizeMB = Number.parseInt(req.query.mb) || 50;
  
  logger.medium('Allocating memory', { size_mb: sizeMB });
  
  try {
    // Alocar memoria 
    const bytesPerMB = 1024 * 1024;
    const arraySize = (sizeMB * bytesPerMB) / 100;
    
    const bigArray = new Array(arraySize).fill(null).map((_, i) => ({
      id: i,
      name: 'Pokemon',
      data: new Array(10).fill(i),
      buffer: 'x'.repeat(50)
    }));
    
    const memBefore = process.memoryUsage();
    
    // Forzar que Node no optimice y elimine el array
    const sample = bigArray[Math.floor(Math.random() * bigArray.length)];
    
    const memAfter = process.memoryUsage();
    
    logger.medium('Memory allocated successfully', {
      heap_used_mb: (memAfter.heapUsed / bytesPerMB).toFixed(2),
      heap_total_mb: (memAfter.heapTotal / bytesPerMB).toFixed(2),
      rss_mb: (memAfter.rss / bytesPerMB).toFixed(2)
    });
    
    if (memAfter.heapUsed > 200 * bytesPerMB) {
      logger.high('Memory usage critical - approaching OOM', {
        heap_used_mb: (memAfter.heapUsed / bytesPerMB).toFixed(2)
      });
    }
    
    res.json({
      status: 'completed',
      allocated_mb: sizeMB,
      memory: {
        heap_used_mb: (memAfter.heapUsed / bytesPerMB).toFixed(2),
        heap_total_mb: (memAfter.heapTotal / bytesPerMB).toFixed(2),
        rss_mb: (memAfter.rss / bytesPerMB).toFixed(2)
      },
      sample_data: sample
    });
    
  } catch (error) {
    logger.critical('Memory allocation failed - OOM', {
      error: error.message,
      requested_mb: sizeMB
    });
    
    res.status(500).json({
      error: 'RESOURCE_MEMORY_OOM',
      message: 'Memory allocation failed',
      details: error.message
    });
  }
});

// 10. K8S_CRASHLOOP_RESTARTS - Crash real 
router.get('/crash', (req, res) => {
  logger.critical('FATAL: Simulating application crash');
  
  // Responder antes de crashear
  res.status(500).json({
    error: 'K8S_CRASHLOOP_RESTARTS',
    message: 'Application will crash in 1 second',
    warning: 'Pod will restart'
  });
  
  // Crashear después de 1 segundo
  setTimeout(() => {
    logger.critical('Application crashing NOW - process.exit(1)');
    process.exit(1);
  }, 1000);
});

// 11. NETWORK_DNS_CONN - Error de DNS
router.get('/network', async (req, res) => {
  logger.low('Attempting DNS resolution for internal service');
  
  try {
    // Intentar resolver un hostname que NO existe
    const addresses = await dns.resolve4('pokemon-db.errorlab.svc.cluster.local');
    res.json({ addresses });
  } catch (error) {
    logger.high('DNS resolution failed', {
      hostname: 'pokemon-db.errorlab.svc.cluster.local',
      error: error.message,
      code: error.code
    });
    
    res.status(503).json({
      error: 'NETWORK_DNS_CONN',
      message: 'Cannot resolve internal Kubernetes service',
      details: error.message
    });
  }
});

// HEALTH - Healthcheck
router.get('/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'healthy',
    uptime_seconds: Math.floor(process.uptime()),
    memory: {
      heap_used_mb: (mem.heapUsed / 1024 / 1024).toFixed(2),
      rss_mb: (mem.rss / 1024 / 1024).toFixed(2)
    },
    timestamp: new Date().toISOString()
  });
});

// Lista de endpoints
router.get('/', (req, res) => {
  res.json({
    service: 'ErrorLab - Real Error Endpoints',
    version: '1.0.0',
    endpoints: {
      'GET /boom/exception': 'APPLICATION_EXCEPTION - Real null pointer error',
      'GET /boom/validation?id=999': 'INPUT_VALIDATION - Real validation',
      'GET /boom/dependency': 'DEPENDENCY_FAILURE - Real HTTP call to non-existent API',
      'GET /boom/timeout?ms=5000': 'TIMEOUT - Real timeout with AbortController',
      'GET /boom/database': 'DATABASE - Real file read error',
      'GET /boom/config': 'CONFIGURATION - Real env var check',
      'GET /boom/auth': 'AUTH_AUTHZ - Real token validation',
      'GET /boom/cpu?iterations=10M': 'RESOURCE_CPU - Real CPU load',
      'GET /boom/memory?mb=100': 'RESOURCE_MEMORY_OOM - Real memory allocation',
      'GET /boom/crash': 'K8S_CRASHLOOP_RESTARTS - Real process crash (process.exit)',
      'GET /boom/network': 'NETWORK_DNS_CONN - Real DNS resolution error',
      'UNKNOWN ENDPOINT': '...try the other ones :)',
      'GET /boom/health': 'Health check'
    }
  });
});

export default router;