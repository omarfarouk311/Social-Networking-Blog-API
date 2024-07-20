const { getDb } = require('../util/database.js');
const Comment = require('./comment.js');
const User = require('./user.js');
const { deleteImages, updateImages } = require('../util/images.js');

module.exports = class Post {
    constructor({ _id, title, content, imagesUrls, creatorId, creationDate, tags, commentsIds, likes, bookmarkingUsersIds,
        likingUsersIds }) {
        this._id = _id;
        this.title = title;
        this.content = content;
        this.imagesUrls = imagesUrls;
        this.creatorId = creatorId;
        this.creationDate = creationDate;
        this.tags = tags;
        this.commentsIds = commentsIds;
        this.likes = likes;
        this.bookmarkingUsersIds = bookmarkingUsersIds;
        this.likingUsersIds = likingUsersIds;
    }

    async createPost(user) {
        const db = getDb();
        const { insertedId } = await db.collection('posts').insertOne(this);
        this._id = insertedId;
        return user.createPost(insertedId);
    }

    async updatePost(filter, update) {
        const db = getDb();
        const post = await db.collection('posts').findOneAndUpdate(filter, update);
        updateImages(post.imagesUrls, this.imagesUrls);
        return post;
    }

    static updatePosts(filter, update) {
        const db = getDb();
        return db.collection('posts').updateMany(filter, update);
    }

    static async getPosts(filter) {
        const db = getDb();
        return db.collection('posts').find(filter);
    }

    static joinCreators(posts) {
        return Promise.all(posts.map(async post => {
            const { creatorId } = post;
            delete post.creatorId;
            post.creator = await User.getUser(creatorId).project({ name: 1, imageUrl: 1 });
        }));
    }

    static getPost(filter) {
        const db = getDb();
        return db.collection('posts').findOne(filter);
    }

    async joinComments() {
        const filter = { _id: { $in: this.commentsIds } };
        this.comments = await Comment.getComments(filter).limit(10).toArray();
        this.lastCommentId = this.commentsIds[this.commentsIds.length - 1];
        delete this.commentsIds;
    }

    async joinCommentsCreators() {
        return Promise.all(this.comments.map(async comment => {
            const { creatorId } = comment;
            delete comment.creatorId;
            comment.creator = await db.collection('users').findOne({
                _id: creatorId
            }).project({ name: 1, imageUrl: 1 });
        }));
    }

    static countPosts() {
        const db = getDb();
        return db.collection('posts').countDocuments({});
    }

    async deletePost() {
        const db = getDb();
        const { imagesUrls, commentsIds } = this;
        const promises = [db.collection('posts').deleteOne({ _id: this._id }), Comment.deleteComments(commentsIds),
        this.removePostFromBookmarks(), this.removePostFromLikedPosts()];
        await Promise.all(promises);
        deleteImages(imagesUrls);
    }

    static async deletePosts(postsIds) {
        const db = getDb();
        const posts = await this.getPosts({ _id: { $in: postsIds } })
            .project({ imagesUrls: 1, commentsIds: 1, likingUsersIds: 1, bookmarkingUsersIds: 1, _id: 0 });
        const commentsIds = [], likingUsersIds = [], bookmarkingUsersIds = [], imagesUrls = [];

        posts.forEach(post => {
            commentsIds.push(...post.commentsIds);
            likingUsersIds.push(...post.likingUsersIds);
            bookmarkingUsersIds.push(...post.bookmarkingUsersIds);
            imagesUrls.push(...post.imagesUrls);
        });

        const update = {
            $pull: {
                likingUsersIds: { $in: likingUsersIds },
                bookmarkingUsersIds: { $in: bookmarkingUsersIds }
            }
        };
        const promises = [db.collection('posts').deleteMany(filter), Comment.deleteComments(commentsIds),
        Post.updatePosts(filter, update)];

        await Promise.all(promises);
        deleteImages(imagesUrls);
    }

    updateLikes(value) {
        const filter = { _id: this._id }, update = { $inc: { likes: value } };
        return this.updatePost(filter, update);
    }

    addComment(commentId) {
        const filter = { _id: this._id }, update = { $push: { commentsIds: commentId } };
        return this.updatePost(filter, update);
    }

    removeComment(commentId) {
        const filter = { _id: this._id }, update = { $pull: { commentsIds: commentId } };
        return this.updatePost(filter, update);
    }

    removePostFromBookmarks() {
        const filter = { _id: { $in: this.bookmarkingUsersIds } }, update = { $pull: { bookmarksIds: this._id } };
        return User.updateUsers(filter, update);
    }

    removePostFromLikedPosts() {
        const filter = { _id: { $in: this.likingUsersIds } }, update = { $pull: { likedPostsIds: this._id } };
        return User.updateUsers(filter, update);
    }

}