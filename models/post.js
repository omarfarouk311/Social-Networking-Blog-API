const { getDb } = require('../util/database.js');
const { promises: fsPromises } = require('fs');
const Comment = require('./comment.js');

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

    static async getPosts(filter) {
        const db = getDb();
        const posts = await db.collection('posts').find(filter)
            .limit(10)
            .project({ content: 0, imagesUrls: 0, commentsIds: 0 })
            .toArray();

        //join creators
        await Promise.all(posts.map(async post => {
            const { creatorId } = post;
            delete post.creatorId;
            post.creator = await db.collection('users').findOne({
                _id: creatorId
            }).project({ name: 1, imageUrl: 1 });
        }));

        return posts;
    }

    static async getPost(postId) {
        const post = await db.collection('posts').findOne({
            _id: postId
        }).project({ content: 1, imagesUrls: 1, commentsIds: 1 });

        //return early incase of no comments on the post
        if (!post.commentsIds.length) {
            post.comments = [];
            post.lastCommentId = null;
            delete post.commentsIds;
            return post;
        }

        //join comments
        const filter = { _id: { $in: post.commentsIds } };
        post.comments = await Comment.getComments(filter);
        post.lastCommentId = post.commentsIds[post.commentsIds.length - 1];
        delete post.commentsIds;

        //join comments creators
        await Promise.all(post.comments.map(async comment => {
            const { creatorId } = comment;
            delete comment.creatorId;
            comment.creator = await db.collection('users').findOne({
                _id: creatorId
            }).project({ name: 1, imageUrl: 1 });
        }));

        return post;
    }

    static countPosts() {
        return db.collection('posts').countDocuments({});
    }

    async deletePost() {
        const { imagesUrls, commentsIds } = this;
        const promises = [db.collection('posts').deleteOne({ _id: this._id }), Comment.deleteComments(commentsIds)];
        await Promise.all([promises]);
        imagesUrls.forEach(imageUrl => fsPromises.unlink(imageUrl).catch(err => console.error(err)));
    }

    static async deletePosts(postsIds) {
        const posts = db.collection('posts').find({ _id: { $in: postsIds } });
        const imagesUrls = [], commentsIds = [];
        posts.forEach(post => {
            imagesUrls.push(...post.imagesUrls);
            commentsIds.push(...post.commentsIds);
        });

        const promises = [db.collection('posts').deleteMany({ _id: { $in: postsIds } }), Comment.deleteComments(commentsIds)];
        await Promise.all([promises]);
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
        });
    }
}