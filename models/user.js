const { getDb } = require('../util/database');
const Post = require('./post');
const Comment = require('./comment');
const { promises: fsPromises } = require('fs');

module.exports = class User {
    constructor({ _id, email, password, name, imageUrl, followingIds, followersIds, bookmarksIds, postsIds,
        commentsIds, likedPostsIds, bio, location }) {
        this._id = _id;
        this.email = email;
        this.password = password;
        this.name = name;
        this.bio = bio;
        this.location = location;
        this.imageUrl = imageUrl;
        this.followingIds = followingIds;
        this.followersIds = followersIds;
        this.bookmarksIds = bookmarksIds;
        this.postsIds = postsIds;
        this.commentsIds = commentsIds;
        this.likedPostsIds = likedPostsIds;
    }

    async createUser() {
        const db = getDb();
        const { insertedId } = await db.collection('users').insertOne(this);
        this._id = insertedId;
    }

    updateUser(updates) {
        const db = getDb();
        return db.collection('users').updateOne(
            { _id: this._id },
            { $set: updates }
        );
    }

    deleteUser() {
        const db = getDb();
        const { imageUrl } = this;
        const promises = [];
        promises.push(Post.deletePosts(this.postsIds));
        promises.push(Comment.deleteComments(this.commentsIds));
        promises.push(db.collection('posts').updateMany({ _id: { $in: this.likedPostsIds } }, { $inc: { likes: -1 } }));
        promises.push(db.collection('users').updateMany({ _id: { $in: this.followersIds } }, { $pull: { followingIds: this._id } }));
        promises.push(db.collection('users').updateMany({ _id: { $in: this.followingIds } }, { $pull: { followersIds: this._id } }));
        fsPromises.unlink(imageUrl).catch(err => console.error(err));
        return Promise.all(promises);
    }

    static async getUser(userId) {
        const user = await db.collection('users').aggregate([
            {
                $match: {
                    _id: userId
                }
            },
            {
                $addFields: {
                    followersCount: { $size: '$followersIds' },
                    followingCount: { $size: '$followingIds' }
                }
            },
            {
                $project: {
                    password: 0,
                    bookmarksIds: 0,
                    commentsIds: 0,
                    email: 0,
                    postsIds: { $slice: [0, 10] },
                    followersIds: { $slice: [0, 20] },
                    followingIds: { $slice: [0, 20] },
                    likedPostsIds: { $slice: [0, 10] }
                }
            }
        ]);

        const filter = { _id: { $in: user.postsIds } };
        user.posts = await this.getUserPosts(filter)
        user.lastPostId = user.postsIds[user.postsIds.length - 1];
        delete user.postsIds;

        return user;
    }

    getUserPosts(filter) {
        const db = getDb();
        return db.collection('posts').find(filter)
            .limit(10)
            .project({ content: 0, imagesUrls: 0, commentsIds: 0, creatorId: 0 })
            .toArray();
    }

    updateFollowers(followedId, type) {
        const db = getDb();
        const promise1 = db.collection('users').updateOne(
            { _id: this._id },
            type === 1 ? { $push: { followingIds: followedId } } : { $pull: { followingIds: followedId } }
        );
        const promise2 = db.collection('users').updateOne(
            { _id: followedId },
            type === 1 ? { $push: { followersIds: this._id } } : { $pull: { followersIds: this._id } }
        );

        return Promise.all([promise1, promise2]);
    }

    addBookmark(postId) {
        const db = getDb();
        return db.collection('users').updateOne(
            { _id: this._id },
            { $push: { bookmarksIds: postId } }
        );
    }

    createPost(postId) {
        const db = getDb();
        return db.collection('users').updateOne(
            { _id: this._id },
            { $push: { postsIds: postId } }
        );
    }

    addComment(commentId) {
        const db = getDb();
        return db.collection('users').updateOne(
            { _id: this._id },
            { $push: { commentsIds: commentId } }
        );
    }

    likePost(postId) {
        const db = getDb();
        return db.collection('users').updateOne(
            { _id: this._id },
            { $push: { likedPostsIds: postId } }
        );
    }

}