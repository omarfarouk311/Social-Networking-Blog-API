const { Router } = require('express');
const { notAllowed, notFound } = require('../middlewares/errors');
const authController = require('../controllers/auth');
const { validateSignup, validateLogin } = require('../middlewares/validation/user');
const { validateStructure, handleValidationErrors } = require('../middlewares/validation/post');
const router = Router();

router.route('/signup')
    .post(validateSignup, validateStructure, handleValidationErrors, authController.signUp)
    .all(notAllowed);

router.route('/login')
    .post(validateLogin, validateStructure, handleValidationErrors, authController.logIn)
    .all(notAllowed);

router.use(authController.authenticateUser);

router.route('/logout')
    .post(authController.logOut)
    .all(notAllowed);

router.route('/refresh-token')
    .post(authController.csrfProtection, authController.refreshToken)
    .all(notAllowed);

router.all('*', notFound);

module.exports = router