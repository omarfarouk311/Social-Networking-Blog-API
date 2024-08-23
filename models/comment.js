const { getDb } = require('../util/database');
const User = require('./user');
const Post = require('./post');

module.exports = class Comment {
    constructor({ content, creationDate, creatorId, likes, _id, postId, parentsIds, repliesCount, likingUsersIds, parentId }) {
        this.content = content;
        this.creationDate = creationDate;
        this.creatorId = creatorId;
        this.postId = postId;
        this.likes = likes;
        this._id = _id;
        this.parentsIds = parentsIds;
        this.parentId = parentId
        this.repliesCount = repliesCount;
        this.likingUsersIds = likingUsersIds;
    }

    async createComment(post) {
        const db = getDb();
        const promises = [db.collection('comments').insertOne(this), post.updatePost({ _id: post._id }, { $inc: { commentsCount: 1 } })];
        if (this.parentsIds && this.parentsIds.length) {
            promises.push(Comment.updateComments({ _id: this.parentsIds }, { $inc: { repliesCount: 1 } }));
        }
        const { insertedId } = await Promise.all(promises)[0];
        this._id = insertedId;
    }

    findAndUpdateComment(filter, update, projection) {
        const db = getDb();
        return db.collection('comments').findOneAndUpdate(filter, update, { projection, returnDocument: 'after' });
    }

    updateComment(filter, update) {
        const db = getDb();
        return db.collection('comments').updateOne(filter, update);
    }

    static updateComments(filter, update) {
        const db = getDb();
        return db.collection('comments').updateMany(filter, update);
    }

    static async getCommentsInfo(filter, userId) {
        const db = getDb();
        const comments = await db.collection('comments').aggregate([
            {
                $match: filter
            },
            {
                $sort: { _id: -1 }
            },
            {
                $limit: 10
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
                $addFields: { liked: { $in: [userId, '$likingUsersIds'] } }
            }
        ]).toArray();

        const lastCommentId = comments.length ? comments[comments.length - 1]['_id'].toString() : null;
        return { comments, lastCommentId };
    }

    static getComments(filter, projection) {
        const db = getDb();
        return db.collection('comments').find(filter).project(projection);
    }

    static getComment(filter, projection) {
        const db = getDb();
        return db.collection('comments').findOne(filter, projection);
    }

    async getCommentLikers(page) {
        const db = getDb();
        const result = await db.collection('comments').aggregate([
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

    async deleteComment(filter, post) {
        const db = getDb();
        const commentId = await db.collection('comments').findOneAndDelete(filter, { _id: 1 });

        const promises = [this.removeCommentFromLikedComments(), Comment.deleteComments({ parentsIds: commentId }),
        post.updatePost({ _id: post._id }, { $inc: { commentsCount: -1 } }, { commentsCount: 1, _id: 0 })];
        if (this.parentsIds && this.parentsIds.length) {
            promises.push(Comment.updateComments({ _id: { $in: this.parentsIds } }, { $inc: { repliesCount: -1 } }));
        }

        return Promise.all(promises);
    }

    static async deleteComments(filter) {
        const db = getDb();
        const comments = Comment.getComments(filter, { likingUsersIds: 1, postId: 1, parentsIds: 1 });
        const likingUsersIds = [], commentsIds = [], parentsIds = [];
        const commentsOnPost = new Map();

        comments.forEach(comment => {
            likingUsersIds.push(...comment.likingUsersIds);
            commentsIds.push(comment._id);
            const cnt = commentsOnPost.get(comment.postId);
            commentsOnPost.set(comment.postId, cnt ? cnt + 1 : 1);
            if (comment.parentsIds && comments.parentsIds.length) parentsIds.push(...comment.parentsIds);
        });

        const operations = [];
        commentsOnPost.forEach(([key, value]) => {
            operations.push({ updateOne: { filter: { _id: key }, update: { $inc: { commentsCount: value } } } });
        });

        const promises = [db.collection('comments').deleteMany(filter), Comment.removeCommentsFromLikedComments(likingUsersIds, comments),
        db.collection('posts').bulkWrite(operations), this.updateComments({ _id: { $in: parentsIds } }, { $inc: { repliesCount: -1 } })];

        return Promise.all(promises);
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
        return this.findAndUpdateComment(filter, update, { likes: 1 });
    }

    removeLike(userId) {
        const filter = { _id: this._id }, update = { $inc: { likes: -1 }, $pull: { likingUsersIds: userId } };
        return this.findAndUpdateComment(filter, update, { likes: 1 });
    }

    removeCommentFromLikedComments() {
        const filter = { _id: { $in: this.likingUsersIds } }, update = { $pull: { likedCommentsIds: this._id } };
        return User.updateUsers(filter, update);
    }

    static removeCommentsFromLikedComments(likingUsersIds, commentsIds) {
        const filter = { _id: { $in: likingUsersIds } }, update = { $pull: { likedCommentsIds: { $in: commentsIds } } };
        return User.updateUsers(filter, update);
    }

}