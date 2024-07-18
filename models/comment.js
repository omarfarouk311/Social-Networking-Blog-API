const { getDb } = require('../util/database');

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
        const comments = db.collection('comments').find(filter).limit(10).toArray();
        lastCommentId = comments[comments.length - 1]['_id'];
        return { comments, lastCommentId };
    }

    deleteComment() {
        const db = getDb();
        const promises = [];
        promises.push(db.collection('comments').deleteOne({ _id: this._id }));
        promises.push(db.collection('posts').updateOne({ _id: this.postId }, { $pull: { commentsIds: this._id } }));
        return Promise.all(promises);
    }

    static async deleteComments(commentsIds) {
        const db = getDb();
        const promises = [];
        const postsIds = await db.collection('comments').find({ _id: { $in: commentsIds } }).project({ postId: 1, _id: 0 }).toArray();
        promises.push(db.collection('comments').deleteMany({ _id: { $in: commentsIds } }));
        promises.push(db.collection('posts').updateMany({ _id: { $in: postsIds } }, { $pull: { commentsIds: this._id } }));
        return Promise.all(promises);
    }

    updateComment() {
        const db = getDb();
        return db.collection('comments').updateOne(
            { _id: this._id },
            {
                $set: {
                    content: this.content
                }
            }
        );
    }

    updateLikes(value) {
        const db = getDb();
        return db.collection('comments').updateOne(
            { _id: this._id },
            {
                $inc: {
                    likes: value
                }
            }
        );
    }

}