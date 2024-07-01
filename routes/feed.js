const { Router } = require('express');
const { notAllowed } = require('../middlewares/errors');
const feedController = require('../controllers/feed');

const router = Router();

router.route('/posts')
    .get(feedController.getPosts)
    .all(notAllowed)

router.route('/post')
    .post(feedController.createPost)
    .all(notAllowed);

module.exports = router;