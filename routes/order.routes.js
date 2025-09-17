const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/order.controller');

// Création d'une commande (utilisateur connecté)
router.post('/', auth(true), ctrl.create);

// Historique de MES commandes
router.get('/me', auth(true), ctrl.listMine);

// Détail d'une commande + items
router.get('/:id', auth(true), ctrl.getById);

// Items d'une commande (utile pour une vue dédiée)
router.get('/:id/items', auth(true), ctrl.listItemsByOrder);

module.exports = router;
