const { Router } = require('express');
const { notAllowed } = require('../middlewares/errors');
const { validateLastId, handleValidationErrors, validateStructure } = require('../middlewares/validation/post');
const { getUserProfile, getUserPosts, getUserLikes, getUserFollowing, getUserFollowers,
    updateFollowers, getUserData, updateUser } = require('../controllers/user');
const { validateFollowAction, validateUserCreation, validatePage } = require('../middlewares/validation/user');
const upload = require('../util/multer configurations');
const userRouter = require('./user');
const router = Router();

router.route('/')
    .get(getUserProfile)
    .all(notAllowed);

router.route('/account')
    .get(getUserData)
    .put(validateUserCreation, validateStructure, handleValidationErrors, upload.single('image'), updateUser)
    .all(notAllowed);

router.route('/posts')
    .get(validateLastId, handleValidationErrors, getUserPosts)
    .all(notAllowed);

router.route('/likes')
    .get(validatePage, handleValidationErrors, getUserLikes)
    .all(notAllowed);

router.route('/following')
    .get(getUserFollowing)
    .patch(validateFollowAction, handleValidationErrors, updateFollowers)
    .all(notAllowed);

router.route('/followers')
    .get(getUserFollowers)
    .all(notAllowed);

router.use('/:userId', userRouter);

module.exports = router;