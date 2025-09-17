const express = require('express');
const controller = require('../controllers/post.controller');

const router = express.Router();

router.get('/', controller.listPosts);
router.get('/:idOrSlug', controller.getPost);
router.post('/', controller.createPost);
router.put('/:idOrSlug', controller.updatePost);
router.delete('/:idOrSlug', controller.deletePost);

module.exports = router;
