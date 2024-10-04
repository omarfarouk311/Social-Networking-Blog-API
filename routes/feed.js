const { Router } = require('express');
const { notAllowed } = require('../middlewares/errors');
const feedController = require('../controllers/feed');
const { checkPostExistence, validateLikesUpdating, validatePostCreation, validatePostUpdating,
    handleValidationErrors, validateQueryParams, validatePostId } = require('../middlewares/validation/post');
const { validatePage } = require('../middlewares/validation/user');
const { authorizePostDeletion, authorizePostUpdating } = require('../middlewares/authorization/post');
const commentsRouter = require('./comments');
const { authenticateUser } = require('../controllers/auth');
const upload = require('../util/multer configurations').array('images', 15);
const router = Router();

router.use(authenticateUser);

router.route('/')
    .get(validateQueryParams, handleValidationErrors, feedController.getPosts)
    .post(upload, validatePostCreation, handleValidationErrors, feedController.createPost)
    .all(notAllowed);

router.route('/:postId')
    .get(validatePostId, handleValidationErrors, feedController.getPost)
    .put(upload, validatePostUpdating, handleValidationErrors, authorizePostUpdating, feedController.updatePost)
    .delete(validatePostId, handleValidationErrors, authorizePostDeletion, feedController.deletePost)
    .all(notAllowed);

router.route('/:postId/likes')
    .get(validatePostId, validatePage, handleValidationErrors, checkPostExistence, feedController.getPostLikers)
    .patch(validatePostId, validateLikesUpdating, handleValidationErrors, checkPostExistence,
        feedController.updatePostLikes)
    .all(notAllowed);

router.use('/:postId/comments', commentsRouter);

module.exports = router;