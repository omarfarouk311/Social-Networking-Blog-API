const { Router } = require('express');
const { notAllowed } = require('../middlewares/errors');
const feedController = require('../controllers/feed');
const userController = require('../controllers/user');
const commentsController = require('../controllers/comments');
const { checkPostExistence, validateLikesUpdating, validatePostCreation, validatePostUpdating,
    handleValidationErrors, validateQueryParams, validatePostId, validateStructure } = require('../middlewares/validation/post');
const { checkCommentExistence, validateCommentCreation, validateCommentUpdating,
    validateRouteParams } = require('../middlewares/validation/comments');
const { authorizePostDeletion, authorizePostUpdating } = require('../middlewares/authorization/post');
const { authorizeCommentDeletion, authorizeCommentUpdating } = require('../middlewares/authorization/comment');
const { authenticateUser } = require('../middlewares/auth');
const upload = require('../util/multer configurations');
const router = Router();

router.route('/')
    .get(validateQueryParams, validateStructure, handleValidationErrors, feedController.getPosts)
    .post(authenticateUser, validatePostCreation, validateStructure, handleValidationErrors, upload.array('images', 15),
        feedController.createPost)
    .all(notAllowed);

router.use(authenticateUser);

router.route('/:postId')
    .get(validatePostId, validateStructure, handleValidationErrors, feedController.getPost)
    .put(validatePostUpdating, validateStructure, handleValidationErrors, authorizePostUpdating, upload.array('images', 15),
        feedController.updatePost)
    .patch(validatePostId, validateLikesUpdating, validateStructure, handleValidationErrors, checkPostExistence,
        userController.updatePostLikes)
    .delete(validatePostId, validateStructure, handleValidationErrors, authorizePostDeletion, feedController.deletePost)
    .all(notAllowed);

router.route('/:postId/comments')
    .get(validateQueryParams, validatePostId, validateStructure, handleValidationErrors, checkPostExistence,
        commentsController.getComments)
    .post(validatePostId, validateCommentCreation, validateStructure, handleValidationErrors, checkPostExistence,
        commentsController.createComment)
    .all(notAllowed);

router.route('/:postId/:commentId')
    .put(validateCommentUpdating, validateStructure, handleValidationErrors, authorizeCommentUpdating, commentsController.updateComment)
    .patch(validateRouteParams, validateLikesUpdating, validateStructure, handleValidationErrors, checkCommentExistence,
        userController.updateCommentLikes)
    .delete(validateRouteParams, validateStructure, handleValidationErrors, authorizeCommentDeletion, commentsController.deleteComment)
    .all(notAllowed);

module.exports = router;