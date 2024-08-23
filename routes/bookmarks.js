const { Router } = require('express');
const { notAllowed, notFound } = require('../middlewares/errors');
const { handleValidationErrors, validatePostId, checkPostExistence,
    validateStructure } = require('../middlewares/validation/post');
const userController = require('../controllers/user');
const { validatePage } = require('../middlewares/validation/user');
const router = Router();

router.route('/')
    .post(checkPostExistence, userController.addBookmark)
    .get(validatePage, validateStructure, handleValidationErrors, userController.getBookmarks)
    .all(notAllowed);

router.route('/:postId')
    .delete(validatePostId, validateStructure, handleValidationErrors, userController.removeBookmark)
    .all(notAllowed);

router.all('*', notFound);

module.exports = router;