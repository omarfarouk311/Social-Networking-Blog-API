const { Router } = require('express');
const { notAllowed } = require('../middlewares/errors');
const feedController = require('../controllers/feed');
const commentsController = require('../controllers/comments');
const { checkPostExistence, validateLikesUpdating, validatePostCreation, validatePostUpdating,
    handleValidationErrors } = require('../middlewares/validation/post');
const upload = require('../util/multer configurations');
const router = Router();

router.route('/')
    .get(feedController.getPosts)
    .post(validatePostCreation, upload.array('images', 15), handleValidationErrors, feedController.createPost)
    .all(notAllowed);

router.route('/:postId')
    .get(checkPostExistence, feedController.getPost)
    .put(checkPostExistence, validatePostUpdating, upload.array('images', 15), handleValidationErrors, feedController.updatePost)
    .patch(checkPostExistence, validateLikesUpdating, handleValidationErrors, feedController.updateLikes)
    .delete(checkPostExistence, feedController.deletePost)
    .all(notAllowed);

router.route('/:postId/comments')
    .get(commentsController.getComments)
    .post(commentsController.createComment)
    .all(notAllowed);

router.route('/:postId/:commentId')
    .patch(commentsController.updateComment)
    .delete(commentsController.deleteComment)
    .all(notAllowed);

module.exports = router;