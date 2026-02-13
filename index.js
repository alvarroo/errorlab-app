import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {dirname} from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');

// Middleware para parsear JSON
app.use(express.json());

// Middleware personalizado para logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Cargar datos de pokémons
const pokemonsPath = path.join(__dirname, 'pokemons.json');
let pokemons = JSON.parse(fs.readFileSync(pokemonsPath, 'utf-8'));

// GET - Obtener todos los pokémons
app.get('/pokemons', (req, res) => {
  res.json({
    total: pokemons.length,
    pokemons: pokemons
  });
});

// GET - Obtener un pokémon por ID
app.get('/pokemons/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const pokemon = pokemons.find(p => p.id === id);
  
  if (!pokemon) {
    return res.status(404).json({ 
      error: 'Pokémon no encontrado',
      id: id
    });
  }
  
  res.json(pokemon);
});

// GET - Obtener un pokémon por nombre
app.get('/pokemons/nombre/:nombre', (req, res) => {
  const nombre = req.params.nombre.toLowerCase();
  const pokemon = pokemons.find(p => p.nombre.toLowerCase() === nombre);
  
  if (!pokemon) {
    return res.status(404).json({ 
      error: 'Pokémon no encontrado',
      nombre: req.params.nombre
    });
  }
  
  res.json(pokemon);
});

// GET - Obtener pokémons por tipo
app.get('/pokemons/tipo/:tipo', (req, res) => {
  const tipo = req.params.tipo.toLowerCase();
  const pokemonsPorTipo = pokemons.filter(p => 
    p.tipo.some(t => t.toLowerCase() === tipo)
  );
  
  if (pokemonsPorTipo.length === 0) {
    return res.status(404).json({ 
      error: 'No se encontraron pokémons de ese tipo',
      tipo: req.params.tipo
    });
  }
  
  res.json({
    tipo: req.params.tipo,
    total: pokemonsPorTipo.length,
    pokemons: pokemonsPorTipo
  });
});


// Error de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    ruta: req.url,
    metodo: req.method
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(` Servidor corriendo en http://localhost:${PORT}`);
});
