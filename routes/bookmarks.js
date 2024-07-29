const { Router } = require('express');
const { notAllowed } = require('../middlewares/errors');
const { validateQueryParams } = require('../middlewares/validation/post');
const userController = require('../controllers/user');
const router = Router();

router.route('/')
    .post(userController.addBookmark)
    .get(validateQueryParams, userController.getBookmarks)
    .all(notAllowed);

router.route('/:postId')
    .delete(userController.removeBookmark)
    .all(notAllowed);