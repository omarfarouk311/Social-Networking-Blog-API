const { body, query } = require('express-validator');
const User = require('../../models/user');

exports.checkUserExistence = async (req, res, next) => {
    const { userId } = req.params;

    try {
        const user = await User.getUser({ _id: userId }, { _id: 1 });

        if (!user) {
            const err = new Error('User not found');
            err.statusCode = 404;
            throw err;
        }

        req.user = new User(user);
        return next();
    }
    catch (err) {
        return next(err);
    }
};

const validateUserName = () => body('name')
    .notEmpty()
    .withMessage("User name can't be empty")
    .isString()
    .withMessage('User name must be a string')
    .isAlphanumeric()
    .withMessage('User name can contain characters and numbers only')
    .trim()
    .isLength({ min: 5, max: 15 })
    .withMessage('User name length must be between 5 to 15 characters');

const validateUserBio = () => body('bio')
    .isString()
    .withMessage('User bio must be a string')
    .trim()
    .isLength({ max: 50 })
    .withMessage("User bio length can't exceed 50 characters");

const validateUserLocation = () => body('location')
    .isString()
    .withMessage('User location must be a string')
    .isAlpha()
    .withMessage('User location can contain characters only')
    .trim()
    .isLength({ max: 15 })
    .withMessage("User location length must can't exceed 15 characters");

const validateEmail = () => body('email')
    .notEmpty()
    .withMessage("Email address can't be empty")
    .isEmail()
    .withMessage('Invalid Email address')
    .bail()
    .normalizeEmail()
    .custom(async email => {
        const user = await User.getUser({ email }, { email: 1 });
        if (user) throw new Error('Email already used');
        return true;
    });

const validatePassword = () => body('password')
    .isStrongPassword()
    .withMessage('Password length must be atleast 8 and contains numbers, symbols, uppercase and lowercase letters');


const validateConfirmationPassword = () => body('confirmationPassword')
    .custom((value, { location }) => value === location.password)
    .withMessage('Password must match confirmation password');

exports.validateUserCreation = [
    validateUserName(),
    validateUserBio(),
    validateUserLocation()
];

exports.validateSignup = [
    validateEmail(),
    validatePassword,
    validateConfirmationPassword(),
    ...exports.validateUserCreation
];

exports.validateLogin = [
    validateEmail(),
    validatePassword()
];

exports.validatePage = query('page', 'Invalid pagination page, it must be 0 or more')
    .optional()
    .notEmpty()
    .isInt()
    .customSanitizer(page => parseInt(page));

exports.validateFollowAction = [
    body('followerId')
        .notEmpty()
        .withMessage("followerId can't be empty")
        .isString()
        .withMessage("followerId must be a string")
        .trim()
        .isMongoId()
        .withMessage('followerId must be a valid MongoDb ObjectId')
        .customSanitizer(postId => ObjectId.createFromHexString(postId))
    ,
    body('action')
        .notEmpty()
        .withMessage('Action must be passed')
        .isInt({ allow_leading_zeroes: false, max: 1, min: -1 })
        .withMessage('Action value must be 1 or -1')
        .customSanitizer(action => parseInt(action))
];