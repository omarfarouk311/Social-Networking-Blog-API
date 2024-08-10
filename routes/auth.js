const { Router } = require('express');
const { notAllowed } = require('../middlewares/errors');
const authController = require('../controllers/auth');
const router = Router();

router.route('/signup')
    .post(authController.signUp)
    .all(notAllowed);

router.route('/login')
    .post(authController.logIn)
    .all(notAllowed);

router.route('/logout')
    .post(authController.logOut)
    .all(notAllowed);

router.route('/refresh-token')
    .post(authController.refreshToken)
    .all(notAllowed);

module.exports = router