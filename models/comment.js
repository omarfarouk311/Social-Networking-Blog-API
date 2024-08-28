const { getDb } = require('../util/database');
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

    async createComment(postId) {
        const db = getDb();
        const promises = [db.collection('comments').insertOne(this),
        Post.updatePost({ _id: postId }, { $inc: { commentsCount: 1 } })];

        if (this.parentsIds.length) {
            promises.push(Comment.updateComments({ _id: this.parentsIds }, { $inc: { repliesCount: 1 } }));
        }
        const { insertedId } = await Promise.all(promises)[0];
        this._id = insertedId;
    }

    static findAndUpdateComment(filter, update, projection) {
        const db = getDb();
        return db.collection('comments').findOneAndUpdate(filter, update, { projection, returnDocument: 'after' });
    }

    static updateComment(filter, update) {
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
        return db.collection('comments').findOne(filter, { projection });
    }

    static async getCommentLikers(page, commentId) {
        const db = getDb();
        const result = await db.collection('comments').aggregate([
            {
                $match: { _id: commentId }
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

    static deleteComment(filter) {
        const db = getDb();
        return db.collection('comments').deleteOne(filter);
    }

    static deleteComments(filter) {
        const db = getDb();
        return db.collection('comments').deleteMany(filter);
    }

    static addLike(userId, commentId) {
        const filter = { _id: commentId }, update = {
            $inc: { likes: 1 },
            $push: {
                likingUsersIds: {
                    $each: [userId],
                    $position: 0
                }
            }
        };
        return Comment.findAndUpdateComment(filter, update, { likes: 1 });
    }

    static removeLike(userId, commentId) {
        const filter = { _id: commentId }, update = { $inc: { likes: -1 }, $pull: { likingUsersIds: userId } };
        return Comment.findAndUpdateComment(filter, update, { likes: 1 });
    }

}