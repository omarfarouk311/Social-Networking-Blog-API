const { getDb } = require('../util/database');
const User = require('./user');

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

    static getComments(filter) {
        const db = getDb();
        return db.collection('comments').find(filter);
    }

    static getComment(filter) {
        const db = getDb();
        return db.collection('comments').findOne(filter);
    }

    deleteComment(filter, post) {
        const db = getDb();
        const promises = [];

        promises.push(db.collection('comments').deleteOne(filter));
        promises.push(this.removeCommentFromLikedComments());
        promises.push(post.updatePost({ _id: post._id }, { $inc: { commentsCount: -1 } }));
        if (this.parentId) {
            promises.push(this.updateComment({ _id: this.parentId }, { $inc: { repliesCount: -1 } }));
        }

        return Promise.all(promises);
    }

    static async deleteComments(filter) {
        const db = getDb();
        const comments = Comment.getComments(filter).project({ likingUsersIds: 1 });
        const likingUsersIds = [], commentsIds = [];

        comments.forEach(comment => {
            likingUsersIds.push(...comment.likingUsersIds);
            commentsIds.push(comment._id)
        });

        return Promise.all([db.collection('comments').deleteMany(filter),
        Comment.removeCommentsFromLikedComments(likingUsersIds, comments)]);
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

    static async joinComments(post) {
        post.comments = await Comment.getComments({ postId: post._id }).sort({ _id: -1 }).limit(10).toArray();
        post.lastCommentId = post.comments[post.comments.length - 1]['_id'].toString();
    }

}