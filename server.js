require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const errorMiddleware = require('./middlewares/error.middleware');
const apiRoutes = require('./routes');

const app = express();

app.use(cors());
app.use(express.json());

// Santé
app.get('/health', (_req, res) => res.json({ ok: true }));

// API
app.use('/api', apiRoutes);

// Erreurs
app.use(errorMiddleware);

// Démarrage
const PORT = process.env.PORT || 8000;
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('Mongo connecté');
  app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
}).catch((e) => {
  console.error('Erreur Mongo:', e);
  process.exit(1);
});
