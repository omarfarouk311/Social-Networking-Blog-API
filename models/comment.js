const { getDb } = require('../util/database');
const User = require('./user');
const Post = require('./post');

module.exports = class Comment {
    constructor({ content, creationDate, creatorId, likes, _id, postId, parentId, repliesCount, likingUsersIds }) {
        this.content = content;
        this.creationDate = creationDate;
        this.creatorId = creatorId;
        this.postId = postId;
        this.likes = likes;
        this._id = _id;
        this.parentId = parentId;
        this.repliesCount = repliesCount;
        this.likingUsersIds = likingUsersIds;
    }

    async createComment(post) {
        const db = getDb();
        const promises = [];

        promises.push(db.collection('comments').insertOne(this));
        promises.push(post.updatePost({ _id: post._id }, { $inc: { commentsCount: 1 } }));
        if (this.parentId) {
            promises.push(this.updateComment({ _id: this.parentId }, { $inc: { repliesCount: 1 } }));
        }

        const { insertedId } = await Promise.all([promises])[0];
        this._id = insertedId;
    }

    updateComment(filter, update) {
        const db = getDb();
        return db.collection('comments').findOneAndUpdate(filter, update, { returnDocument: 'after' });
    }

    static updateComments(filter, update) {
        const db = getDb();
        return db.collection('comments').updateMany(filter, update);
    }

    static async getComments(filter, aggregate) {
        const db = getDb();

        if (!aggregate) {
            return db.collection('comments').find(filter);
        }

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
            }
        ]).toArray();

        const lastCommentId = comments.length ? comments[comments.length - 1]['_id'].toString() : null;
        return { comments, lastCommentId };
    }

    static getComment(filter) {
        const db = getDb();
        return db.collection('comments').findOne(filter);
    }

    deleteComment(filter, post) {
        const db = getDb();
        const promises = [db.collection('comments').deleteOne(filter), this.removeCommentFromLikedComments(),
        post.updatePost({ _id: post._id }, { $inc: { commentsCount: -1 } })];
        if (this.parentId) {
            promises.push(this.updateComment({ _id: this.parentId }, { $inc: { repliesCount: -1 } }));
        }

        return Promise.all(promises);
    }

    static async deleteComments(filter) {
        const db = getDb();
        const comments = Comment.getComments(filter).project({ likingUsersIds: 1, postId: 1, parentId: 1 });
        const likingUsersIds = [], commentsIds = [], postsIds = [], parentsIds = [];

        comments.forEach(comment => {
            likingUsersIds.push(...comment.likingUsersIds);
            commentsIds.push(comment._id);
            postsIds.push(comment.postId);
            if (comment.parentId) parentsIds.push(comment.parentId);
        });

        const promises = [db.collection('comments').deleteMany(filter), Comment.removeCommentsFromLikedComments(likingUsersIds, comments),
        Post.updatePosts({ _id: { $in: postsIds } }, { $inc: { commentsCount: -1 } }),
        this.updateComments({ _id: { $in: parentsIds } }, { $inc: { repliesCount: -1 } })];

        return Promise.all([promises]);
    }

    addLike(userId) {
        const filter = { _id: this._id }, update = { $inc: { likes: 1 }, $push: { likingUsersIds: userId } };
        return this.updateComment(filter, update);
    }

    removeLike(userId) {
        const filter = { _id: this._id }, update = { $inc: { likes: -1 }, $pull: { likingUsersIds: userId } };
        return this.updateComment(filter, update);
    }

    removeCommentFromLikedComments() {
        const filter = { _id: { $in: likingUsersIds } }, update = { $pull: { likedCommentsIds: this._id } };
        return User.updateUsers(filter, update);
    }

    static removeCommentsFromLikedComments(likingUsersIds, commentsIds) {
        const filter = { _id: { $in: likingUsersIds } }, update = { $pull: { likedCommentsIds: { $in: commentsIds } } };
        return User.updateUsers(filter, update);
    }

}