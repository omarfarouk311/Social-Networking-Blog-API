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

    static getComments(filter) {
        const db = getDb();
        const comments = db.collection('comments').find(filter).limit(10).toArray();
        lastCommentId = comments[comments.length - 1]['_id'];
        return { comments, lastCommentId };
    }

    delete() {
        return db.collection('comments').deleteOne({ _id: this._id });
    }

    update() {
        //request to update comment content
        if (this.content) {
            return db.collection('comments').updateOne(
                { _id: this._id },
                {
                    $set: {
                        content: this.content
                    }
                }
            );
        }
        //request to increment likes
        if (this.likes) {
            return db.collection('comments').updateOne(
                { _id: this._id },
                {
                    $inc: {
                        likes: 1
                    }
                }
            );
        }
        //bad request
        const err = new Error('Bad request');
        err.statusCode = 400;
        throw err;
    }

}