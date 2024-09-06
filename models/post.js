const { getDb } = require('../util/database.js');
const { deleteImages } = require('../util/images.js');

module.exports = class Post {
    constructor({ _id, title, content, imagesUrls, creatorId, creationDate, tags, likes, bookmarkingUsersIds, likingUsersIds,
        commentsCount, bookmarksCount }) {
        this._id = _id;
        this.title = title;
        this.content = content;
        this.imagesUrls = imagesUrls;
        this.creatorId = creatorId;
        this.creationDate = creationDate;
        this.tags = tags;
        this.likes = likes;
        this.bookmarkingUsersIds = bookmarkingUsersIds;
        this.likingUsersIds = likingUsersIds;
        this.commentsCount = commentsCount;
        this.bookmarksCount = bookmarksCount
    }

    async createPost() {
        const db = getDb();
        const { insertedId } = await db.collection('posts').insertOne(this);
        this._id = insertedId;
    }

    static async findAndUpdatePost(filter, update, options) {
        const db = getDb();
        const { imagesUrls } = await Post.getPost(filter, { _id: 0, imagesUrls: 1 });
        const updatedPost = await db.collection('posts').findOneAndUpdate(filter, update, options);
        deleteImages(imagesUrls);
        return updatedPost;
    }

    static updatePost(filter, update, options = {}) {
        const db = getDb();
        return db.collection('posts').updateOne(filter, update, options);
    }

    static updatePosts(filter, update, options = {}) {
        const db = getDb();
        return db.collection('posts').updateMany(filter, update, options);
    }

    static async getPostsInfo(filter, userId, prepared = false) {
        const db = getDb();
        const pipeline = [{ $match: filter }];

        if (!prepared) {
            pipeline.push({ $sort: { _id: -1 } }, { $limit: 10 });
        }

        const posts = await db.collection('posts').aggregate([
            ...pipeline,
            {
                $lookup: {
                    from: 'users',
                    localField: 'creatorId',
                    foreignField: '_id',
                    as: 'creator',
                    pipeline: [
                        {
                            $project: {
                                name: 1,
                                imageUrl: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind: '$creator'
            },
            {
                $addFields: {
                    liked: { $in: [userId, '$likingUsersIds'] },
                    bookmarked: { $in: [userId, '$bookmarkingUsersIds'] },
                }
            },
            {
                $project: {
                    content: 0,
                    imagesUrls: 0,
                    bookmarkingUsersIds: 0,
                    likingUsersIds: 0,
                }
            }
        ]).toArray();

        if (!prepared) {
            const lastId = posts.length ? posts[posts.length - 1]['_id'].toString() : null;
            return { posts, lastId };
        }
        return posts;
    }

    static getPosts(filter, projection, options = {}) {
        const db = getDb();
        return db.collection('posts').find(filter, options).project(projection);
    }

    static async getPostInfo(filter, userId) {
        const db = getDb();
        const resultPost = await db.collection('posts').aggregate([
            {
                $match: filter
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'creatorId',
                    foreignField: '_id',
                    as: 'creator',
                    pipeline: [
                        {
                            $project: {
                                name: 1,
                                imageUrl: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind: '$creator'
            },
            {
                $lookup: {
                    from: 'comments',
                    localField: '_id',
                    foreignField: 'postId',
                    as: 'comments',
                    pipeline: [
                        { $sort: { _id: -1 } },
                        { $limit: 10 },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'creatorId',
                                foreignField: '_id',
                                as: 'creator',
                                pipeline: [
                                    { $project: { name: 1, imageUrl: 1 } }
                                ]
                            }
                        },
                        { $unwind: '$creator' }
                    ]
                }
            },
            {
                $project: {
                    lastId: {
                        $ifNull: [{ $arrayElemAt: ['comments._id', -1] }, null]
                    },
                    liked: { $in: [userId, '$likingUsersIds'] },
                    bookmarked: { $in: [userId, '$bookmarkingUsersIds'] },
                    bookmarkingUsersIds: 0,
                    likingUsersIds: 0,
                }
            }
        ]).toArray();

        return resultPost.length ? resultPost[0] : null;
    }

    static getPost(filter, projection) {
        const db = getDb();
        return db.collection('posts').findOne(filter, { projection });
    }

    static async getPostLikers(page, postId) {
        const db = getDb();
        const result = await db.collection('posts').aggregate([
            {
                $match: { _id: postId }
            },
            {
                $project: {
                    likingUsersIds: { $slice: [`$likingUsersIds`, 20 * page, 20] },
                    _id: 0
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'likingUsersIds',
                    foreignField: '_id',
                    as: 'users',
                    pipeline: [
                        { $project: { name: 1, imageUrl: 1 } }
                    ]
                }
            },
            {
                $project: { likingUsersIds: 0 }
            }
        ]).toArray();

        return result[0].users;
    }

    static deletePost(filter, options = {}) {
        const db = getDb();
        return db.collection('posts').deleteOne(filter, options);
    }

    static deletePosts(filter, options = {}) {
        const db = getDb();
        return db.collection('posts').deleteMany(filter, options);
    }

    static addLike(userId, postId, options = {}) {
        const filter = { _id: postId }, update = {
            $inc: { likes: 1 }, $push: {
                likingUsersIds: {
                    $each: [userId],
                    $position: 0
                }
            }
        };
        return Post.findAndUpdatePost(filter, update, options);
    }

    static removeLike(userId, postId, options = {}) {
        const filter = { _id: postId }, update = { $inc: { likes: -1 }, $pull: { likingUsersIds: userId } };
        return Post.findAndUpdatePost(filter, update, options);
    }

    static addBookmark(userId, postId, options = {}) {
        const filter = { _id: postId }, update = { $push: { bookmarkingUsersIds: userId }, $inc: { bookmarksCount: 1 } };
        return Post.findAndUpdatePost(filter, update, options);
    }

    static removeBookmark(userId, postId, options = {}) {
        const filter = { _id: postId }, update = { $pull: { bookmarkingUsersIds: userId }, $inc: { bookmarksCount: -1 } };
        return Post.findAndUpdatePost(filter, update, options);
    }

}