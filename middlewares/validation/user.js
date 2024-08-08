const { body } = require('express-validator');
const User = require('../../models/user');

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

exports.validatePassword = [
    body('password')
        .isStrongPassword()
        .withMessage('Password length must be atleast 8 and contains numbers, symbols, uppercase and lowercase letters')
    ,
    body('confirmationPassword')
        .custom((value, { location }) => value === location.password)
        .withMessage('Password must match confirmation password')
];

const validateUserCreation = [
    validateUserName(),
    validateUserBio(),
    validateUserLocation()
];

exports.validateSignup = [
    validateEmail(),
    ...exports.validatePassword,
    ...validateUserCreation
];

exports.validateUserUpdate = [
    validateUserName().optional(),
    validateUserBio().optional(),
    validateUserLocation().optional()
];