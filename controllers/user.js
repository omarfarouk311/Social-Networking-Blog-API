const User = require('../models/user');
const Post = require('../models/post');
const { getDb } = require('../util/database');

exports.updatePostLikes = async (req, res, next) => {
    const { userId, post, body } = req;
    const user = new User({ _id: userId });
    let updatedPost;

    try {
        if (body.value === 1) {
            updatedPost = await user.likePost(post);
            if (!updatedPost) {
                const err = new Error('Post already liked');
                err.statusCode = 409;
                throw err;
            }
        }
        else {
            updatedPost = await user.unlikePost(post);
            if (!updatedPost) {
                const err = new Error("Post isn't liked");
                err.statusCode = 409;
                throw err;
            }
        }

        return res.status(200).json({
            message: 'Post Likes updated successfully',
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
        if (body.value === 1) {
            updatedComment = await user.likeComment(comment);
            if (!updatedComment) {
                const err = new Error('Comment already liked');
                err.statusCode = 409;
                throw err;
            }
        }
        else {
            updatedComment = await user.unlikeComment(comment);
            if (!updatedComment) {
                const err = new Error("Comment isn't liked");
                err.statusCode = 409;
                throw err;
            }
        }

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
    const { userId, post } = req;
    const user = new User({ _id: userId });

    try {
        const result = await user.addBookmark(post);
        if (!result) {
            const err = new Error('Post already bookmarked');
            err.statusCode = 409;
            throw err;
        }
        return res.status(200).json({
            message: 'Post added to bookmarks successfully',
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.removeBookmark = async (req, res, next) => {
    const { userId, post } = req;
    const user = new User({ _id: userId });

    try {
        const result = await user.removeBookmark(post);
        if (!result) {
            const err = new Error("Post isn't bookmarked");
            err.statusCode = 409;
            throw err;
        }
        return res.status(204).json({ message: 'Post removed from bookmarks successfully' });
    }
    catch (err) {
        return next(err);
    }
};

exports.getBookmarks = async (req, res, next) => {
    const { userId } = req, { lastId } = req.query;
    const bookmarksIds = User.getUser({ _id: userId }, { bookmarksIds: 1, _id: 0 });
    const filter = { _id: { $in: bookmarksIds } };
    if (lastId) {
        filter._id.$lt = lastId;
    }

    try {
        const result = await Post.getPostsInfo(filter, userId);
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
    const likedPostsIds = User.getUser({ _id: userId }, { likedPostsIds: 1, _id: 0 });
    const filter = { _id: { $in: likedPostsIds } };
    if (lastId) {
        filter._id.$lt = lastId;
    }

    try {
        const result = await Post.getPostsInfo(filter, userId);
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
        const result = await Post.getPostsInfo(filter, userId);
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
        const userProfile = await User.getUserInfo({ _id: userId });

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

exports.updateFollowers = async (req, res, next) => {
    const { userId } = req, { followedId, type } = req.body;
    const user = new User({ _id: userId });

    try {
        const [userFollowingCount, followedFollowersCount] = await user.updateFollowers(followedId, type);
        return res.status(200).json({
            message: 'followers updated successfully',
            userFollowingCount,
            followedFollowersCount
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.deleteUser = async (req, res, next) => {
    const { userId } = req;

    try {
        const projection = {
            imageUrl: 1,
            followingIds: 1,
            followersIds: 1,
            bookmarksIds: 1,
            likedPostsIds: 1,
            likedCommentsIds: 1
        };
        const user = new User(await User.getUser({ _id: userId }, projection));
        const db = getDb();
        await Promise.all[user.deleteUser(), db.collection('tokens').deleteOne({ userId }),
            db.collection('refresh tokens').deleteOne({ userId })];

        return res
            .status(204)
            .clearCookie('refreshToken', {
                httpOnly: true,
                sameSite: 'None',
                signed: true,
                secure: true
            })
            .clearCookie('csrfToken', {
                httpOnly: false,
                sameSite: 'None',
                signed: true,
                secure: true
            })
            .json({
                message: 'User deleted successfully'
            });
    }
    catch (err) {
        return next(err);
    }
};

exports.updateUser = async (req, res, next) => {
    const { body, userId } = req;
    if (!Object.keys(body).length) {
        return res.status(400).json({ message: 'Bad request' });
    }

    const user = new User({ _id: userId });
    try {
        const projection = { _id: 0 };
        for (const key in body) {
            projection[key] = 1;
        }

        const updatedUser = await user.findAndUpdateUser({ _id: userId }, { $set: body }, projection);
        return res.status(200).json({
            message: 'User data updated successfully',
            ...updatedUser
        });
    }
    catch (err) {
        return next(err);
    }
};