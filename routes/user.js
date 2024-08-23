const { Router } = require('express');
const { notAllowed, notFound } = require('../middlewares/errors');
const { validateLastId, handleValidationErrors } = require('../middlewares/validation/post');
const { getUserProfile, getUserPosts, getUserFollowing, getUserFollowers } = require('../controllers/user');
const { checkUserExistence, validatePage } = require('../middlewares/validation/user');
const router = Router();

router.route('/')
    .get(getUserProfile)
    .all(notAllowed);

router.route('/posts')
    .get(validateLastId, handleValidationErrors, checkUserExistence, getUserPosts)
    .all(notAllowed);

router.route('/following')
    .get(validatePage, handleValidationErrors, checkUserExistence, getUserFollowing)
    .all(notAllowed);

router.route('/followers')
    .get(validatePage, handleValidationErrors, checkUserExistence, getUserFollowers)
    .all(notAllowed);

router.all('*', notFound);

module.exports = router;