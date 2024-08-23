const { getDb } = require('../util/database.js');
const Comment = require('./comment.js');
const User = require('./user.js');
const { deleteImages, updateImages } = require('../util/images.js');

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

    async findAndUpdatePost(filter, update, projection) {
        const db = getDb();
        const updatedPost = await db.collection('posts').findOneAndUpdate(filter, update, { projection, returnDocument: 'after' });
        if (update.imagesUrls) {
            updateImages(this.imagesUrls, updatedPost.imagesUrls);
        }
        return updatedPost;
    }

    updatePost(filter, update) {
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
                $project: {
                    content: 0,
                    imagesUrls: 0,
                    liked: { $in: [userId, '$likingUsersIds'] },
                    bookmarked: { $in: [userId, '$bookmarkingUsersIds'] },
                    bookmarkingUsersIds: 0,
                    likingUsersIds: 0,
                }
            }
        ]).toArray();

        if (!prepared) {
            const lastPostId = posts.length ? posts[posts.length - 1]['_id'].toString() : null;
            return { posts, lastPostId };
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
        return db.collection('posts').findOne(filter, projection);
    }

    async getPostLikers(page) {
        const db = getDb();
        const result = await db.collection('posts').aggregate([
            {
                $match: { _id: this._id }
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

    async deletePost(filter) {
        const db = getDb();
        const { imagesUrls } = this, commentsFilter = { postId: this._id };

        const promises = [db.collection('posts').deleteOne(filter), Comment.deleteComments(commentsFilter),
        this.removePostFromBookmarks(), this.removePostFromLikedPosts()];
        await Promise.all(promises);
        deleteImages(imagesUrls);
    }

    static async deletePosts(filter) {
        const db = getDb();
        const posts = await Post.getPosts(filter, { imagesUrls: 1, likingUsersIds: 1, bookmarkingUsersIds: 1 });
        const likingUsersIds = [], bookmarkingUsersIds = [], imagesUrls = [], postsIds = [];

        posts.forEach(post => {
            likingUsersIds.push(...post.likingUsersIds);
            bookmarkingUsersIds.push(...post.bookmarkingUsersIds);
            imagesUrls.push(...post.imagesUrls);
            postsIds.push(post._id);
        });

        const promises = [db.collection('posts').deleteMany(filter), Comment.deleteComments({ postId: { $in: postsIds } }),
        Post.removePostsFromBookmarks(bookmarkingUsersIds, postsIds), Post.removePostsFromLikedPosts(likingUsersIds, postsIds)];
        await Promise.all(promises);
        deleteImages(imagesUrls);
    }

    addLike(userId) {
        const filter = { _id: this._id }, update = {
            $inc: { likes: 1 }, $push: {
                likingUsersIds: {
                    $each: [userId],
                    $position: 0
                }
            }
        };
        return this.findAndUpdatePost(filter, update, { likes: 1, _id: 0 });
    }

    removeLike(userId) {
        const filter = { _id: this._id }, update = { $inc: { likes: -1 }, $pull: { likingUsersIds: userId } };
        return this.findAndUpdatePost(filter, update, { likes: 1, _id: 0 });
    }

    addBookmark(userId) {
        const filter = { _id: this._id }, update = { $push: { bookmarkingUsersIds: userId }, $inc: { bookmarksCount: 1 } };
        return this.findAndUpdatePost(filter, update, { bookmarksCount: 1, _id: 0 });
    }

    removeBookmark(userId) {
        const filter = { _id: this._id }, update = { $pull: { bookmarkingUsersIds: userId }, $inc: { bookmarksCount: -1 } };
        return this.findAndUpdatePost(filter, update, { bookmarksCount: 1, _id: 0 });
    }

    removePostFromBookmarks() {
        const filter = { _id: { $in: this.bookmarkingUsersIds } }, update = { $pull: { bookmarksIds: this._id } };
        return User.updateUsers(filter, update);
    }

    removePostFromLikedPosts() {
        const filter = { _id: { $in: this.likingUsersIds } }, update = { $pull: { likedPostsIds: this._id } };
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

}