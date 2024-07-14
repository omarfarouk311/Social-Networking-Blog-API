const { getDb } = require('../util/database');

module.exports = class Comment {
    constructor({ content, creationDate, creator, likes, _id }) {
        this.content = content;
        this.creationDate = creationDate;
        this.creator = creator;
        this.likes = likes;
        this._id = _id;
    }

    async create() {
        const db = getDb();
        const { insertedId } = await db.collection('comments').insertOne(this);
        this._id = insertedId;
    }

}