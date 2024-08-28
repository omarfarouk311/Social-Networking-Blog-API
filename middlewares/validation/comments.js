const Comment = require('../../models/comment');
const { ObjectId } = require('mongodb');
const { body, param } = require('express-validator');
const { validatePostId, validateLastId } = require('./post');

exports.checkCommentExistence = async (req, res, next) => {
    const { commentId, postId } = req.params;

    try {
        const comment = await Comment.getcomment({ postId, _id: commentId }, { _id: 1 });

        if (!comment) {
            const err = new Error('Comment not found');
            err.statusCode = 404;
            throw err;
        }

        req.comment = comment;
        return next();
    }
    catch (err) {
        return next(err);
    }
};

const validateCommentId = () => param('commentId')
    .notEmpty()
    .withMessage("commentId can't be empty")
    .isString()
    .withMessage("commentId must be a string")
    .trim()
    .isMongoId()
    .withMessage('commentId must be a valid MongoDb ObjectId')
    .customSanitizer(commentId => ObjectId.createFromHexString(commentId));

const validateCommentContent = () => body('content')
    .notEmpty()
    .withMessage("Comment content can't be empty")
    .isString()
    .withMessage("Comment content must be a string")
    .trim()
    .isLength({ max: 200 })
    .withMessage("Comment content can't exceed 200 character");

const validateParentId = () => body('parentId')
    .optional({ values: 'null' })
    .notEmpty()
    .withMessage("parentId can't be empty")
    .isString()
    .withMessage("parentId must be a string")
    .trim()
    .isMongoId()
    .withMessage('parentId must be a valid MongoDb ObjectId')
    .customSanitizer(parentId => ObjectId.createFromHexString(parentId));

exports.validateCommentCreation = [
    validateCommentContent()
    ,
    validateParentId()
];

exports.validateQueryParams = [
    validateLastId,
    validateParentId()
];

exports.validateRouteParams = [validateCommentId(), validatePostId];

exports.validateCommentUpdating = [...exports.validateRouteParams, validateCommentContent()];