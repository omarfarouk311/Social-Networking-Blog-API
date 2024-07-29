const { Router } = require('express');
const { notAllowed } = require('../middlewares/errors');
const { validateQueryParams, handleValidationErrors } = require('../middlewares/validation/post');
const userController = require('../controllers/user');
const upload = require('../util/multer configurations');
const router = Router();

router.route('/')
    .get(userController.getUserProfile)
    .all(notAllowed);

router.route('/posts')
    .get(validateQueryParams, handleValidationErrors, userController.getUserPosts)
    .all(notAllowed);

router.route('/likes')
    .get(validateQueryParams, handleValidationErrors, userController.getUserLikes)
    .all(notAllowed);