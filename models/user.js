const { getDb } = require('../util/database.js');
const { deleteImages } = require('../util/images.js');
const Post = require('./post.js');

module.exports = class User {
    constructor({ _id, email, password, name, imageUrl, followingIds, followersIds, bookmarksIds, likedPostsIds, bio, location,
        creationDate, followingCount, followersCount, likedCommentsIds }) {
        this._id = _id;
        this.email = email;
        this.password = password;
        this.name = name;
        this.bio = bio;
        this.location = location;
        this.imageUrl = imageUrl;
        this.followingIds = followingIds;
        this.followersIds = followersIds;
        this.bookmarksIds = bookmarksIds;
        this.likedPostsIds = likedPostsIds;
        this.likedCommentsIds = likedCommentsIds;
        this.creationDate = creationDate;
        this.followingCount = followingCount;
        this.followersCount = followersCount;
    }

    async createUser() {
        const db = getDb();
        const { insertedId } = await db.collection('users').insertOne(this);
        this._id = insertedId;
    }

    static async findAndUpdateUser(filter, update, projection) {
        const db = getDb();
        let imageUrl;
        if (update.$set && update.$set.imageUrl) {
            imageUrl = await User.getUser(filter, { _id: 0, imageUrl: 1 }).imageUrl;
        }
        const updatedUser = await db.collection('users').findOneAndUpdate(filter, update, { projection, returnDocument: 'after' });
        if (imageUrl) deleteImages([imageUrl]);
        return updatedUser;
    }

    static updateUser(filter, update) {
        const db = getDb();
        return db.collection('users').updateOne(filter, update);
    }

    static updateUsers(filter, update) {
        const db = getDb();
        return db.collection('users').updateMany(filter, update);
    }

    static deleteUser(filter) {
        const db = getDb();
        return db.collection('users').deleteOne(filter);
    }

    static async getUserInfo(filter) {
        const db = getDb();
        const result = await db.collection('users').aggregate([
            {
                $match: filter
            },
            {
                $lookup: {
                    from: 'posts',
                    localField: '_id',
                    foreignField: 'creatorId',
                    as: 'posts',
                    pipeline: [
                        { $sort: { _id: -1 } },
                        { $limit: 10 },
                        { $project: { content: 0, imagesUrls: 0, creatorId: 0 } },
                    ]
                }
            },
            {
                $addFields: {
                    posts: {
                        $map: {
                            input: '$posts',
                            as: 'post',
                            in: {
                                $mergeObjects: [
                                    '$$post',
                                    {
                                        creator: {
                                            _id: '$_id',
                                            name: '$name'
                                        }
                                    }
                                ]
                            }
                        }
                    },
                    lastPostId: { $arrayElemAt: ['$posts._id', -1] }
                }
            },
            {
                $project: {
                    email: 0,
                    password: 0,
                    bookmarksIds: 0,
                    likedCommentsIds: 0,
                    followersIds: 0,
                    followingIds: 0,
                    likedPostsIds: 0,
                }
            }
        ]).toArray();

        return result.length ? result[0] : null;
    }

    static getUser(filter, projection) {
        const db = getDb();
        return db.collection('users').findOne(filter, { projection });
    }

    static async getUsersInfo(filter, field, page) {
        const db = getDb();
        const result = await db.collection('users').aggregate([
            {
                $match: filter
            },
            {
                $project: {
                    [field]: { $slice: [`$${field}`, 20 * page, 20] },
                    _id: 0
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: `${field}`,
                    foreignField: '_id',
                    as: 'users',
                    pipeline: [
                        { $project: { name: 1, imageUrl: 1 } }
                    ]
                }
            },
            {
                $project: { [field]: 0 }
            }
        ]).toArray();

        return result[0].users;
    }

    static async getUserLikesIds(page, userId) {
        const db = getDb();
        const result = await db.collection('users').aggregate([
            {
                $match: { _id: userId }
            },
            {
                $project: {
                    likedPostsIds: { $slice: ['$likedPostsIds', 10 * page, 10] },
                    _id: 0
                }
            },
        ]).toArray();

        return result[0].likedPostsIds;
    }

    static async getUserBookmarks(page, userId) {
        const db = getDb();
        const result = await db.collection('users').aggregate([
            {
                $match: { _id: userId }
            },
            {
                $project: {
                    bookmarksIds: { $slice: ['$bookmarksIds', 10 * page, 10] },
                    _id: 0
                }
            },
        ]).toArray();

        return result[0].bookmarksIds;
    }

    static async followUser(followedId, userId) {
        const { modifiedCount } = await User.updateUser(
            { _id: userId },
            {
                $addToSet: {
                    followingIds: {
                        $each: [followedId],
                        $position: 0
                    }
                }
            }
        );
        if (!modifiedCount) return null;

        const promise1 = User.findAndUpdateUser(
            { _id: userId },
            {
                $inc: { followingCount: 1 }
            },
            { followingCount: 1, _id: 0 }
        );

        const promise2 = User.findAndUpdateUser(
            { _id: followedId },
            {
                $push: {
                    followersIds: {
                        $each: [userId],
                        $position: 0
                    }
                },
                $inc: { followersCount: 1 }
            },
            { followersCount: 1, _id: 0 }
        );

        return Promise.all([promise1, promise2]);
    }

    static async unfollowUser(followedId, userId) {
        const { modifiedCount } = User.updateUser(
            { _id: userId },
            { $pull: { followingIds: followedId } },
        );
        if (!modifiedCount) return null;

        const promise1 = User.findAndUpdateUser(
            { _id: userId },
            { $inc: { followingCount: -1 } },
            { followingCount: 1, _id: 0 }
        )

        const promise2 = User.findAndUpdateUser(
            { _id: followedId },
            { $pull: { followersIds: userId }, $inc: { followersCount: -1 } },
            { followersCount: 1, _id: 0 }
        );

        return Promise.all([promise1, promise2]);
    }

    static async addBookmark(userId, postId) {
        const filter = { _id: userId }, update = {
            $addToSet:
            {
                bookmarksIds: {
                    $each: [postId],
                    $position: 0
                }
            }
        };
        const { modifiedCount } = await User.updateUser(filter, update);
        if (!modifiedCount) return null;
        return Post.addBookmark(userId, postId);
    }

    static async removeBookmark(userId, postId) {
        const filter = { _id: userId }, update = { $pull: { bookmarksIds: postId } };
        const { modifiedCount } = await User.updateUser(filter, update);
        if (!modifiedCount) return null;
        return Post.removeBookmark(userId, postId);
    }

    static async likePost(userId, postId) {
        const filter = { _id: userId }, update = {
            $addToSet: {
                likedPostsIds: {
                    $each: [postId],
                    $position: 0
                }
            }
        };
        const { modifiedCount } = await User.updateUser(filter, update);
        if (!modifiedCount) return null;
        return Post.addLike(userId, postId);
    }

    static async unlikePost(userId, postId) {
        const filter = { _id: userId }, update = { $pull: { likedPostsIds: postId } };
        const { modifiedCount } = await User.updateUser(filter, update);
        if (!modifiedCount) return null;
        return Post.removeLike(userId, postId);
    }

    static async likeComment(userId, commentId) {
        const filter = { _id: userId }, update = { $addToSet: { likedCommentsIds: commentId } };
        const { modifiedCount } = await User.updateUser(filter, update);
        if (!modifiedCount) return null;
        return Comment.addLike(userId, commentId);
    }

    static async unlikeComment(userId, commentId) {
        const filter = { _id: userId }, update = { $pull: { likedCommentsIds: commentId } };
        const { modifiedCount } = await User.updateUser(filter, update);
        if (!modifiedCount) return null;
        return Comment.removeLike(userId, commentId);
    }

    static removePostFromBookmarks(bookmarkingUsersIds, postId) {
        const filter = { _id: { $in: bookmarkingUsersIds } }, update = { $pull: { bookmarksIds: postId } };
        return User.updateUsers(filter, update);
    }

    static removePostFromLikedPosts(likingUsersIds, postId) {
        const filter = { _id: { $in: likingUsersIds } }, update = { $pull: { likedPostsIds: postId } };
        return User.updateUsers(filter, update);
    }

    static removePostsFromBookmarks(bookmarkingUsersIds, postsIds) {
        const filter = { _id: { $in: bookmarkingUsersIds } }, update = { $pull: { bookmarksIds: { $in: postsIds } } };
        return User.updateUsers(filter, update);
    }

    static removePostsFromLikedPosts(likingUsersIds, postsIds) {
        const filter = { _id: { $in: likingUsersIds } }, update = { $pull: { likedPostsIds: { $in: postsIds } } };
        return User.updateUsers(filter, update);
    }

    static removeCommentFromLikedComments(likingUsersIds, commentId) {
        const filter = { _id: { $in: likingUsersIds } }, update = { $pull: { likedCommentsIds: commentId } };
        return User.updateUsers(filter, update);
    }

    static removeCommentsFromLikedComments(likingUsersIds, commentsIds) {
        const filter = { _id: { $in: likingUsersIds } }, update = { $pull: { likedCommentsIds: { $in: commentsIds } } };
        return User.updateUsers(filter, update);
    }

}