const { Router } = require('express');
const { notAllowed, notFound } = require('../middlewares/errors');
const { checkPostExistence, validateLikesUpdating, handleValidationErrors, validatePostId } = require('../middlewares/validation/post');
const { checkCommentExistence, validateCommentCreation, validateCommentUpdating, validateQueryParams,
    validateRouteParams } = require('../middlewares/validation/comments');
const { authorizeCommentDeletion, authorizeCommentUpdating } = require('../middlewares/authorization/comment');
const commentsController = require('../controllers/comments');
const { validatePage } = require('../middlewares/validation/user');
const router = Router({ mergeParams: true });

router.route('/')
    .get(validateQueryParams, validatePostId, handleValidationErrors, checkPostExistence,
        commentsController.getComments)
    .post(validatePostId, validateCommentCreation, handleValidationErrors, checkPostExistence,
        commentsController.createComment)
    .all(notAllowed);

router.route('/:commentId')
    .put(validateCommentUpdating, handleValidationErrors, checkPostExistence, authorizeCommentUpdating, commentsController.updateComment)
    .delete(validateRouteParams, handleValidationErrors, checkPostExistence, authorizeCommentDeletion, commentsController.deleteComment)
    .all(notAllowed);

router.route('/:commentId/likes')
    .get(validateRouteParams, validatePage, handleValidationErrors, checkCommentExistence,
        commentsController.getCommentsLikers)
    .patch(validateRouteParams, validateLikesUpdating, handleValidationErrors, checkCommentExistence,
        commentsController.updateCommentLikes)
    .all(notAllowed)

router.all('*', notFound);

module.exports = router;