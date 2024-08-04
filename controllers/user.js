const User = require('../models/user');
const Post = require('../models/post');

exports.updatePostLikes = async (req, res, next) => {
    const { userId, post, body } = req;
    const user = new User({ _id: userId });
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
    const { body, userId, comment } = req;
    const user = new User({ _id: userId });
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
    const { userId } = req, { lastId } = req.query;
    const bookmarksIds = User.getUser({ _id: userId }).project({ bookmarksIds: 1, _id: 0 });
    const filter = { _id: { $in: bookmarksIds } };
    if (lastId) {
        filter._id.$lt = lastId;
    }

    try {
        const result = await Post.getPosts(filter, userId, true);
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
    const { userId } = req, { lastId } = req.query;
    const likedPostsIds = User.getUser({ _id: userId }).project({ likedPostsIds: 1, _id: 0 });
    const filter = { _id: { $in: likedPostsIds } };
    if (lastId) {
        filter._id.$lt = lastId;
    }

    try {
        const result = await Post.getPosts(filter, userId, true);
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
    const { userId } = req, { lastId } = req.query;
    const filter = { creatorId: userId };
    if (lastId) {
        filter._id.$lt = lastId;
    }

    try {
        const result = await Post.getPosts(filter, userId, true);
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
    const { userId } = req;

    try {
        const userProfile = await User.getUser({ _id: userId }, true);

        if (userProfile) {
            return res.status(200).json({
                message: 'User profile retreived successfully',
                ...userProfile
            });
        }
        else {
            return res.status(404).json({
                message: 'User not found'
            });
        }
    }
    catch (err) {
        return next(err);
    }
};

exports.deleteUser = async (req, res, next) => {
    const { userId } = req;
    const user = new User({ _id: userId });

    try {
        await user.deleteUser();
        return res.status(204).json({
            message: 'User deleted successfully'
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.updateFollowers = async (req, res, next) => {

};