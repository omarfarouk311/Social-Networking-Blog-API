const { body, query, param } = require('express-validator');
const User = require('../../models/user');
const { ObjectId } = require('mongodb');

exports.checkUserExistence = async (req, res, next) => {
    const { userId } = req.params;

    try {
        const user = await User.getUser({ _id: userId }, { _id: 1 });

        if (!user) {
            const err = new Error('User not found');
            err.statusCode = 404;
            throw err;
        }

        req.user = user;
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
        const user = await User.getUser({ email }, { email: 1, _id: 0 });
        if (user) {
            throw new Error('Email already used');
        }
        return true;
    });

const validatePassword = () => body('password')
    .isStrongPassword()
    .withMessage('Password length must be atleast 8 and contains numbers, symbols, uppercase and lowercase letters');


const validateConfirmationPassword = () => body('confirmationPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Password must match confirmation password');

exports.validateUserCreation = [
    validateUserName(),
    validateUserBio(),
    validateUserLocation()
];

exports.validateSignup = [
    validateEmail(),
    validatePassword(),
    validateConfirmationPassword(),
    ...exports.validateUserCreation
];

exports.validatePage = query('page')
    .optional()
    .isInt({ gt: -1 })
    .withMessage('Invalid pagination page, it must be 0 or more')
    .bail()
    .customSanitizer(page => parseInt(page));

exports.validateFollowAction = [
    body('followedId')
        .isString()
        .withMessage("followedId must be a string")
        .trim()
        .isMongoId()
        .withMessage('followedId must be a valid MongoDb ObjectId')
        .bail()
        .customSanitizer(followedId => ObjectId.createFromHexString(followedId))
        .custom(async (followedId, { req }) => {
            if (req.userId.equals(followedId)) throw new Error("Invalid followedId, A user can't follow himself");
            const found = await User.getUser({ _id: followedId }, { _id: 1 });
            if (!found) throw new Error('Invalid followedId, This Id is not found');
            return true;
        })
    ,
    body('action')
        .notEmpty()
        .withMessage('action must be passed')
        .custom(action => action === 1 || action === -1)
        .withMessage('action value must be an integer with value equals 1 or -1')
];

exports.validateUserId = param('userId')
    .isString()
    .withMessage("userId must be a string")
    .trim()
    .isMongoId()
    .withMessage('userId must be a valid MongoDb ObjectId')
    .bail()
    .customSanitizer(userId => ObjectId.createFromHexString(userId))