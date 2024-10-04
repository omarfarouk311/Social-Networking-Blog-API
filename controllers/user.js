const User = require('../models/user');
const Post = require('../models/post');
const DatabaseFacade = require('../models/database facade');

exports.addBookmark = async (req, res, next) => {
    const { userId, post } = req;

    try {
        const bookmarksCount = await User.addBookmark(userId, post._id);
        if (bookmarksCount === null) {
            const err = new Error('Post already bookmarked');
            err.statusCode = 409;
            throw err;
        }

        return res.status(200).json({
            message: 'Post added to bookmarks successfully',
            bookmarksCount
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.removeBookmark = async (req, res, next) => {
    const { userId, post } = req;

    try {
        const bookmarksCount = await User.removeBookmark(userId, post._id);
        if (bookmarksCount === null) {
            const err = new Error("Post isn't bookmarked");
            err.statusCode = 409;
            throw err;
        }

        return res.status(200).json({
            message: 'Post removed from bookmarks successfully',
            bookmarksCount
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.getBookmarks = async (req, res, next) => {
    const { userId } = req, { page = 1 } = req.query, { userId: viewerId } = req;;

    try {
        const { bookmarksIds, totalBookmarks } = await User.getUserBookmarks(page, userId)
        const posts = await Post.getPostsInfo({ _id: { $in: bookmarksIds } }, viewerId, true);
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
    const { userId } = req.params, { followedId, action } = req.body;

    try {
        let result;
        if (action === 1) result = await User.followUser(followedId, userId);
        else result = await User.unfollowUser(followedId, userId);

        if (!result) {
            const err = new Error(action === 1 ? 'Already following this user' : "User isn't followed");
            err.statusCode = 409;
            throw err;
        }

        return res.status(200).json({
            message: action === 1 ? 'User followed successfully' : 'User unfollowed successfully',
            ...result
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.deleteUser = async (req, res, next) => {
    const { userId } = req.params;

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
            .send()
    }
    catch (err) {
        return next(err);
    }
};

exports.updateUser = async (req, res, next) => {
    const { body } = req, { userId } = req.params;

    try {
        if (req.invalidFileType) {
            const err = new Error('Invalid file type');
            err.statusCode = 422;
            throw err;
        }

        body.imageUrl = null;
        if (req.file) {
            body.imageUrl = req.file.path;
        }

        const projection = {};
        for (const key in body) {
            projection[key] = 1;
        }

        const { imageUrl } = await User.getUser({ _id: userId }, { _id: 0, imageUrl: 1 });
        const updatedUser = await User.findAndUpdateUser({ _id: userId }, { $set: body },
            { projection, returnDocument: 'after' }, imageUrl);

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
    const { userId } = req.params, { userId: viewerId } = req;;

    try {
        const userProfile = await User.getUserInfo({ _id: userId }, viewerId);

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
    const { userId } = req.params;

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
        const { userId } = req.params;
        const { page = 1 } = req.query;
        try {
            const users = await User.getUsersInfo({ _id: userId }, field, page);
            return res.status(200).json({
                message: field === 'followingIds' ? 'Following list fetched successfully' : 'Followers list fetched successfully',
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
    const { userId } = req.params, { page = 1 } = req.query, { userId: viewerId } = req;;

    try {
        const { likedPostsIds, totalLikes } = await User.getUserLikesIds(page, userId);
        const posts = await Post.getPostsInfo({ _id: { $in: likedPostsIds } }, viewerId, true);
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
    const { userId } = req.params, { lastId } = req.query, { userId: viewerId } = req;;
    const filter = { creatorId: userId };
    if (lastId) {
        filter._id = { $lt: lastId };
    }

    try {
        const result = await Post.getPostsInfo(filter, viewerId);
        return res.status(200).json({
            message: 'User posts fetched successfully',
            ...result
        });
    }
    catch (err) {
        return next(err);
    }
};