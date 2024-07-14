const { Router } = require('express');
const { notAllowed } = require('../middlewares/errors');
const feedController = require('../controllers/feed');
const { checkPostExistence } = require('../middlewares/validation/post');
const upload = require('../util/multer configurations');
const router = Router();

router.route('/posts')
    .get(feedController.getPosts)
    .post(upload.array('images', 10), feedController.createPost)
    .all(notAllowed)

router.route('post/:postId')
    .get(checkPostExistence, feedController.getPost)
    .delete(checkPostExistence, feedController.deletePost)
    .all(notAllowed);

module.exports = router;