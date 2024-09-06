const User = require('../models/user');
const Post = require('../models/post');
const DatabaseFacade = require('../models/database facade');

exports.addBookmark = async (req, res, next) => {
    const { userId, post } = req;

    try {
        const result = await User.addBookmark(userId, post._id);
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

    try {
        const result = await User.removeBookmark(userId, post._id);
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
    const { userId } = req, { page } = req.query;

    try {
        const { bookmarksIds, totalBookmarks } = await User.getUserBookmarks(page, userId)
        const posts = await Post.getPostsInfo({ _id: { $in: bookmarksIds } }, userId, true);
        return res.status(200).json({
            message: 'User bookmarks fetched successfully',
            posts,
            page,
            totalBookmarks
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.updateFollowers = async (req, res, next) => {
    const { userId } = req, { followedId, action } = req.body;

    try {
        let result;
        if (action === 1) result = await User.followUser(followedId, userId);
        else result = await User.unfollowUser(followedId, userId);

        if (!result) {
            const err = new Error(action === 1 ? 'Already following this user' : "User isn't followed");
            err.statusCode = 409;
            throw err;
        }

        //destructuring result array that contains updated user following count & followed user followers count
        const [userFollowingCount, followedUserFollowersCount] = result;
        return res.status(200).json({
            message: 'Following and followers updated successfully',
            userFollowingCount,
            followedUserFollowersCount
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

        const user = await User.getUser({ _id: userId }, projection);
        await DatabaseFacade.deleteUser(user);

        return res
            .status(204)
            .clearCookie('refreshToken', {
                httpOnly: true,
                sameSite: 'None',
                signed: true,
                secure: true,
            })
            .clearCookie('csrfToken', {
                httpOnly: false,
                sameSite: 'None',
                signed: false,
                secure: true,
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

    try {
        if (req.invalidFileType) {
            const err = new Error('Invalid file type');
            err.statusCode = 422;
            throw err;
        }
        if (req.file) {
            body.imageUrl = req.file.path;
        }

        const projection = {};
        for (const key in body) {
            projection[key] = 1;
        }

        const updatedUser = await User.findAndUpdateUser({ _id: userId }, { $set: body }, { projection, returnDocument: 'after' });
        return res.status(200).json({
            message: 'User data updated successfully',
            ...updatedUser
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.getUserProfile = async (req, res, next) => {
    const userId = req.params.userId || req.userId;

    try {
        const userProfile = await User.getUserInfo({ _id: userId });

        if (userProfile) {
            return res.status(200).json({
                message: 'User profile retrieved successfully',
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

exports.getUserData = async (req, res, next) => {
    const { userId } = req;

    try {
        const userData = await User.getUser({ _id: userId }, { email: 1, name: 1, location: 1, bio: 1, imageUrl: 1, creationDate: 1 });
        return res.status(200).json({
            message: 'User data fetched successfully',
            ...userData
        });
    }
    catch (err) {
        return next(err);
    }
};

function getUsers(options) {
    const { field } = options;
    return async (req, res, next) => {
        const userId = req.params.userId || req.userId;
        const { page } = req.query;
        try {
            const users = await User.getUsersInfo({ _id: userId }, field, page);
            return res.status(200).json({
                message: 'Users fetched successfully',
                users,
                page
            })
        }
        catch (err) {
            return next(err);
        }
    };
}

exports.getUserFollowing = getUsers({ field: 'followingIds' });

exports.getUserFollowers = getUsers({ field: 'followersIds' });

exports.getUserLikes = async (req, res, next) => {
    const { userId } = req, { page } = req.query;

    try {
        const { likedPostsIds, totalLikes } = await User.getUserLikesIds(page, userId);
        const posts = await Post.getPostsInfo({ _id: { $in: likedPostsIds } }, userId, true);
        return res.status(200).json({
            message: 'User liked posts fetched successfully',
            posts,
            page,
            totalLikes
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.getUserPosts = async (req, res, next) => {
    const { userId } = req.params || req, { lastId } = req.query;
    const filter = { creatorId: userId };
    if (lastId) {
        filter._id = { $lt: lastId };
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