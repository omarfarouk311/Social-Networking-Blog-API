const { ObjectId } = require('mongodb');
const { getDb } = require('../util/database.js');

module.exports = class Post {
    constructor({ _id, title, content, imageUrl, creator, createdAt }) {
        this._id = _id;
        this.title = title;
        this.content = content;
        this.imageUrl = imageUrl;
        this.creator = creator;
        this.createdAt = createdAt;
    }

    async create() {
        const db = getDb();
        const { insertedId } = await db.collection('posts').insertOne(this);
        this._id = insertedId;
    }

    static fetchPosts(page, itemsPerPage) {
        const db = getDb();
        return db.collection('posts').find()
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage)
            .toArray();
    }

    static fetchPost(postId) {
        return db.collection('posts').findOne({ _id: ObjectId.createFromHexString(postId) });
    }

    static countPosts() {
        return db.collection('posts').find().countDocuments();
    }
}