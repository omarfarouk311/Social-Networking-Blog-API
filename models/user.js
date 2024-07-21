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

    updateUser(filter, update) {
        const db = getDb();
        const updatedUser = db.collection('users').findOneAndUpdate(filter, update, { returnDocument: 'after' });
        if (update.imageUrl) {
            updateImages([this.imageUrl], [updatedUser.imageUrl]);
        }
        return updatedUser;
    }

    static updateUsers(filter, update) {
        const db = getDb();
        return db.collection('users').updateMany(filter, update);
    }

    async deleteUser() {
        const db = getDb();
        const { imageUrl } = this;
        const promises = [];

        promises.push(Post.deletePosts(this.postsIds));
        promises.push(Comment.deleteComments(this.commentsIds));
        promises.push(Post.updatePosts({ _id: { $in: this.likedPostsIds } }, { $inc: { likes: -1 } }));
        promises.push(User.updateUsers({ _id: { $in: this.followersIds } }, { $pull: { followingIds: this._id } }));
        promises.push(User.updateUsers({ _id: { $in: this.followingIds } }, { $pull: { followersIds: this._id } }));
        promises.push(db.collection('users').deleteOne({ _id: this._id }));
        await Promise.all(promises);

        fsPromises.unlink(imageUrl).catch(err => console.error(err));
    }

    static async getUserInfo(userId) {
        const db = getDb();
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

        user.posts = await Post.getPosts({ _id: { $in: user.postsIds } })
            .limit(10)
            .project({ content: 0, imagesUrls: 0, commentsIds: 0, creatorId: 0 })
            .toArray();
        user.lastPostId = user.postsIds[user.postsIds.length - 1];
        delete user.postsIds;

        return user;
    }

    static getUser(userId) {
        return db.collection('users').findOne({ _id: userId });
    }

    updateFollowers(followedId, type) {
        const promise1 = this.updateUser(
            { _id: this._id },
            type === 1 ? { $push: { followingIds: followedId } } : { $pull: { followingIds: followedId } }
        );
        const promise2 = this.updateUser(
            { _id: followedId },
            type === 1 ? { $push: { followersIds: this._id } } : { $pull: { followersIds: this._id } }
        );

        return Promise.all([promise1, promise2]);
    }

    addBookmark(post) {
        const filter = { _id: this._id }, update = { $push: { bookmarksIds: post._id } };
        return Promise.all([this.updateUser(filter, update), post.addBookmark(this._id)]);
    }

    removeBookmark(post) {
        const filter = { _id: this._id }, update = { $pull: { bookmarksIds: post._id } };
        return Promise.all([this.updateUser(filter, update), post.removeBookmark(this._id)]);
    }

    async createPost(post) {
        await post.createPost()
        const filter = { _id: this._id }, update = { $push: { postsIds: post._id } };
        return this.updateUser(filter, update);
    }

    deletePost(post) {
        const filter = { _id: this._id }, update = { $pull: { postsIds: post._id } };
        return Promise.all([this.updateUser(filter, update), post.deletePost()]);
    }

    likePost(post) {
        const filter = { _id: this._id }, update = { $push: { likedPostsIds: post._id } };
        return Promise.all([this.updateUser(filter, update), post.updateLikes(1)]);
    }

    unlikePost(post) {
        const filter = { _id: this._id }, update = { $pull: { likedPostsIds: post._id } };
        return Promise.all([this.updateUser(filter, update), post.updateLikes(-1)]);
    }

    async addComment(comment, post) {
        await comment.createComment();
        const filter = { _id: this._id }, update = { $push: { commentsIds: comment._id } };
        return Promise.all([this.updateUser(filter, update), post.addComment(comment._id)]);
    }

    async deleteComment(comment, post) {
        const filter = { _id: this._id }, update = { $pull: { commentsIds: comment._id } };
        return Promise.all([this.updateUser(filter, update), post.deleteComment(comment._id),
        comment.deleteComment({ _id: comment._id })]);
    }

    likeComment(comment) {
        return comment.updateLikes(1);
    }

    unlikeComment(comment) {
        return comment.updateLikes(-1);
    }

}