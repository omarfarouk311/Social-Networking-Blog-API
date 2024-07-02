const { Router } = require('express');
const { notAllowed } = require('../middlewares/errors');
const feedController = require('../controllers/feed');
const { checkPostExistence } = require('../middlewares/check existence');

const router = Router();

router.route('/posts')
    .get(feedController.getPosts)
    .all(notAllowed)

router.route('/post')
    .post(feedController.createPost)
    .all(notAllowed);

router.route('post/:postId')
    .get(checkPostExistence, feedController.getPost)
    .all(notAllowed);

module.exports = router;