const { getDb, getClient } = require('../util/database.js');
const { deleteImages } = require('../util/images.js');
const Post = require('./post.js');
const Comment = require('./comment.js');

module.exports = class User {
    constructor({ _id, email, password, name, imageUrl, followingIds, followersIds, bookmarksIds, likedPostsIds, bio, location,
        creationDate, followingCount, followersCount, likedCommentsIds, resetToken, resetTokenExpiry }) {
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
        this.resetToken = resetToken;
        this.resetTokenExpiry = resetTokenExpiry;
    }

    async createUser() {
        const db = getDb();
        const { insertedId } = await db.collection('users').insertOne(this);
        this._id = insertedId;
    }

    static async findAndUpdateUser(filter, update, options = {}, imageUrl = null) {
        const db = getDb();
        const updatedUser = await db.collection('users').findOneAndUpdate(filter, update, options);
        if (imageUrl) deleteImages([imageUrl]);
        return updatedUser;
    }

    static updateUser(filter, update, options = {}) {
        const db = getDb();
        return db.collection('users').updateOne(filter, update, options);
    }

    static updateUsers(filter, update, options = {}) {
        const db = getDb();
        return db.collection('users').updateMany(filter, update, options);
    }

    static deleteUser(filter, options = {}) {
        const db = getDb();
        return db.collection('users').deleteOne(filter, options);
    }

    static async getUserInfo(filter, viewerId) {
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
                    let: { creatorId: '$_id', creatorName: '$name', creatorImageUrl: '$imageUrl' },
                    pipeline: [
                        { $sort: { _id: -1 } },
                        { $limit: 10 },
                        {
                            $addFields: {
                                creator: {
                                    _id: '$$creatorId',
                                    name: '$$creatorName',
                                    imageUrl: '$$creatorImageUrl'
                                },
                                liked: { $in: [viewerId, '$likingUsersIds'] }
                            }
                        },
                        {
                            $project: {
                                content: 0,
                                imagesUrls: 0,
                                likingUsersIds: 0,
                                bookmarkingUsersIds: 0
                            }
                        },
                    ]
                }
            },
            {
                $addFields: {
                    lastPostId: {
                        $ifNull: [{ $arrayElemAt: ['$posts._id', -1] }, null]
                    }
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
                    resetToken: 0,
                    resetTokenExpiry: 0
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
                    [field]: { $slice: [`$${field}`, 20 * (page - 1), 20] },
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
                $addFields: {
                    totalLikes: { $size: '$likedPostsIds' }
                }
            },
            {
                $project: {
                    likedPostsIds: { $slice: ['$likedPostsIds', 10 * (page - 1), 10] },
                    _id: 0,
                    totalLikes: 1
                }
            },
        ]).toArray();

        return result[0];
    }

    static async getUserBookmarks(page, userId) {
        const db = getDb();
        const result = await db.collection('users').aggregate([
            {
                $match: { _id: userId }
            },
            {
                $addFields: {
                    totalBookmarks: { $size: '$bookmarksIds' }
                }
            },
            {
                $project: {
                    bookmarksIds: { $slice: ['$bookmarksIds', 10 * (page - 1), 10] },
                    _id: 0,
                    totalBookmarks: 1
                }
            },
        ]).toArray();

        return result[0];
    }

    static followUser(followedId, userId) {
        const client = getClient();

        return client.withSession(async session => {
            return session.withTransaction(async session => {
                const { followingIds } = await User.getUser({ _id: userId }, { followingIds: 1, _id: 0 });
                const found = followingIds.some(id => id.equals(followedId));
                if (found) {
                    await session.abortTransaction();
                    return null;
                }

                await User.updateUser(
                    { _id: userId },
                    {
                        $push: {
                            followingIds: {
                                $each: [followedId],
                                $position: 0
                            }
                        }
                    },
                    { session }
                );

                const { followingCount } = await User.findAndUpdateUser(
                    { _id: userId },
                    {
                        $inc: { followingCount: 1 }
                    },
                    { projection: { followingCount: 1, _id: 0 }, returnDocument: 'after', session }
                );

                const { followersCount } = await User.findAndUpdateUser(
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
                    { projection: { followersCount: 1, _id: 0 }, returnDocument: 'after', session }
                );

                return {
                    userFollowingCount: followingCount,
                    followedUserFollowersCount: followersCount
                };
            }, {
                readConcern: { level: 'majority' },
                writeConcern: { w: 'majority', journal: true },
                readPreference: 'primary'
            });
        });
    }

    static unfollowUser(followedId, userId) {
        const client = getClient();

        return client.withSession(async session => {
            return session.withTransaction(async session => {
                const { modifiedCount } = await User.updateUser(
                    { _id: userId },
                    { $pull: { followingIds: followedId } },
                    { session }
                );

                if (!modifiedCount) {
                    await session.abortTransaction();
                    return null;
                }

                const { followingCount } = await User.findAndUpdateUser(
                    { _id: userId },
                    {
                        $inc: { followingCount: -1 }
                    },
                    { projection: { followingCount: 1, _id: 0 }, returnDocument: 'after', session }
                );

                const { followersCount } = await User.findAndUpdateUser(
                    { _id: followedId },
                    {
                        $pull: { followersIds: userId },
                        $inc: { followersCount: -1 }
                    },
                    { projection: { followersCount: 1, _id: 0 }, returnDocument: 'after', session }
                );

                return {
                    userFollowingCount: followingCount,
                    followedUserFollowersCount: followersCount
                };
            }, {
                readConcern: { level: 'majority' },
                writeConcern: { w: 'majority', journal: true },
                readPreference: 'primary'
            });
        });
    }

    static addBookmark(userId, postId) {
        const client = getClient();

        return client.withSession(async session => {
            return session.withTransaction(async session => {
                const { bookmarksIds } = await User.getUser({ _id: userId }, { bookmarksIds: 1, _id: 0 });
                const found = bookmarksIds.some(id => id.equals(postId));
                if (found) {
                    await session.abortTransaction();
                    return null;
                }

                const filter = { _id: userId }, update = {
                    $push:
                    {
                        bookmarksIds: {
                            $each: [postId],
                            $position: 0
                        }
                    }
                };
                await User.updateUser(filter, update, { session });

                const { bookmarksCount } = await Post.addBookmark(userId, postId,
                    {
                        projection: { bookmarksCount: 1, _id: 0 },
                        returnDocument: 'after',
                        session
                    });
                return bookmarksCount;
            }, {
                readConcern: { level: 'majority' },
                writeConcern: { w: 'majority', journal: true },
                readPreference: 'primary'
            });
        });
    }

    static removeBookmark(userId, postId) {
        const client = getClient();

        return client.withSession(async session => {
            return session.withTransaction(async session => {
                const filter = { _id: userId }, update = { $pull: { bookmarksIds: postId } };
                const { modifiedCount } = await User.updateUser(filter, update, { session });

                if (!modifiedCount) {
                    await session.abortTransaction();
                    return null;
                }

                const { bookmarksCount } = await Post.removeBookmark(userId, postId,
                    {
                        projection: { bookmarksCount: 1, _id: 0 },
                        returnDocument: 'after',
                        session
                    });
                return bookmarksCount;
            }, {
                readConcern: { level: 'majority' },
                writeConcern: { w: 'majority', journal: true },
                readPreference: 'primary'
            });
        });
    }

    static likePost(userId, postId) {
        const client = getClient();

        return client.withSession(async session => {
            return session.withTransaction(async session => {
                const { likedPostsIds } = await User.getUser({ _id: userId }, { likedPostsIds: 1, _id: 0 });
                const found = likedPostsIds.some(id => id.equals(postId));
                if (found) {
                    await session.abortTransaction();
                    return null;
                }

                const filter = { _id: userId }, update = {
                    $push: {
                        likedPostsIds: {
                            $each: [postId],
                            $position: 0
                        }
                    }
                };
                await User.updateUser(filter, update, { session });

                const { likes } = await Post.addLike(userId, postId,
                    {
                        projection: { likes: 1, _id: 0 },
                        returnDocument: 'after',
                        session
                    });
                return likes;
            }, {
                readConcern: { level: 'majority' },
                writeConcern: { w: 'majority', journal: true },
                readPreference: 'primary'
            });
        });
    }

    static unlikePost(userId, postId) {
        const client = getClient();

        return client.withSession(async session => {
            return session.withTransaction(async session => {
                const filter = { _id: userId }, update = { $pull: { likedPostsIds: postId } };
                const { modifiedCount } = await User.updateUser(filter, update, { session });

                if (!modifiedCount) {
                    await session.abortTransaction();
                    return null;
                }

                const { likes } = await Post.removeLike(userId, postId,
                    {
                        projection: { likes: 1, _id: 0 },
                        returnDocument: 'after',
                        session
                    });
                return likes;
            }, {
                readConcern: { level: 'majority' },
                writeConcern: { w: 'majority', journal: true },
                readPreference: 'primary'
            });
        });
    }

    static likeComment(userId, commentId) {
        const client = getClient();

        return client.withSession(async session => {
            return session.withTransaction(async session => {
                const filter = { _id: userId }, update = { $addToSet: { likedCommentsIds: commentId } };
                const { modifiedCount } = await User.updateUser(filter, update, { session });

                if (!modifiedCount) {
                    await session.abortTransaction();
                    return null;
                }

                const { likes } = await Comment.addLike(userId, commentId, {
                    projection: { likes: 1, _id: 0 },
                    returnDocument: 'after',
                    session
                });
                return likes;
            }, {
                readConcern: { level: 'majority' },
                writeConcern: { w: 'majority', journal: true },
                readPreference: 'primary'
            });
        });
    }

    static unlikeComment(userId, commentId) {
        const client = getClient();

        return client.withSession(async session => {
            return session.withTransaction(async session => {
                const filter = { _id: userId }, update = { $pull: { likedCommentsIds: commentId } };
                const { modifiedCount } = await User.updateUser(filter, update, { session });

                if (!modifiedCount) {
                    await session.abortTransaction();
                    return null;
                }

                const { likes } = await Comment.removeLike(userId, commentId, {
                    projection: { likes: 1, _id: 0 },
                    returnDocument: 'after',
                    session
                });
                return likes;
            }, {
                readConcern: { level: 'majority' },
                writeConcern: { w: 'majority', journal: true },
                readPreference: 'primary'
            });
        });
    }

    static removePostFromBookmarks(bookmarkingUsersIds, postId, options = {}) {
        const filter = { _id: { $in: bookmarkingUsersIds } }, update = { $pull: { bookmarksIds: postId } };
        return User.updateUsers(filter, update, options);
    }

    static removePostFromLikedPosts(likingUsersIds, postId, options = {}) {
        const filter = { _id: { $in: likingUsersIds } }, update = { $pull: { likedPostsIds: postId } };
        return User.updateUsers(filter, update, options);
    }

    static removePostsFromBookmarks(bookmarkingUsersIds, postsIds, options = {}) {
        const filter = { _id: { $in: bookmarkingUsersIds } }, update = { $pull: { bookmarksIds: { $in: postsIds } } };
        return User.updateUsers(filter, update, options);
    }

    static removePostsFromLikedPosts(likingUsersIds, postsIds, options = {}) {
        const filter = { _id: { $in: likingUsersIds } }, update = { $pull: { likedPostsIds: { $in: postsIds } } };
        return User.updateUsers(filter, update), options;
    }

    static removeCommentFromLikedComments(likingUsersIds, commentId, options = {}) {
        const filter = { _id: { $in: likingUsersIds } }, update = { $pull: { likedCommentsIds: commentId } };
        return User.updateUsers(filter, update, options);
    }

    static removeCommentsFromLikedComments(likingUsersIds, commentsIds, options = {}) {
        const filter = { _id: { $in: likingUsersIds } }, update = { $pull: { likedCommentsIds: { $in: commentsIds } } };
        return User.updateUsers(filter, update, options);
    }

}