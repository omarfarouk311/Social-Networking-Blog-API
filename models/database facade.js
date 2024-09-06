const Post = require('./post.js');
const Comment = require('./comment.js');
const User = require('./user.js');
const { deleteImages } = require('../util/images.js');
const { getDb, getClient } = require('../util/database.js');

module.exports = class DatabaseFacade {

    static async deleteUser(filters) {
        const client = getClient();

        return client.withSession(async session => {
            return session.withTransaction(async session => {
                await User.deleteUser({ _id: filters._id }, { session });

                await DatabaseFacade.deletePosts({ creatorId: filters._id }, { session });

                await DatabaseFacade.deleteComments({ creatorId: filters._id }, { session });

                await Post.updatePosts({ _id: { $in: filters.likedPostsIds } }, {
                    $inc: { likes: -1 },
                    $pull: { likingUsersIds: filters._id }
                }, { session });

                await Post.updatePosts({ _id: { $in: filters.bookmarksIds } }, {
                    $inc: { bookmarksCount: -1 },
                    $pull: { bookmarkingUsersIds: filters._id }
                }, { session });

                await Comment.updateComments({ _id: { $in: filters.likedCommentsIds } }, {
                    $inc: { likes: -1 },
                    $pull: { likingUsersIds: filters._id }
                }, { session });

                await User.updateUsers({ _id: { $in: filters.followersIds } }, {
                    $pull: { followingIds: filters._id },
                    $inc: { followingCount: -1 }
                }, { session });

                await User.updateUsers({ _id: { $in: filters.followingIds } }, {
                    $pull: { followersIds: filters._id },
                    $inc: { followersCount: -1 }
                }, { session });

                const db = getDb();
                await db.collection('tokens').deleteOne({ userId: filters._id }, { session });
                await db.collection('refresh tokens').deleteOne({ userId: filters._id }, { session });

                const { imageUrl } = filters;
                deleteImages([imageUrl]);
            }, {
                readConcern: { level: 'local' },
                writeConcern: { w: 'majority', journal: true },
                readPreference: 'primary'
            });
        });
    }

    static deletePost(filters) {
        const client = getClient();

        return client.withSession(async session => {
            return session.withTransaction(async session => {
                await Post.deletePost({ _id: filters._id }, { session });

                await DatabaseFacade.deleteComments({ postId: filters._id }, { session });

                await User.removePostFromBookmarks(filters.bookmarkingUsersIds, filters._id, { session });

                await User.removePostFromLikedPosts(filters.likingUsersIds, filters._id, { session });

                const { imagesUrls } = filters
                deleteImages(imagesUrls);
            }, {
                readConcern: { level: 'local' },
                writeConcern: { w: 'majority', journal: true },
                readPreference: 'primary'
            });
        });
    }

    static deleteComment(filters) {
        const client = getClient();

        return client.withSession(async session => {
            return session.withTransaction(async session => {
                await Comment.deleteComment({ _id: filters._id }, { session });

                await DatabaseFacade.deleteComments({ parentsIds: filters._id }, { session });

                await User.removeCommentFromLikedComments(filters.likingUsersIds, filters.commentId, { session });

                await Post.updatePost({ _id: filters.postId }, { $inc: { commentsCount: -1 } }, { session });

                if (filters.parentsIds.length) {
                    await Comment.updateComments({ _id: { $in: filters.parentsIds } }, { $inc: { repliesCount: -1 } }, { session });
                }
            }, {
                readConcern: { level: 'local' },
                writeConcern: { w: 'majority', journal: true },
                readPreference: 'primary'
            });
        });
    }

    static async deleteComments(filter, options = {}) {
        const comments = await Comment.getComments(filter, { likingUsersIds: 1, postId: 1, parentsIds: 1 }, options);
        const likingUsersIds = [], commentsIds = [], parentsIds = [];
        const commentsOnPost = new Map();

        comments.forEach(comment => {
            likingUsersIds.push(...comment.likingUsersIds);
            commentsIds.push(comment._id);
            const cnt = commentsOnPost.get(comment.postId);
            commentsOnPost.set(comment.postId, cnt ? cnt + 1 : 1);
            if (comment.parentsIds.length) parentsIds.push(...comment.parentsIds);
        });

        const operations = [];
        commentsOnPost.forEach(([key, value]) => {
            operations.push({ updateOne: { filter: { _id: key }, update: { $inc: { commentsCount: value } } } });
        });

        await Comment.deleteComments(filter, options);

        await User.removeCommentsFromLikedComments(likingUsersIds, commentsIds, options);

        if (operations.length) {
            const db = getDb();
            await db.collection('posts').bulkWrite(operations, options);
        }

        await Comment.updateComments({ _id: { $in: parentsIds } }, { $inc: { repliesCount: -1 } }, options)
    }

    static async deletePosts(filter, options = {}) {
        const posts = await Post.getPosts(filter, { imagesUrls: 1, likingUsersIds: 1, bookmarkingUsersIds: 1 }, options);
        const likingUsersIds = [], bookmarkingUsersIds = [], imagesUrls = [], postsIds = [];

        posts.forEach(post => {
            likingUsersIds.push(...post.likingUsersIds);
            bookmarkingUsersIds.push(...post.bookmarkingUsersIds);
            imagesUrls.push(...post.imagesUrls);
            postsIds.push(post._id);
        });

        await Post.deletePosts(filter, options);

        await DatabaseFacade.deleteComments({ postId: { $in: postsIds } }, options);

        await User.removePostsFromBookmarks(bookmarkingUsersIds, postsIds, options);

        await User.removePostsFromLikedPosts(likingUsersIds, postsIds, options);

        deleteImages(imagesUrls);
    }

}