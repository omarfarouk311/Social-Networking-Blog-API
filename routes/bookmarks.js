const { Router } = require('express');
const { notAllowed } = require('../middlewares/errors');
const userController = require('../controllers/user');
const router = Router();

router.route('/')
    .post(userController.addBookmark)
    .get(userController.getBookmarks)
    .all(notAllowed);

router.route('/:postId')
    .delete(userController.removeBookmark)
    .all(notAllowed);