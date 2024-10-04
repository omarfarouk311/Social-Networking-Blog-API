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

                await DatabaseFacade.deleteUserComments({ creatorId: filters._id }, { session });

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

                deleteImages([filters.imageUrl]);
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

                await DatabaseFacade.deletePostComments({ postId: filters._id }, { session });

                await User.removePostFromBookmarks(filters.bookmarkingUsersIds, filters._id, { session });

                await User.removePostFromLikedPosts(filters.likingUsersIds, filters._id, { session });

                deleteImages(filters.imagesUrls);
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

                await User.removeCommentFromLikedComments(filters.likingUsersIds, filters._id, { session });

                await DatabaseFacade.deletePostComments({ parentsIds: filters._id }, { session });

                await Post.updatePost({ _id: filters.postId }, { $inc: { commentsCount: -filters.repliesCount - 1 } }, { session });

                if (filters.parentsIds.length) {
                    await Comment.updateComments(
                        { _id: { $in: filters.parentsIds } },
                        { $inc: { repliesCount: -filters.repliesCount - 1 } },
                        { session });
                }

            }, {
                readConcern: { level: 'local' },
                writeConcern: { w: 'majority', journal: true },
                readPreference: 'primary'
            });
        });
    }

    static async deleteUserComments(filter, options = {}) {
        const comments = await Comment.getComments(filter, { likingUsersIds: 1, postId: 1, parentsIds: 1, repliesCount: 1 }, options).toArray();
        if (!comments.length) return;

        comments.sort((a, b) => a.parentsIds.length - b.parentsIds.length);

        for (const comment of comments) {
            const { deletedCount } = await Comment.deleteComment({ _id: comment._id }, options);
            if (!deletedCount) continue;

            await Comment.deleteComment({ _id: comment._id }, options);

            await User.removeCommentFromLikedComments(comment.likingUsersIds, comment._id, options);

            await DatabaseFacade.deletePostComments({ parentsIds: comment._id }, options);

            await Post.updatePost({ _id: comment.postId }, { $inc: { commentsCount: -comment.repliesCount - 1 } }, options);

            if (comment.parentsIds.length) {
                await Comment.updateComments(
                    { _id: { $in: comment.parentsIds } },
                    { $inc: { repliesCount: -comment.repliesCount - 1 } },
                    options
                );
            }
        }
    }

    static async deletePostComments(filter, options = {}) {
        const comments = await Comment.getComments(filter, { likingUsersIds: 1 }, options).toArray();
        const likingUsersIds = [], commentsIds = [];
        comments.forEach(comment => {
            likingUsersIds.push(...comment.likingUsersIds);
            commentsIds.push(comment._id);
        });

        await Comment.deleteComments(filter, options);

        await User.removeCommentsFromLikedComments(likingUsersIds, commentsIds, options);
    }

    static async deletePosts(filter, options = {}) {
        const posts = await Post.getPosts(filter, { imagesUrls: 1, likingUsersIds: 1, bookmarkingUsersIds: 1 }, options).toArray();
        const likingUsersIds = [], bookmarkingUsersIds = [], imagesUrls = [], postsIds = [];

        posts.forEach(post => {
            likingUsersIds.push(...post.likingUsersIds);
            bookmarkingUsersIds.push(...post.bookmarkingUsersIds);
            imagesUrls.push(...post.imagesUrls);
            postsIds.push(post._id);
        });

        await Post.deletePosts(filter, options);

        await DatabaseFacade.deletePostComments({ postId: { $in: postsIds } }, options);

        await User.removePostsFromBookmarks(bookmarkingUsersIds, postsIds, options);

        await User.removePostsFromLikedPosts(likingUsersIds, postsIds, options);

        deleteImages(imagesUrls);
    }

}