const User = require('../models/user');
const { getFilteredPosts } = require('./feed');

exports.updatePostLikes = async (req, res, next) => {
    const { user, post, body } = req;
    let updatedPost;

    try {
        if (body.value === 1) updatedPost = await user.likePost(post)[1];
        else updatedPost = await user.unlikePost(post)[1];

        return res.status(200).json({
            message: 'Likes updated successfully',
            ...updatedPost
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.updateCommentLikes = async (req, res, next) => {
    const { body, user, comment } = req;
    let updatedComment;

    try {
        if (body.value === 1) updatedComment = await user.likeComment(comment)[1];
        else updatedComment = await user.unlikeComment(comment)[1];

        return res.status(200).json({
            message: 'Likes updated successfully',
            ...updatedComment
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.addBookmark = async (req, res, next) => {
    const { user, post } = req;

    try {
        if (user.bookmarksIds.some(id => id === post._id)) {
            return res.status(200).json({ message: 'Post already bookmarked' });
        }

        await user.addBookmark(post);
        return res.status(200).json({ message: 'Post added to bookmarks successfully' });
    }
    catch (err) {
        return next(err);
    }
};

exports.removeBookmark = async (req, res, next) => {
    const { user, post } = req;

    try {
        if (!user.bookmarksIds.some(id => id === post._id)) {
            return res.status(404).json({ message: 'Post not found in bookmarks' });
        }
        await user.removeBookmark(post);
        return res.status(204).json({ message: 'Post removed from bookmarks successfully' });
    }
    catch (err) {
        return next(err);
    }
};

exports.getBookmarks = async (req, res, next) => {
    const { user } = req, { lastId } = req.query;
    const filter = { _id: { $in: user.bookmarksIds } };
    if (lastId) {
        filter._id.$lt = lastId;
    }

    try {
        const result = await getFilteredPosts(filter);
        return res.status(200).json({
            message: 'Bookmarks fetched successfully',
            ...result
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.getUserLikes = async (req, res, next) => {
    const { user } = req, { lastId } = req.query;
    const filter = { _id: { $in: user.likedPostsIds } };
    if (lastId) {
        filter._id.$lt = lastId;
    }

    try {
        const result = await getFilteredPosts(filter);
        return res.status(200).json({
            message: 'User liked posts fetched successfully',
            ...result
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.getUserPosts = async (req, res, next) => {
    const { user } = req, { lastId } = req.query;
    const filter = { creatorId: user._id };
    if (lastId) {
        filter._id.$lt = lastId;
    }

    try {
        const result = await getFilteredPosts(filter);
        return res.status(200).json({
            message: 'User posts fetched successfully',
            ...result
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.getUserProfile = async (req, res, next) => {
    const { user } = req;

    try {
        const userProfile = await user.getUserInfo();
        return res.status(200).json({
            message: 'User profile retreived successfully',
            ...userProfile
        });
    }
    catch (err) {
        return next(err);
    }
};