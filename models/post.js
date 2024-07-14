const { ObjectId } = require('mongodb');
const { getDb } = require('../util/database.js');
const { promises: fsPromises } = require('fs');

module.exports = class Post {
    constructor({ _id, title, content, imageUrl, creator, creationDate, tags, comments }) {
        this._id = _id;
        this.title = title;
        this.content = content;
        this.imageUrl = imageUrl;
        this.creator = creator;
        this.creationDate = creationDate;
        this.tags = tags;
        this.comments = comments;
    }

    async create() {
        const db = getDb();
        const { insertedId } = await db.collection('posts').insertOne(this);
        this._id = insertedId;
    }

    static async getPosts(page, itemsPerPage) {
        const db = getDb();
        const results = await db.collection('posts').find()
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage)
            .project({ content: 0, imageUrl: 0, comments: 0 })
            .toArray();

        const promises = results.map(result => {
            result.creator = db.collection('users').findOne({ _id: result.creator }).project({ name: 1, imageUrl: 1 });
            return result.creator;
        });
        await Promise.all(promises);
        return results;
    }

    static getPost(postId) {
        return db.collection('posts').findOne({ _id: ObjectId.createFromHexString(postId) });
    }

    static countPosts() {
        return db.collection('posts').countDocuments({});
    }

    async delete() {
        const { imageUrl } = this;
        await db.collection('posts').deleteOne({ _id: this._id });
        fsPromises.unlink(imageUrl).catch(err => console.error(err));
    }
}