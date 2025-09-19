const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/chat.controller');

router.use(auth(true));

router.post('/ensure', ctrl.ensureChat);
router.get('/', ctrl.listChats);
router.get('/:id/messages', ctrl.listMessages);
router.post('/:id/messages', ctrl.sendMessage);

module.exports = router;
