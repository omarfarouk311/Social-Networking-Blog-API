const { Router } = require('express');
const { notAllowed } = require('../middlewares/errors');
const feedController = require('../controllers/feed');
const userController = require('../controllers/user');
const commentsController = require('../controllers/comments');
const { checkPostExistence, validateLikesUpdating, validatePostCreation, validatePostUpdating,
    handleValidationErrors } = require('../middlewares/validation/post');
const { checkCommentExistence, validateCommentCreation, validateCommentUpdating } = require('../middlewares/validation/comments');
const { validateQueryParams } = require('../middlewares/validation/post');
const upload = require('../util/multer configurations');
const router = Router();

router.route('/')
    .get(validateQueryParams, feedController.getPosts)
    .post(validatePostCreation, upload.array('images', 15), handleValidationErrors, feedController.createPost)
    .all(notAllowed);

router.route('/:postId')
    .get(checkPostExistence, feedController.getPost)
    .put(checkPostExistence, validatePostUpdating, upload.array('images', 15), handleValidationErrors, feedController.updatePost)
    .patch(checkPostExistence, validateLikesUpdating, handleValidationErrors, userController.updatePostLikes)
    .delete(checkPostExistence, feedController.deletePost)
    .all(notAllowed);

router.route('/:postId/comments')
    .get(validateQueryParams, commentsController.getComments)
    .post(validateCommentCreation, handleValidationErrors, commentsController.createComment)
    .all(notAllowed);

router.route('/:postId/:commentId')
    .put(checkCommentExistence, validateCommentUpdating, handleValidationErrors, commentsController.updateComment)
    .patch(checkCommentExistence, validateLikesUpdating, handleValidationErrors, userController.updateCommentLikes)
    .delete(checkCommentExistence, commentsController.deleteComment)
    .all(notAllowed);

module.exports = router;