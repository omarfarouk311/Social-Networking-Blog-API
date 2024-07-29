const { Router } = require('express');
const { notAllowed } = require('../middlewares/errors');
const { validateQueryParams } = require('../middlewares/validation/post');
const userController = require('../controllers/user');
const upload = require('../util/multer configurations');
const router = Router();

router.route('/')
    .get(userController.getUserProfile)
    .all(notAllowed);

router.route('posts')
    .get(validateQueryParams, userController.getUserPosts)
    .all(notAllowed);

router.route('/likes')
    .get(validateQueryParams, userController.getUserLikes)
    .all(notAllowed);