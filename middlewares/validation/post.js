const Post = require('../../models/post');
const { ObjectId } = require('mongodb');
const { body, validationResult, query, buildCheckFunction } = require('express-validator');
const checkPostId = buildCheckFunction(['body', 'params']);

exports.checkPostExistence = async (req, res, next) => {
    const postId = req.params.postId || req.body.postId;

    try {
        const post = await Post.getPost({ _id: postId }, { _id: 1 });

        if (!post) {
            const err = new Error('Post not found');
            err.statusCode = 404;
            throw err;
        }

        req.post = post;
        return next();
    }
    catch (err) {
        return next(err);
    }
};

const validatePostId = () => checkPostId('postId')
    .notEmpty()
    .withMessage("postId can't be empty")
    .isString()
    .withMessage("postId must be a string")
    .trim()
    .isMongoId()
    .withMessage('postId must be a valid MongoDb ObjectId')
    .bail()
    .customSanitizer(postId => ObjectId.createFromHexString(postId))

const validateLastId = () => query('lastId')
    .notEmpty()
    .withMessage('lastId must be passed in query parameters')
    .isString()
    .withMessage("lastId must be a string")
    .trim()
    .isMongoId()
    .withMessage('lastId must be a valid MongoDb ObjectId')
    .bail()
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
    body('tags')
        .isArray()
        .withMessage("Post tags must be an array")
        .custom(tags => tags.length)
        .withMessage('Atleast one tag must be choosen')
];

exports.validatePostUpdating = [
    validatePostId()
    ,
    ...exports.validatePostCreation
];

exports.validateLikesUpdating = body('action')
    .notEmpty()
    .withMessage('Action must be passed')
    .custom(action => action === 1 || action === -1)
    .withMessage('Action value must be 1 or -1')
    .bail()
    .customSanitizer(action => parseInt(action));

exports.validateQueryParams = [
    validateLastId().optional()
    ,
    query('tags')
        .optional()
        .isArray()
        .withMessage("Post tags must be an array")
    ,
    query('following')
        .optional()
        .isBoolean()
        .withMessage('following parameter must be true or false')
        .bail()
        .customSanitizer(following => Boolean(following))
];

exports.validatePostId = validatePostId();

exports.validateLastId = validateLastId();

exports.handleValidationErrors = (req, res, next) => {
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
        errors = errors.array();
        const err = errors.find(err => err.type === 'unknown_fields');
        if (err) {
            err.statusCode = 400;
            return next(err);
        }

        return next(errors);
    }

    next();
};