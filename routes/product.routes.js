const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/product.controller');

// Public
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);

// Admin (optionnel) — à sécuriser selon ton besoin
router.post('/', ctrl.create);
router.put('/:id', auth(true), ctrl.update);
router.delete('/:id', auth(true), ctrl.remove);

module.exports = router;
