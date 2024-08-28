const { Router } = require('express');
const { notAllowed } = require('../middlewares/errors');
const feedController = require('../controllers/feed');
const userController = require('../controllers/user');
const { checkPostExistence, validateLikesUpdating, validatePostCreation, validatePostUpdating,
    handleValidationErrors, validateQueryParams, validatePostId, validateStructure } = require('../middlewares/validation/post');
const { validatePage } = require('../middlewares/validation/user');
const { authorizePostDeletion, authorizePostUpdating } = require('../middlewares/authorization/post');
const commentsRouter = require('./comments');
const upload = require('../util/multer configurations').array('images', 15);
const router = Router();

router.route('/')
    .get(validateQueryParams, validateStructure, handleValidationErrors, feedController.getPosts)
    .post(upload, validatePostCreation, validateStructure, handleValidationErrors, feedController.createPost)
    .all(notAllowed);

router.route('/:postId')
    .get(validatePostId, validateStructure, handleValidationErrors, feedController.getPost)
    .put(upload, validatePostUpdating, validateStructure, handleValidationErrors, authorizePostUpdating,
        feedController.updatePost)
    .delete(validatePostId, validateStructure, handleValidationErrors, authorizePostDeletion, feedController.deletePost)
    .all(notAllowed);

router.route('/:postId/likes')
    .get(validatePostId, validatePage, validateStructure, handleValidationErrors, checkPostExistence, feedController.getPostLikers)
    .patch(validatePostId, validateLikesUpdating, validateStructure, handleValidationErrors, checkPostExistence,
        userController.updatePostLikes)
    .all(notAllowed);

router.use('/:postId', commentsRouter);

module.exports = router;