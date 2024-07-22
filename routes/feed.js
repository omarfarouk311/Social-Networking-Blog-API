const { Router } = require('express');
const { notAllowed } = require('../middlewares/errors');
const feedController = require('../controllers/feed');
const commentsController = require('../controllers/comments');
const { checkPostExistence } = require('../middlewares/validation/post');
const upload = require('../util/multer configurations');
const router = Router();

router.route('/')
    .get(feedController.getPosts)
    .post(upload.array('images', 10), feedController.createPost)
    .all(notAllowed);

router.route('/:postId')
    .get(checkPostExistence, feedController.getPost)
    .delete(checkPostExistence, feedController.deletePost)
    .patch(checkPostExistence, feedController.updatePost)
    .all(notAllowed);

router.route('/:postId/comments')
    .get(commentsController.getComments)
    .post(commentsController.createComment)
    .all(notAllowed);

router.route('/:postId/:commentId')
    .delete(commentsController.deleteComment)
    .patch(commentsController.updateComment)
    .all(notAllowed);

module.exports = router;