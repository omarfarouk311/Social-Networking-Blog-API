const { Router } = require('express');
const { notAllowed, notFound } = require('../middlewares/errors');
const { validateQueryParams, handleValidationErrors } = require('../middlewares/validation/post');
const { getUserProfile, getUserPosts, getUserLikes, getUserFollowing, getUserFollowers } = require('../controllers/user');
const { checkUserExistence, validatePage } = require('../middlewares/validation/user');
const router = Router();

router.route('/')
    .get(getUserProfile)
    .all(notAllowed);

router.route('/posts')
    .get(validateQueryParams, handleValidationErrors, getUserPosts)
    .all(notAllowed);

router.route('/likes')
    .get(validateQueryParams, handleValidationErrors, getUserLikes)
    .all(notAllowed);

router.route('/following')
    .get(validatePage, handleValidationErrors, checkUserExistence, getUserFollowing)
    .all(notAllowed);

router.route('/followers')
    .get(validatePage, handleValidationErrors, checkUserExistence, getUserFollowers)
    .all(notAllowed);

router.all('*', notFound);

module.exports = router;