import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carpeta de logs (solo para ver que funciona)
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Obtener el archivo de log actual
function getCurrentLogFile() {
  const date = new Date().toISOString().split('T')[0];
  return path.join(logsDir, `app-${date}.log`);
}

function getTimestamp() {
  return new Date().toISOString();
}

function log(level, message, meta = {}) {
  const logEntry = {
    timestamp: getTimestamp(),
    level,
    message,
    ...meta
  };
  
  const logLine = `[${logEntry.timestamp}] [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;

  // stdout/stderr se ve con kubectl logs
  // logs aparecen en los pods de K8s y son capturados
  if (level === 'HIGH' || level === 'CRITICAL') {
    console.error(logLine);
  } else {
    console.log(logLine);
  }
  
  // Archivo local En K8s esto es innecesario
  try {
    fs.appendFileSync(getCurrentLogFile(), logLine + '\n');
  } catch (err) {
    // Ignorar errores de escritura (puede fallar en K8s por permisos)
  }
}

export default {
  low: (msg, meta) => log('LOW', msg, meta),
  medium: (msg, meta) => log('MEDIUM', msg, meta),
  high: (msg, meta) => log('HIGH', msg, meta),
  critical: (msg, meta) => log('CRITICAL', msg, meta)
};