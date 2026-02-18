import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from '../middleware/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pokemonsPath = path.join(__dirname, '../../data/pokemons.json');
let pokemons = JSON.parse(fs.readFileSync(pokemonsPath, 'utf-8'));

const router = express.Router();

// GET /pokemon - Listar todos
router.get('/', (req, res) => {
  logger.low('GET /pokemon - Fetching all pokemon');
  res.json({
    total: pokemons.length,
    data: pokemons
  });
});

// GET /pokemon/:id - Por ID
router.get('/:id', (req, res) => {
  const id = Number.parseInt(req.params.id);
  logger.low(`GET /pokemon/${id} - Fetching pokemon`);
  
  const pokemon = pokemons.find(p => p.id === id);
  
  if (!pokemon) {
    logger.medium(`Pokemon ID ${id} not found`, { id });
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `Pokemon con ID ${id} no encontrado`
    });
  }
  
  res.json(pokemon);
});

// GET /pokemon/nombre/:nombre - Por nombre
router.get('/nombre/:nombre', (req, res) => {
  const nombre = req.params.nombre.toLowerCase();
  logger.low(`GET /pokemon/nombre/${nombre} - Fetching pokemon by name`);
  
  const pokemon = pokemons.find(p => p.nombre.toLowerCase() === nombre);
  
  if (!pokemon) {
    logger.medium(`Pokemon ${nombre} not found`, { nombre });
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `Pokemon con nombre ${nombre} no encontrado`
    });
  }
  
  res.json(pokemon);
});

// GET /pokemon/tipo/:tipo - Por tipo
router.get('/tipo/:tipo', (req, res) => {
  const tipo = req.params.tipo.toLowerCase();
  logger.low(`GET /pokemon/tipo/${tipo} - Filtering by type`);
  
  const filtered = pokemons.filter(p => 
    p.tipo.some(t => t.toLowerCase() === tipo)
  );
  
  if (filtered.length === 0) {
    logger.medium(`No pokemon found with type ${tipo}`, { tipo });
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `No se encontraron pokémon de tipo ${tipo}`
    });
  }
  
  res.json({
    tipo,
    total: filtered.length,
    data: filtered
  });
});

export default router;