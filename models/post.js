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

    static async findAndUpdatePost(filter, update, projection) {
        const db = getDb();
        let imagesUrls;
        if (update.$set && update.$set.imagesUrls) {
            imagesUrls = await Post.getPost(filter, { _id: 0, imagesUrls: 1 }).imagesUrls;
        }
        const updatedPost = await db.collection('posts').findOneAndUpdate(filter, update, { projection, returnDocument: 'after' });
        if (imagesUrls) deleteImages(imagesUrls);
        return updatedPost;
    }

    static updatePost(filter, update) {
        const db = getDb();
        return db.collection('posts').updateOne(filter, update);
    }

    static updatePosts(filter, update) {
        const db = getDb();
        return db.collection('posts').updateMany(filter, update);
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
            const lastPostId = posts.length ? posts[posts.length - 1]['_id'].toString() : null;
            return lastPostId ? { posts, lastPostId } : { posts };
        }
        return posts;
    }

    static getPosts(filter, projection) {
        const db = getDb();
        return db.collection('posts').find(filter).project(projection);
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
                    lastCommentId: { $arrayElemAt: ['comments._id', -1] },
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

    static deletePost(filter) {
        const db = getDb();
        return db.collection('posts').deleteOne(filter);
    }

    static deletePosts(filter) {
        const db = getDb();
        return db.collection('posts').deleteMany(filter);
    }

    static addLike(userId, postId) {
        const filter = { _id: postId }, update = {
            $inc: { likes: 1 }, $push: {
                likingUsersIds: {
                    $each: [userId],
                    $position: 0
                }
            }
        };
        return Post.findAndUpdatePost(filter, update, { likes: 1, _id: 0 });
    }

    static removeLike(userId, postId) {
        const filter = { _id: postId }, update = { $inc: { likes: -1 }, $pull: { likingUsersIds: userId } };
        return Post.findAndUpdatePost(filter, update, { likes: 1, _id: 0 });
    }

    static addBookmark(userId, postId) {
        const filter = { _id: postId }, update = { $push: { bookmarkingUsersIds: userId }, $inc: { bookmarksCount: 1 } };
        return Post.findAndUpdatePost(filter, update, { bookmarksCount: 1, _id: 0 });
    }

    static removeBookmark(userId, postId) {
        const filter = { _id: postId }, update = { $pull: { bookmarkingUsersIds: userId }, $inc: { bookmarksCount: -1 } };
        return Post.findAndUpdatePost(filter, update, { bookmarksCount: 1, _id: 0 });
    }

}