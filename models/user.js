const { getDb } = require('../util/database');
const Post = require('./post');
const Comment = require('./comment');
const { promises: fsPromises } = require('fs');

module.exports = class User {
    constructor({ _id, email, password, name, imageUrl, followingIds, followersIds, bookmarksIds, likedPostsIds, bio, location,
        creationDate }) {
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
        this.likedPostsIds = likedPostsIds;
        this.likedCommentsIds = likedCommentsIds;
        this.creationDate = creationDate;
    }

    async createUser() {
        const db = getDb();
        const { insertedId } = await db.collection('users').insertOne(this);
        this._id = insertedId;
    }

    updateUser(filter, update) {
        const db = getDb();
        const updatedUser = db.collection('users').findOneAndUpdate(filter, update, { returnDocument: 'after' })
            .project({ password: 0 });
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

        promises.push(Post.deletePosts({ creatorId: this._id }));
        promises.push(Post.updatePosts({ _id: { $in: this.likedPostsIds } }, { $inc: { likes: -1 } }));
        promises.push(Comment.deleteComments({ creatorId: this._id }));
        promises.push(Comment.updateComments({ _id: { $in: this.likedCommentsIds } }, { $inc: { likes: -1 } }));
        promises.push(User.updateUsers({ _id: { $in: this.followersIds } }, { $pull: { followingIds: this._id } }));
        promises.push(User.updateUsers({ _id: { $in: this.followingIds } }, { $pull: { followersIds: this._id } }));
        promises.push(db.collection('users').deleteOne({ _id: this._id }));
        await Promise.all(promises);

        fsPromises.unlink(imageUrl).catch(err => console.error(err));
    }

    static getUser(filter) {
        return db.collection('users').findOne(filter);
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
                    email: 0,
                    followersIds: { $slice: [0, 20] },
                    followingIds: { $slice: [0, 20] },
                    likedPostsIds: { $slice: [0, 10] }
                }
            }
        ]);

        user.posts = await Post.getPosts({ creatorId: this._id })
            .sort({ _id: -1 })
            .limit(10)
            .project({ content: 0, imagesUrls: 0, creatorId: 0 })
            .toArray();
        user.lastPostId = user.posts[user.posts.length - 1]['_id'].toString();

        return user;
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

    likePost(post) {
        const filter = { _id: this._id }, update = { $push: { likedPostsIds: post._id } };
        return Promise.all([this.updateUser(filter, update), post.addLike(this._id)]);
    }

    unlikePost(post) {
        const filter = { _id: this._id }, update = { $pull: { likedPostsIds: post._id } };
        return Promise.all([this.updateUser(filter, update), post.removeLike(this._id)]);
    }

    likeComment(comment) {
        const filter = { _id: this._id }, update = { $push: { likedCommentsIds: comment._id } };
        return Promise.all([this.updateUser(filter, update), comment.addLike(this._id)]);
    }

    unlikeComment(comment) {
        const filter = { _id: this._id }, update = { $pull: { likedCommentsIds: comment._id } };
        return Promise.all([this.updateUser(filter, update), comment.removeLike(this._id)]);
    }

    static joinCreators(posts) {
        return Promise.all(posts.map(async post => {
            const { creatorId } = post;
            post.creator = await User.getUser({ _id: creatorId }).project({ name: 1, imageUrl: 1, _id: 0 });
        }));
    }

    static async joinCommentsCreators(comments) {
        return Promise.all(comments.map(async comment => {
            const { creatorId } = comment;
            comment.creator = await User.getUser({ _id: creatorId }).project({ name: 1, imageUrl: 1, _id: 0 });
        }));
    }

}