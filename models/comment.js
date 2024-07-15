const { getDb } = require('../util/database');

module.exports = class Comment {
    constructor({ content, creationDate, creatorId, likes, _id }) {
        this.content = content;
        this.creationDate = creationDate;
        this.creatorId = creatorId;
        this.likes = likes;
        this._id = _id;
    }

    async create() {
        const db = getDb();
        const { insertedId } = await db.collection('comments').insertOne(this);
        this._id = insertedId;
    }

    static getComments(commentsIds) {
        const db = getDb();
        const comments = db.collection('comments').find({ _id: { $in: commentsIds } }).limit(5).toArray();
        commentsIds.splice(0, 5);
        return { comments, commentsIds };
    }

    delete() {
        return db.collection('comments').deleteOne({ _id: this._id });
    }

    
}