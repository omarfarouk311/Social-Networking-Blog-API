const { Router } = require('express');
const { notAllowed, notFound } = require('../middlewares/errors');
const authController = require('../controllers/auth');
const { validateSignup } = require('../middlewares/validation/user');
const { handleValidationErrors } = require('../middlewares/validation/post');
const upload = require('../util/multer configurations').single('image');
const router = Router();

router.route('/signup')
    .post(upload, validateSignup, handleValidationErrors, authController.signUp)
    .all(notAllowed);

router.route('/login')
    .post(authController.logIn)
    .all(notAllowed);

router.route('/refresh-token')
    .post(authController.csrfProtection, authController.refreshToken)
    .all(notAllowed);

router.route('/logout')
    .post(authController.authenticateUser, authController.logOut)
    .all(notAllowed);
 
router.all('*', notFound);

module.exports = router