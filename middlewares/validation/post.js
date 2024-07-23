const Post = require('../../models/post');
const { ObjectId } = require('mongodb');
const { checkExact, body, validationResult } = require('express-validator');

exports.checkPostExistence = async (req, res, next) => {
    const { postId } = req.params;
    try {
        let post;
        if (postId.length === 24) {
            post = await Post.getPost({ _id: ObjectId.createFromHexString(postId) });
        }

        if (!post) {
            const err = new Error('Post not found');
            err.statusCode = 404;
            throw err;
        }

        req.post = new Post(post);
        return next();
    }
    catch (err) {
        return next(err);
    }
};

exports.validatePostCreation = [
    body('title')
        .trim()
        .isString()
        .withMessage("Post title must be a string")
        .notEmpty()
        .withMessage("Post title can't be empty")
        .isLength({ min: 5, max: 30 })
        .withMessage("Title length must be between 5 to 30 characters")
    ,
    body('content')
        .trim()
        .isString()
        .withMessage("Post content must be a string")
        .notEmpty()
        .withMessage("Post content can't be empty")
        .isLength({ max: 1000 })
        .withMessage("Post content can't exceed 1000 character")
    ,
    checkExact([], { message: 'Request structure is invalid because too many fields are passed', locations: ['body', 'query'] })
];

exports.validatePostUpdating = [
    body('modifyLikes')
        .optional()
        .isBoolean()
        .withMessage("modifyLikes value must be a boolean value")
    ,
    body('value')
        .optional()
        .isInt({ allow_leading_zeroes: false, max: 1, min: -1 })
        .withMessage('value must be 1 or -1')
    ,
    body('title')
        .optional()
        .trim()
        .isString()
        .withMessage("Post title must be a string")
        .notEmpty()
        .withMessage("Post title can't be empty")
        .isLength({ min: 5, max: 30 })
        .withMessage("Title length must be between 5 to 30 characters")
    ,
    body('content')
        .optional()
        .trim()
        .isString()
        .withMessage("Post content must be a string")
        .notEmpty()
        .withMessage("Post content can't be empty")
        .isLength({ max: 1000 })
        .withMessage("Post content can't exceed 1000 character")
    ,
    body('tags')
        .optional()
        .isArray()
        .withMessage("Post tags must be an array")
    ,
    body('tags.*')
        .optional()
        .isString()
        .withMessage("Tags value must be a string")
    ,
    checkExact([], { message: 'Request structure is invalid because too many fields are passed', locations: ['body', 'query'] })
];

exports.handleValidationErrors = (req, res, next) => {
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
        errors = errors.array();
        const err = errors.find(err => err.type === 'unknown_fields');
        if (err) {
            err.statusCode = 400;
            return next(err);
        }
        return next(errors.array());
    }
    next();
}