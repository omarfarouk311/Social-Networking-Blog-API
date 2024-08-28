const Post = require('../../models/post');
const { ObjectId } = require('mongodb');
const { checkExact, body, validationResult, query, buildCheckFunction } = require('express-validator');
const { deleteImages } = require('../../util/images');
const checkPostId = buildCheckFunction(['body', 'params']);

exports.checkPostExistence = async (req, res, next) => {
    const { postId } = req.params || req.body;

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

exports.validateStructure = checkExact([], {
    message: 'Bad request, request structure is invalid because too many fields are passed'
});

const validatePostId = () => checkPostId('postId')
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
    .isInt({ allow_leading_zeroes: false, max: 1, min: -1 })
    .withMessage('Action value must be 1 or -1')
    .customSanitizer(action => parseInt(action));

exports.validateQueryParams = [
    validateLastId()
    ,
    query('tags')
        .optional()
        .isString()
        .customSanitizer(tags => tags.split(','))
    ,
    query('following')
        .optional()
        .isBoolean({ strict: true })
        .withMessage('following parameter must be true or false')
        .customSanitizer(following => Boolean(following))
];

exports.validatePostId = validatePostId();

exports.validateLastId = validateLastId();

exports.handleValidationErrors = (req, res, next) => {
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
        if (req.file) {
            deleteImages([req.file.path]);
        }
        if (req.files) {
            deleteImages(req.files.map(file => file.path));
        }

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