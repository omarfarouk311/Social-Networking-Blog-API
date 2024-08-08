const { getDb } = require('../util/database');
const Post = require('./post');
const Comment = require('./comment');
const { deleteImages, updateImages } = require('../util/images.js');

module.exports = class User {
    constructor({ _id, email, password, name, imageUrl, followingIds, followersIds, bookmarksIds, likedPostsIds, bio, location,
        creationDate, followingCount, followersCount }) {
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
        this.followingCount = followingCount;
        this.followersCount = followersCount;
    }

    async createUser() {
        const db = getDb();
        const { insertedId } = await db.collection('users').insertOne(this);
        this._id = insertedId;
    }

    async findAndUpdateUser(filter, update, projection) {
        const db = getDb();
        const updatedUser = await db.collection('users').findOneAndUpdate(filter, update, { projection, returnDocument: 'after' });
        if (update.imageUrl) {
            updateImages([this.imageUrl], [updatedUser.imageUrl]);
        }
        return updatedUser;
    }

    updateUser(filter, update) {
        const db = getDb();
        return db.collection('users').updateOne(filter, update);
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
        promises.push(Post.updatePosts({ _id: { $in: this.likedPostsIds } }, {
            $inc: { likes: -1 },
            $pull: { likingUsersIds: this._id }
        }));
        promises.push(Post.updatePosts({ _id: { $in: this.bookmarksIds } }, { $pull: { bookmarkingUsersIds: this._id } }));
        promises.push(Comment.deleteComments({ creatorId: this._id }));
        promises.push(Comment.updateComments({ _id: { $in: this.likedCommentsIds } }, {
            $inc: { likes: -1 },
            $pull: { likingUsersIds: this._id }
        }));
        promises.push(User.updateUsers({ _id: { $in: this.followersIds } }, { $pull: { followingIds: this._id } }));
        promises.push(User.updateUsers({ _id: { $in: this.followingIds } }, { $pull: { followersIds: this._id } }));
        promises.push(db.collection('users').deleteOne({ _id: this._id }));
        await Promise.all(promises);

        deleteImages([imageUrl]);
    }

    static async getUserInfo(filter) {
        const db = getDb();
        const result = await db.collection('users').aggregate([
            {
                $match: {
                    _id: filter
                }
            },
            {
                $lookup: {
                    from: 'posts',
                    localField: '_id',
                    foreignField: 'creatorId',
                    as: 'posts',
                    pipeline: [
                        { $sort: { _id: -1 } },
                        { $limit: 10 },
                        { $project: { content: 0, imagesUrls: 0, creatorId: 0 } },
                    ]
                }
            },
            {
                $project: {
                    email: 0,
                    password: 0,
                    bookmarksIds: 0,
                    likedCommentsIds: 0,
                    followersIds: 0,
                    followingIds: 0,
                    likedPostsIds: 0,
                    posts: {
                        $map: {
                            input: '$posts',
                            as: 'post',
                            $in: {
                                $mergeObjects: [
                                    '$$post',
                                    {
                                        creator: {
                                            _id: '$_id',
                                            name: '$name'
                                        }
                                    }
                                ]
                            }
                        },
                        lastPostId: { $arrayElemAt: ['$posts._id', -1] }
                    }
                }
            }
        ]).toArray();

        return result ? result[0] : null;
    }

    static getUser(filter, projection) {
        const db = getDb();
        return db.collection.findOne(filter, projection);
    }

    updateFollowers(followedId, type) {
        let promise1, promise2;

        if (type === 1) {
            promise1 = this.findAndUpdateUser(
                { _id: this._id },
                { $push: { followingIds: followedId }, $inc: { followingCount: 1 } },
                { followingCount: 1, _id: 0 }
            );

            promise2 = this.findAndUpdateUser(
                { _id: followedId },
                { $push: { followersIds: this._id }, $inc: { followersCount: 1 } },
                { followersCount: 1, _id: 0 }
            );
        }
        else {
            promise1 = this.findAndUpdateUser(
                { _id: this._id },
                { $pull: { followingIds: followedId }, $inc: { followingCount: -1 } },
                { followingCount: 1, _id: 0 }
            );

            promise2 = this.findAndUpdateUser(
                { _id: followedId },
                { $pull: { followersIds: this._id }, $inc: { followersCount: -1 } },
                { followersCount: 1, _id: 0 }
            );
        }

        return Promise.all([promise1, promise2]);
    }

    async addBookmark(post) {
        const filter = { _id: this._id }, update = { $addToSet: { bookmarksIds: post._id } };
        const { modifiedCount } = await this.updateUser(filter, update);
        if (!modifiedCount) return null;
        return post.addBookmark(this._id);
    }

    async removeBookmark(post) {
        const filter = { _id: this._id }, update = { $pull: { bookmarksIds: post._id } };
        const { modifiedCount } = await this.updateUser(filter, update);
        if (!modifiedCount) return null;
        return post.removeBookmark(this._id);
    }

    async likePost(post) {
        const filter = { _id: this._id }, update = { $addToSet: { likedPostsIds: post._id } };
        const { modifiedCount } = await this.updateUser(filter, update);
        if (!modifiedCount) return null;
        return post.addLike(this._id);
    }

    async unlikePost(post) {
        const filter = { _id: this._id }, update = { $pull: { likedPostsIds: post._id } };
        const { modifiedCount } = await this.updateUser(filter, update);
        if (!modifiedCount) return null;
        return post.removeLike(this._id);
    }

    async likeComment(comment) {
        const filter = { _id: this._id }, update = { $addToSet: { likedCommentsIds: comment._id } };
        const { modifiedCount } = await this.updateUser(filter, update);
        if (!modifiedCount) return null;
        return comment.addLike(this._id);
    }

    async unlikeComment(comment) {
        const filter = { _id: this._id }, update = { $pull: { likedCommentsIds: comment._id } };
        const { modifiedCount } = await this.updateUser(filter, update);
        if (!modifiedCount) return null;
        return comment.removeLike(this._id);
    }

}