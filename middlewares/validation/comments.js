const Comment = require('../../models/comment');
const { ObjectId } = require('mongodb');
const { checkExact, body, validationResult } = require('express-validator');

exports.checkCommentExistence = async (req, res, next) => {
    const { commentId } = req.params;
    try {
        let comment;
        if (commentId.length === 24) {
            comment = await comment.getcomment({ _id: ObjectId.createFromHexString(commentId) });
        }

        if (!comment) {
            const err = new Error('comment not found');
            err.statusCode = 404;
            throw err;
        }

        req.comment = new Comment(comment);
        return next();
    }
    catch (err) {
        return next(err);
    }
};

const validateStructure = checkExact([], {
    message: 'Bad request, request structure is invalid because too many fields are passed',
    locations: ['body', 'query']
});

const validateCommentContent = () => body('content')
    .notEmpty()
    .withMessage("Comment content can't be empty")
    .isString()
    .withMessage("Comment content must be a string")
    .trim()
    .isLength({ max: 200 })
    .withMessage("Comment content can't exceed 200 character")

exports.validateCommentCreation = [
    validateCommentContent()
    ,
    body('parentId')
        .optional({ values: 'null' })
        .notEmpty()
        .withMessage("parentId can't be empty")
        .isString()
        .withMessage("parentId must be a string")
        .trim()
        .isMongoId()
        .withMessage('parentId must be a valid MongoDb ObjectId')
        .customSanitizer(parentId => ObjectId.createFromHexString(parentId))
    ,
    validateStructure
];

exports.validateCommentUpdating = [
    validateCommentContent()
    ,
    validateStructure
];