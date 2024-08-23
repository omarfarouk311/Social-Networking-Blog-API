const { Router } = require('express');
const { notAllowed, notFound } = require('../middlewares/errors');
const { checkPostExistence, validateLikesUpdating, handleValidationErrors, validatePostId,
    validateStructure } = require('../middlewares/validation/post');
const { checkCommentExistence, validateCommentCreation, validateCommentUpdating, validateQueryParams,
    validateRouteParams } = require('../middlewares/validation/comments');
const { authorizeCommentDeletion, authorizeCommentUpdating } = require('../middlewares/authorization/comment');
const userController = require('../controllers/user');
const commentsController = require('../controllers/comments');
const { validatePage } = require('../middlewares/validation/user');
const router = Router();

router.route('/comments')
    .get(validateQueryParams, validatePostId, validateStructure, handleValidationErrors, checkPostExistence,
        commentsController.getComments)
    .post(validatePostId, validateCommentCreation, validateStructure, handleValidationErrors, checkPostExistence,
        commentsController.createComment)
    .all(notAllowed);

router.route('/:commentId')
    .put(validateCommentUpdating, validateStructure, handleValidationErrors, authorizeCommentUpdating, commentsController.updateComment)
    .delete(validateRouteParams, validateStructure, handleValidationErrors, authorizeCommentDeletion, commentsController.deleteComment)
    .all(notAllowed);

router.route('/:commentId/likes')
    .get(validateRouteParams, validatePage, validateStructure, handleValidationErrors, checkCommentExistence,
        commentsController.getCommentsLikers)
    .patch(validateRouteParams, validateLikesUpdating, validateStructure, handleValidationErrors, checkCommentExistence,
        userController.updateCommentLikes)
    .all(notAllowed)

router.all('*', notFound);

module.exports = router;