const Post = require('../../models/post');
const { ObjectId } = require('mongodb');
const { checkExact, body, validationResult, query, param } = require('express-validator');

exports.checkPostExistence = async (req, res, next) => {
    const { postId } = req.params;

    try {
        const post = await Post.getPost({ _id: postId }).project({ _id: 1 });

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

const validateStructure = checkExact([], {
    message: 'Bad request, request structure is invalid because too many fields are passed'
});

const validatePostId = () => param('postId')
    .notEmpty()
    .withMessage("postId can't be empty")
    .isString()
    .withMessage("postId must be a string")
    .trim()
    .isMongoId()
    .withMessage('postId must be a valid MongoDb ObjectId')
    .customSanitizer(postId => ObjectId.createFromHexString(postId))

const validateLastId = () => query('lastId')
    .optional()
    .isString()
    .withMessage("lastId must be a string")
    .trim()
    .isMongoId()
    .withMessage('lastId must be a valid MongoDb ObjectId')
    .customSanitizer(lastId => ObjectId.createFromHexString(lastId))

const validatePostTitle = () => body('title')
    .notEmpty()
    .withMessage("Post title can't be empty")
    .isString()
    .withMessage("Post title must be a string")
    .trim()
    .isLength({ min: 5, max: 30 })
    .withMessage("Title length must be between 5 to 30 characters")

const validatePostContent = () => body('content')
    .notEmpty()
    .withMessage("Post content can't be empty")
    .isString()
    .withMessage("Post content must be a string")
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Post content can't exceed 1000 character")

exports.validatePostCreation = [
    validatePostTitle()
    ,
    validatePostContent()
    ,
    validateStructure
];

exports.validatePostUpdating = [
    validatePostId()
    ,
    validatePostTitle().optional()
    ,
    validatePostContent.optional()
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
    validateStructure
];

exports.validateLikesUpdating = [
    body('modifyLikes')
        .isBoolean()
        .withMessage("modifyLikes value must be a boolean value")
        .custom(value => value === true)
        .withMessage("modifyLikes must be true")
    ,
    body('value')
        .isInt({ allow_leading_zeroes: false, max: 1, min: -1 })
        .withMessage('value must be 1 or -1')
    ,
    validateStructure
];

exports.validateLastId = validateLastId();

exports.validatePostId = validatePostId();

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
};