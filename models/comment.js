const { getDb } = require('../util/database');
const Post = require('./post');

module.exports = class Comment {
    constructor({ content, creationDate, creatorId, likes, _id, postId }) {
        this.content = content;
        this.creationDate = creationDate;
        this.creatorId = creatorId;
        this.postId = postId;
        this.likes = likes;
        this._id = _id;
    }

    async createComment() {
        const db = getDb();
        const { insertedId } = await db.collection('comments').insertOne(this);
        this._id = insertedId;
    }

    static getComments(filter) {
        const db = getDb();
        return db.collection('comments').find(filter);
    }

    deleteComment(filter) {
        const db = getDb();
        return db.collection('comments').deleteOne(filter);
    }

    static async deleteComments(commentsIds) {
        const db = getDb();
        const promises = [];
        const postsIds = await Comment.getComments({ _id: { $in: commentsIds } })
            .project({ postId: 1, _id: 0 })
            .toArray();
        promises.push(db.collection('comments').deleteMany({ _id: { $in: commentsIds } }));
        promises.push(Post.updatePosts({ _id: { $in: postsIds } }, { $pull: { commentsIds: { $in: commentsIds } } }));
        return Promise.all(promises);
    }

    updateComment(filter, update) {
        const db = getDb();
        return db.collection('comments').updateOne(filter, update);
    }

    updateLikes(value) {
        const filter = { _id: this._id }, update = { $inc: { likes: value } };
        return this.updateComment(filter, update);
    }

}