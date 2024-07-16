const { getDb } = require('../util/database.js');
const { promises: fsPromises } = require('fs');

module.exports = class Post {
    constructor({ _id, title, content, imagesUrls, creatorId, creationDate, tags, commentsIds, likes }) {
        this._id = _id;
        this.title = title;
        this.content = content;
        this.imagesUrls = imagesUrls;
        this.creatorId = creatorId;
        this.creationDate = creationDate;
        this.tags = tags;
        this.commentsIds = commentsIds;
        this.likes = likes;
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
            .project({ content: 0, imagesUrls: 0, commentsIds: 0 })
            .toArray();

        //join creators
        await Promise.all(results.map(async result => {
            const { creatorId } = result;
            result.creator = await db.collection('users').findOne({
                _id: creatorId
            }).project({ name: 1, imageUrl: 1 });
        }));

        return results;
    }

    static async getPost(postId) {
        const result = await db.collection('posts').findOne({
            _id: postId
        }).project({ commentsIds: { $slice: [0, 5] } });

        //join creator
        result.creator = await db.collection('users').findOne({
            _id: result.creatorId
        }).project({ name: 1, imageUrl: 1 });

        //join comments
        result.comments = await db.collection('comments').find({ _id: { $in: result.commentsIds } }).toArray();
        result.lastCommentId = result.commentsIds[result.commentsIds.length - 1];
        delete result.commentsIds;

        //join comments creators
        await Promise.all(result.comments.map(async comment => {
            const { creatorId } = comment;
            comment.creator = await db.collection('users').findOne({
                _id: creatorId
            }).project({ name: 1, imageUrl: 1 });
        }));

        return result;
    }

    static countPosts() {
        return db.collection('posts').countDocuments({});
    }

    async delete() {
        const { imagesUrls } = this;
        await db.collection('posts').deleteOne({ _id: this._id });
        imagesUrls.forEach(imageUrl => fsPromises.unlink(imageUrl).catch(err => console.error(err)));
    }

    async update() {
        const updates = {};
        if (this.title) updates.title = this.title;
        if (this.content) updates.content = this.content;
        if (this.imagesUrls) updates.imagesUrls = this.imagesUrls;
        if (this.tags) updates.tags = this.tags;

        const result = await db.collection('posts').findOneAndUpdate(
            { _id: this._id },
            { $set: { updates } }
        );

        result.imagesUrls.forEach(imageUrl => {
            if (!this.imagesUrls.some(newImageUrl => newImageUrl === imageUrl)) {
                fsPromises.unlink(imageUrl).catch(err => console.error(err));
            }
        })
    }
}