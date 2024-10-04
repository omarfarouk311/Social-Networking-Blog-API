const { Router } = require('express');
const { notAllowed, notFound } = require('../middlewares/errors');
const { handleValidationErrors, validatePostId, checkPostExistence } = require('../middlewares/validation/post');
const userController = require('../controllers/user');
const { validatePage } = require('../middlewares/validation/user');
const { authenticateUser } = require('../controllers/auth');
const router = Router();

router.use(authenticateUser);

router.route('/')
    .post(validatePostId, handleValidationErrors, checkPostExistence, userController.addBookmark)
    .get(validatePage, handleValidationErrors, userController.getBookmarks)
    .all(notAllowed);

router.route('/:postId')
    .delete(validatePostId, handleValidationErrors, checkPostExistence, userController.removeBookmark)
    .all(notAllowed);

router.all('*', notFound);

module.exports = router;