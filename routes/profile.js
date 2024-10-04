const { Router } = require('express');
const { notAllowed, notFound } = require('../middlewares/errors');
const { validateLastId, handleValidationErrors } = require('../middlewares/validation/post');
const { getUserProfile, getUserPosts, getUserLikes, getUserFollowing, getUserFollowers,
    updateFollowers, getUserData, updateUser, deleteUser } = require('../controllers/user');
const { validateFollowAction, validateUserCreation, validatePage, checkUserExistence,
    validateUserId } = require('../middlewares/validation/user');
const { authorizeUser } = require('../middlewares/authorization/user');
const upload = require('../util/multer configurations').single('image');
const { authenticateUser } = require('../controllers/auth');
const router = Router({ mergeParams: true });

router.use(authenticateUser);

router.route('/')
    .get(validateUserId, handleValidationErrors, checkUserExistence, getUserProfile)
    .all(notAllowed);

router.route('/account')
    .all(validateUserId, handleValidationErrors, checkUserExistence, authorizeUser)
    .get(getUserData)
    .put(upload, validateUserCreation, handleValidationErrors, updateUser)
    .delete(deleteUser)
    .all(notAllowed);

router.route('/posts')
    .get(validateUserId, validateLastId, handleValidationErrors, checkUserExistence, getUserPosts)
    .all(notAllowed);

router.route('/likes')
    .get(validateUserId, validatePage, handleValidationErrors, checkUserExistence, authorizeUser, getUserLikes)
    .all(notAllowed);

router.route('/following')
    .get(validateUserId, validatePage, handleValidationErrors, checkUserExistence, getUserFollowing)
    .patch(validateUserId, validateFollowAction, handleValidationErrors, checkUserExistence, authorizeUser, updateFollowers)
    .all(notAllowed);

router.route('/followers')
    .get(validateUserId, validatePage, handleValidationErrors, checkUserExistence, getUserFollowers)
    .all(notAllowed);

router.all('*', notFound);

module.exports = router;